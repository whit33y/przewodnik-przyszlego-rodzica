/**
 * Sickness in pregnancy (digest 02 §2.3) — basic tracker (plan 02 slice 5, timeboxed).
 * - Employees: the first 33 days of incapacity in a calendar year (14 from the year after turning 50) are employer
 *   sick pay (KP 92); later days are sickness benefit.
 * - Non-employees: sickness benefit from day 1 (after the waiting period).
 * - Waiting period (UZ art. 4): 30 days of mandatory / 90 days of voluntary insurance, earlier cover bridged over
 *   gaps ≤ 30 days; exemptions: ≥ 10 years of prior mandatory insurance, graduates within 90 days.
 * - Benefit period (UZ art. 8–9): 270 days for incapacity in pregnancy (code B), 182 otherwise; sick-pay days count;
 *   periods separated by ≤ 60 days add up, except that a code-B incapacity restarts the count.
 */
import { addDays, daysInclusive, diffDays, endOfYear, minDate, yearOf } from "../dates";
import type { Ctx } from "../context";
import type { ISODate, PlanBlock } from "../types";
import { continuousCoverStart } from "./insurance";

export function sickPayDaysFor(ctx: Ctx, year: number): number {
  const p = ctx.params.sickness;
  const by = ctx.facts.claimant.birthYear;
  // KP 92 §1 pkt 1: 14 days from the calendar year after the year the employee turned 50.
  return by !== undefined && year > by + 50 ? p.sickPayDaysAge50 : p.sickPayDays;
}

function sickPayUsedIn(ctx: Ctx, year: number): number {
  return ctx.facts.claimant.paidBenefits
    .filter((b) => b.type === "sickPay" && yearOf(b.from) === year)
    .reduce((a, b) => a + daysInclusive(b.from, minDate(b.to, endOfYear(year))), 0);
}

/** Prospective expansion of sick notes into sickPay / sickness blocks (stops the day before the birth). */
export function sicknessBlocksFromNotes(ctx: Ctx): PlanBlock[] {
  const person = ctx.facts.claimant;
  const stopBefore = ctx.ev.kind === "birth" && person.role === "mother" ? ctx.ev.refDate : undefined;
  const notes = [...person.sickNotes].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.titleId.localeCompare(b.titleId)));
  const blocks: PlanBlock[] = [];
  const usedByYear = new Map<number, number>();
  let n = 0;
  for (const note of notes) {
    const title = person.titles.find((t) => t.id === note.titleId);
    let from = note.from;
    const to = stopBefore ? minDate(note.to, addDays(stopBefore, -1)) : note.to;
    if (to < from) continue;
    while (from <= to) {
      const year = yearOf(from);
      const segEnd = minDate(to, endOfYear(year));
      let days = daysInclusive(from, segEnd);
      if (title?.kind === "employment") {
        const used = usedByYear.get(year) ?? sickPayUsedIn(ctx, year);
        const avail = Math.max(0, sickPayDaysFor(ctx, year) - used);
        const payDays = Math.min(avail, days);
        if (payDays > 0) {
          blocks.push({ id: `sickPay-claimant-${++n}`, parent: "claimant", type: "sickPay", titleId: note.titleId, from, days: payDays });
          usedByYear.set(year, used + payDays);
          from = addDays(from, payDays);
          days -= payDays;
        } else usedByYear.set(year, used);
      }
      if (days > 0) blocks.push({ id: `sickness-claimant-${++n}`, parent: "claimant", type: "sickness", titleId: note.titleId, from, days });
      from = addDays(segEnd, 1);
    }
  }
  return blocks;
}

/** First day on which sickness benefit / sick pay is payable after the waiting period, or undefined if not insured. */
export function waitingPeriodEnd(ctx: Ctx, onDate: ISODate, titleId?: string): { firstPayable?: ISODate; waitingDays: number; coverStart?: ISODate; exempt: boolean } {
  const p = ctx.params.sickness;
  const { start, mode } = continuousCoverStart(ctx.facts.claimant, onDate, p.bridgingGapDays);
  if (!start) return { waitingDays: 0, exempt: false };
  const title = ctx.facts.claimant.titles.find((t) => t.id === titleId);
  const exempt = (mode === "mandatory" && (title?.priorMandatoryYears ?? 0) >= 10) || title?.graduateWithin90Days === true;
  const waitingDays = exempt ? 0 : mode === "mandatory" ? p.waitingDaysMandatory : p.waitingDaysVoluntary;
  return { firstPayable: addDays(start, waitingDays), waitingDays, coverStart: start, exempt };
}

/** Benefit-period day count before `from` (incl. paid sickness / sick pay), with the code-B restart. */
export function benefitPeriodUsedBefore(ctx: Ctx, from: ISODate, codeB: boolean, earlier: { from: ISODate; to: ISODate; codeB: boolean }[]): number {
  const paid = ctx.facts.claimant.paidBenefits
    .filter((b) => b.type === "sickPay" || b.type === "sickness")
    .map((b) => ({ from: b.from, to: b.to, codeB }));
  const all = [...paid, ...earlier].filter((x) => x.to < from).sort((a, b) => (a.from < b.from ? -1 : 1));
  let used = 0;
  let lastEnd: ISODate | undefined;
  let lastB = false;
  for (const x of all) {
    const gap = lastEnd ? diffDays(lastEnd, x.from) - 1 : Infinity;
    if (gap > 60 || (x.codeB && !lastB)) used = 0;
    used += daysInclusive(x.from, x.to);
    lastEnd = x.to;
    lastB = x.codeB;
  }
  const gapToNow = lastEnd ? diffDays(lastEnd, from) - 1 : Infinity;
  if (gapToNow > 60 || (codeB && !lastB)) return 0;
  return used;
}
