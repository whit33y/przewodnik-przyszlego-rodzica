/**
 * Insurance stage: the sickness-insurance timeline per title (digest 02 §2.1) and the checks on decisive dates.
 *
 * - Employment: mandatory sickness insurance from start to end of the contract.
 * - Mandate / self-employed / collaborator: voluntary, only inside declared `sickness.periods`; a ZUA cannot be
 *   backdated, so cover starts on the receipt date `registeredOn` unless it was filed within 7 days of the
 *   period start (USUS art. 14 ust. 1–1a).
 * - CEIDG suspension, deregistration and `ulgaNaStart` give no cover; a student under 26 on a mandate has none.
 * - A ZUS non-coverage decision (sham contract) voids the title — the engine never judges genuineness itself.
 * - Childcare leave (urlop wychowawczy) is not sickness cover but still gives maternity benefit (UZ art. 29 ust. 1).
 */
import { C } from "../cite";
import { addTrace, type Ctx } from "../context";
import { addDays, diffDays, maxDate, toDay, within } from "../dates";
import type { InsuranceCheck, InsuranceTitle, ISODate, Person, ReasonCode, TitleEndReason } from "../types";

export interface Cover {
  insured: boolean;
  mode?: "mandatory" | "voluntary";
  /** Childcare leave: counts for maternity benefit only. */
  childcare?: boolean;
  reasonCode?: ReasonCode;
}

/** Effective end of a title: actual end, or (prospective) the user-declared planned end. */
export function titleEnd(t: InsuranceTitle, useplanned: boolean): { to?: ISODate; reason?: TitleEndReason } {
  if (t.to) return { to: t.to, reason: t.endReason };
  if (useplanned && t.plannedEnd) return { to: t.plannedEnd.date, reason: t.plannedEnd.reason };
  return {};
}

/** Start of a voluntary cover period after the no-backdating rule. */
export function voluntaryStart(t: InsuranceTitle, periodFrom: ISODate): ISODate {
  if (t.registeredOn && diffDays(periodFrom, t.registeredOn) > 7) return maxDate(periodFrom, t.registeredOn);
  return periodFrom;
}

/** Sickness cover of one title on one date. */
export function coverOn(person: Person, t: InsuranceTitle, date: ISODate, usePlanned = true): Cover {
  const end = titleEnd(t, usePlanned);
  // Deregistration for concurrence with maternity benefit ends cover the day before the benefit starts: it is a
  // consequence of the claim, so the day the right arises still counts (B5-05, B1-02).
  if (end.reason === "deregisteredBenefitConcurrence" && end.to && date === addDays(end.to, 1)) return coverOn(person, t, end.to, usePlanned);
  if (!within(date, t.from, end.to)) return { insured: false, reasonCode: "NOT_INSURED_AT_EVENT" };
  const decision = person.insuranceDecisions.find((d) => d.titleId === t.id && d.kind === "nonCoverage" && d.from <= date);
  if (decision) return { insured: false, reasonCode: "TITLE_INVALIDATED" };
  if (t.kind === "childcareLeave") return { insured: false, childcare: true };
  if (t.kind === "unemployed" || t.kind === "none" || t.kind === "maternityBenefit") return { insured: false, reasonCode: "NO_SICKNESS_INSURANCE_ON_TITLE" };
  if (t.scheme === "ulgaNaStart") return { insured: false, reasonCode: "NO_INSURANCE_SCHEME" };
  if (t.kind === "mandate" && person.flags?.studentUnder26) return { insured: false, reasonCode: "NO_INSURANCE_SCHEME" };
  if ((t.suspensions ?? []).some((s) => within(date, s.from, s.to))) return { insured: false, reasonCode: "NOT_INSURED_AT_EVENT" };
  if (t.sickness.mode === "none") return { insured: false, reasonCode: "NO_SICKNESS_INSURANCE_ON_TITLE" };

  if (t.kind === "employment" || t.sickness.mode === "mandatory") {
    // Employment: mandatory for the whole contract; explicit periods (if any) only narrow it.
    const periods = t.sickness.periods;
    if (periods.length === 0 || periods.some((p) => within(date, p.from, p.to))) return { insured: true, mode: "mandatory" };
    return { insured: false, reasonCode: "NOT_INSURED_AT_EVENT" };
  }
  const inPeriod = t.sickness.periods.some((p) => within(date, voluntaryStart(t, p.from), p.to));
  if (inPeriod) return { insured: true, mode: "voluntary" };
  const anyPeriod = t.sickness.periods.length > 0;
  return { insured: false, reasonCode: anyPeriod ? "NOT_INSURED_AT_EVENT" : "NO_SICKNESS_INSURANCE_ON_TITLE" };
}

const REASON_PRIORITY: ReasonCode[] = ["TITLE_INVALIDATED", "NO_INSURANCE_SCHEME", "NO_SICKNESS_INSURANCE_ON_TITLE", "NOT_INSURED_AT_EVENT"];

/**
 * Public check (plan 02 §3): is the person covered by sickness insurance on `date`?
 * Mandatory cover wins over voluntary; with no cover the most specific reason among active titles is returned.
 */
export function insuredOnTitles(person: Person, date: ISODate, titleId?: string, usePlanned = true): InsuranceCheck & { childcare?: boolean } {
  const titles = person.titles.filter((t) => titleId === undefined || t.id === titleId);
  const covers = titles.map((t) => ({ t, c: coverOn(person, t, date, usePlanned) }));
  const best = covers.find((x) => x.c.insured && x.c.mode === "mandatory") ?? covers.find((x) => x.c.insured);
  if (best) return { onDate: date, purpose: "event", insured: true, titleId: best.t.id, mode: best.c.mode };
  const childcare = covers.find((x) => x.c.childcare);
  if (childcare) return { onDate: date, purpose: "event", insured: false, titleId: childcare.t.id, childcare: true };
  const reasons = covers.map((x) => x.c.reasonCode).filter((r): r is ReasonCode => !!r);
  const reasonCode = REASON_PRIORITY.find((r) => reasons.includes(r)) ?? "NOT_INSURED_AT_EVENT";
  const culprit = covers.find((x) => x.c.reasonCode === reasonCode && within(date, x.t.from, titleEnd(x.t, usePlanned).to));
  return { onDate: date, purpose: "event", insured: false, titleId: culprit?.t.id, reasonCode };
}

/** End reasons that keep the right to maternity benefit after the title ended in pregnancy (UZ art. 30 ust. 1). */
const ART30_REASONS: ReadonlySet<TitleEndReason> = new Set(["employerLiquidation", "employerBankruptcy", "employerDeath", "unlawfulTerminationJudgment", "extendedToBirth"]);
/** Reasons giving the pre-birth benefit (UZ art. 30 ust. 3): employer death, bankruptcy, liquidation. */
const ART30_PREBIRTH_REASONS: ReadonlySet<TitleEndReason> = new Set(["employerLiquidation", "employerBankruptcy", "employerDeath"]);

/** Days before the due date from which a pregnancy is assumed to have existed (40 weeks). */
const PREGNANCY_DAYS = 280;
/** A fixed-term contract ending after the 3rd month of pregnancy is extended to the birth (KP 177 §3): ~week 13. */
const THIRD_MONTH_DAYS_BEFORE_DUE = 189;

export interface AfterTitle {
  title: InsuranceTitle;
  reason: TitleEndReason;
  preBirth: boolean;
}

/**
 * Employment that ended during pregnancy with a qualifying reason (R-ELIG-AFTER-TITLE-MAT).
 * A fixed-term contract that would end after the 3rd month of pregnancy counts as extended to the birth.
 */
export function afterTitleQualifying(ctx: Ctx, refDate: ISODate | undefined, usePlanned = true): AfterTitle | undefined {
  if (!refDate || ctx.facts.event.kind !== "birth") return undefined;
  const p = ctx.params;
  for (const t of ctx.facts.claimant.titles) {
    if (t.kind !== "employment") continue;
    const end = titleEnd(t, usePlanned);
    if (!end.to || !end.reason || end.to >= refDate) continue;
    const pregnantThen = ctx.facts.event.pregnancyDuringEmploymentCertified === true || diffDays(end.to, refDate) <= PREGNANCY_DAYS;
    if (!pregnantThen) continue;
    if (ctx.facts.claimant.insuranceDecisions.some((d) => d.titleId === t.id && d.kind === "nonCoverage")) continue;
    let reason = end.reason;
    if (reason === "fixedTermExpired" && diffDays(end.to, refDate) < THIRD_MONTH_DAYS_BEFORE_DUE) reason = "extendedToBirth";
    if (reason === "unlawfulTerminationJudgment" || ART30_REASONS.has(reason)) {
      const preBirth = ART30_PREBIRTH_REASONS.has(reason) || (reason === "unlawfulTerminationJudgment" && p.interpretation.art30PreBirthIncludesUnlawfulTermination);
      return { title: t, reason, preBirth };
    }
  }
  return undefined;
}

/**
 * Stage entry: records the check on the event date and the due date; per-chain checks (part starts,
 * sickness starts) are added by the allocation stage once chains are known.
 */
export function run(ctx: Ctx): Ctx {
  const person = ctx.facts.claimant;
  const prospective = ctx.mode === "prospective";
  const claimantIsMotherLike = person.role !== "father" || ctx.facts.event.kind !== "birth";
  for (const [purpose, date] of [["event", ctx.ev.date], ["dueDate", ctx.ev.date ? undefined : ctx.ev.dueDate]] as const) {
    if (!date || !claimantIsMotherLike) continue;
    const check = insuredOnTitles(person, date, undefined, prospective);
    ctx.insurance.push({ onDate: date, purpose, insured: check.insured, titleId: check.titleId, mode: check.mode, reasonCode: check.reasonCode });
    const titleIdx = person.titles.findIndex((t) => t.id === check.titleId);
    addTrace(ctx, "insurance", "R-ELIG-INSURED-AT-EVENT", {
      factPaths: [purpose === "event" ? "facts.event" : "facts.event.expectedDate", titleIdx >= 0 ? `facts.claimant.titles[${titleIdx}].sickness` : "facts.claimant.titles"],
      inputs: { date, purpose },
      output: { insured: check.insured, childcare: check.childcare ?? false, titleId: check.titleId, mode: check.mode, reasonCode: check.reasonCode },
      citations: check.reasonCode === "TITLE_INVALIDATED" ? [...C.insuredAtEvent, ...C.sham] : check.reasonCode === "NO_INSURANCE_SCHEME" ? [...C.insuredAtEvent, ...C.ulgaNaStart] : C.insuredAtEvent,
    });
  }
  return ctx;
}

/** Continuous sickness-cover start on a title before `date` (for waiting periods), bridging gaps ≤ bridgingGapDays across titles. */
export function continuousCoverStart(person: Person, date: ISODate, bridgingGapDays: number): { start?: ISODate; mode?: "mandatory" | "voluntary" } {
  const check = insuredOnTitles(person, date, undefined, true);
  if (!check.insured) return {};
  // Collect every cover interval across titles and merge those separated by at most the bridging gap.
  const intervals: { from: number; to: number }[] = [];
  for (const t of person.titles) {
    if (person.insuranceDecisions.some((x) => x.titleId === t.id && x.kind === "nonCoverage")) continue;
    const periods = t.kind === "employment" || t.sickness.mode === "mandatory"
      ? (t.sickness.periods.length ? t.sickness.periods : [{ from: t.from, to: t.to }])
      : t.sickness.periods.map((p) => ({ from: voluntaryStart(t, p.from), to: p.to }));
    if (t.sickness.mode === "none" || t.scheme === "ulgaNaStart" || t.kind === "childcareLeave" || t.kind === "unemployed" || t.kind === "none" || t.kind === "maternityBenefit") continue;
    for (const p of periods) {
      const from = maxDate(p.from, t.from);
      const to = p.to && t.to ? (p.to < t.to ? p.to : t.to) : p.to ?? t.to;
      intervals.push({ from: toDay(from), to: to ? toDay(to) : toDay(date) });
    }
  }
  intervals.sort((a, b) => a.from - b.from);
  const d = toDay(date);
  let start: number | undefined;
  let curEnd = -Infinity;
  let curStart = 0;
  for (const iv of intervals) {
    if (iv.from > d) break;
    if (iv.from > curEnd + 1 + bridgingGapDays) curStart = iv.from;
    curEnd = Math.max(curEnd, iv.to);
    if (curEnd >= d) start = curStart;
  }
  return { start: start === undefined ? undefined : addDays("1970-01-01", start), mode: check.mode };
}
