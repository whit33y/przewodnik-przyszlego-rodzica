/**
 * Lengths stage: statutory maxima (digest 02 §1.2) for the classified event.
 * - Maternity 20/31/33/35/37 weeks by children at one birth (KP 180 §1); 8 weeks after a loss (KP 180¹).
 * - Leave on maternity terms: same table, cut at the child's age limit, never below 9 weeks (KP 183 §1–3).
 * - Parental 41/43 (Za życiem 65/67) weeks; 38/62 in the reduced adoption case (KP 183 §4–4⁵); 9 weeks reserved per parent.
 * - Supplementary maternity leave (KP 180²): see `supplementaryWeeks`.
 * - Paternity 14 days until the child is 12 months old (adoption: 12 months from the final order, child < 14).
 */
import { C } from "../cite";
import { addDays, addMonths, dayBeforeBirthday, daysInclusive, diffDays, endOfYear, maxDate, minDate, yearOf } from "../dates";
import { addTrace, isNonEmployeeTitle, paramsAt, type Ctx, type Lengths } from "../context";
import type { Child, ISODate, ParameterSet } from "../types";

/**
 * Supplementary maternity leave weeks (KP 180² §1–3). Day 0 is the birth date.
 * - before week 28 or ≤ 1000 g: hospital days in weeks 1–15, cap 15;
 * - weeks 28–36 and > 1000 g: hospital days in weeks 1–8, cap 8;
 * - week ≥ 37: needs a stay of ≥ 2 consecutive days starting between day 5 and day 28 of life (birth = day 1); days
 *   counted from day 5 of life to the end of week 8, cap 8.
 * Multiples: lowest weight and the longest-hospitalised child (§2). Incomplete weeks round up (§3).
 * Not available before `supplementary.validFrom` (cap 0).
 */
export function supplementaryWeeks(children: Child[], birth: ISODate, params: ParameterSet): { weeks: number; cap: 0 | 8 | 15 } {
  const sp = params.supplementary;
  if (!sp.validFrom) return { weeks: 0, cap: 0 };
  const live = children.filter((c) => c.bornAlive !== false);
  if (live.length === 0) return { weeks: 0, cap: 0 };
  const weights = live.map((c) => c.birthWeightG).filter((w): w is number => w !== undefined);
  const weeksG = live.map((c) => c.gestationalWeek).filter((w): w is number => w !== undefined);
  const weight = weights.length ? Math.min(...weights) : undefined;
  const week = weeksG.length ? Math.min(...weeksG) : undefined;
  const stayDays = (c: Child) => (c.hospitalStays ?? []).reduce((a, s) => a + daysInclusive(s.from, s.to), 0);
  const longest = [...live].sort((a, b) => stayDays(b) - stayDays(a) || a.ref.localeCompare(b.ref))[0];
  const stays = longest?.hospitalStays ?? [];
  if (stays.length === 0) return { weeks: 0, cap: 0 };

  let cap: 0 | 8 | 15;
  let windowFrom: number;
  let windowTo: number;
  if ((week !== undefined && week < sp.extremePretermBeforeWeek) || (weight !== undefined && weight <= sp.extremeMaxWeightG)) {
    cap = sp.capWeeksExtreme as 15;
    windowFrom = 0;
    windowTo = sp.capWeeksExtreme * 7 - 1;
  } else if (week !== undefined && week < sp.pretermBeforeWeek) {
    cap = sp.capWeeksPreterm as 8;
    windowFrom = 0;
    windowTo = sp.capWeeksPreterm * 7 - 1;
  } else if (week !== undefined) {
    // "Day n of life" counts the birth date as day 1 (B4-15: born day 0, stay to day 5 → days 5–6 of life → 1 week).
    cap = sp.capWeeksTerm as 8;
    windowFrom = sp.termFirstDayFrom - 1;
    windowTo = sp.capWeeksTerm * 7 - 1;
    const qualifying = stays.some((s) => {
      const first = Math.max(diffDays(birth, s.from), sp.termFirstDayFrom - 1);
      const last = diffDays(birth, s.to);
      return first <= sp.termFirstDayTo - 1 && last - first + 1 >= sp.termMinConsecutiveDays;
    });
    if (!qualifying) return { weeks: 0, cap };
  } else {
    // [UNCERTAIN] Gestational week unknown, weight above 1000 g: counted under the 28–36-week rule (cap 8, from day 0),
    // the reading most favourable to the parent; the hospital certificate settles the category.
    cap = sp.capWeeksPreterm as 8;
    windowFrom = 0;
    windowTo = sp.capWeeksPreterm * 7 - 1;
  }
  const wFrom = addDays(birth, windowFrom);
  const wTo = addDays(birth, windowTo);
  let days = 0;
  for (const s of stays) days += daysInclusive(maxDate(s.from, wFrom), minDate(s.to, wTo));
  return { weeks: Math.min(Math.ceil(days / 7), cap), cap };
}

function maternityWeeks(p: ParameterSet, n: number): number {
  const t = p.maternity.weeksByChildren;
  return n >= 5 ? t["5plus"] : t[String(Math.max(1, n)) as "1" | "2" | "3" | "4"];
}

export function run(ctx: Ctx): Ctx {
  const { ev, facts } = ctx;
  const p = ctx.params;
  const reserved = p.parental.reservedWeeksPerParent * 7;
  let maternityDays: number;
  let reducedAdoptionCase = false;

  if (ev.kind === "birth") {
    if (ev.loss === "total") {
      maternityDays = p.loss.weeksAfterStillbirthOrEarlyDeath * 7;
      if (ev.date && ev.lossMinEnd) maternityDays = Math.max(maternityDays, daysInclusive(ev.date, ev.lossMinEnd));
    } else {
      maternityDays = maternityWeeks(p, ev.childrenCount) * 7;
    }
    if (ev.date && ev.lateDeathEnd) maternityDays = Math.min(maternityDays, daysInclusive(ev.date, ev.lateDeathEnd));
  } else {
    // Leave on maternity terms, cut at the age limit but at least 9 weeks (KP 183 §3).
    const full = maternityWeeks(p, ev.childrenCount) * 7;
    const untilLimit = ev.date && ev.ageLimitEnd ? daysInclusive(ev.date, ev.ageLimitEnd) : full;
    maternityDays = Math.max(Math.min(full, untilLimit), p.adoption.minLeaveWeeks * 7);
    // [UNCERTAIN, digest 02 §2.6] the "§3 case" (38/62 weeks of parental) = the age limit cut the leave short.
    reducedAdoptionCase = untilLimit < full;
  }

  const pw = ev.zaZyciem ? p.parental.weeksZaZyciem : p.parental.weeks;
  let parentalWeeks = ev.multiple ? pw.multiple : pw.single;
  if (reducedAdoptionCase) parentalWeeks = ev.zaZyciem ? p.adoption.parentalWeeksReducedZaZyciem : p.adoption.parentalWeeksReduced;
  if (ev.loss === "total") parentalWeeks = 0;
  const parentalTotal = parentalWeeks * 7;
  const capWeeks = ev.zaZyciem ? p.parental.combinedCapWeeksZaZyciem : p.parental.combinedCapWeeks;

  // The other parent's 9 weeks: lost to the claimant unless the flag releases them when the other parent is uninsured.
  const op = facts.otherParent;
  const otherUninsured = op ? op.insured === "no" || op.insured === "abroad" || op.insured === "krus" : false;
  const releaseReserved = otherUninsured && !p.interpretation.nineWeeksLostIfOtherParentUninsured;
  const parentalMaxClaimant = Math.max(0, releaseReserved ? parentalTotal : parentalTotal - reserved);
  const parentalMaxOther = Math.max(0, parentalTotal - reserved);

  // Supplementary leave (births only).
  let supp = { weeks: 0, cap: 0 as 0 | 8 | 15 };
  let supplementaryRefusal: Lengths["supplementaryRefusal"];
  if (ev.kind === "birth" && ev.date && ev.loss !== "total") {
    const matEnd = addDays(ev.date, maternityDays - 1);
    const sp = paramsAt(ctx, maxDate(ev.date, matEnd));
    supp = supplementaryWeeks(facts.event.kind === "birth" ? facts.event.children : [], ev.date, sp);
    // Transitional rule: on the day the act came into force the parent had to be on maternity leave (B1-3).
    if (sp.supplementary.validFrom && matEnd < sp.supplementary.validFrom) {
      supplementaryRefusal = "TRANSITIONAL_RULE_NOT_MET";
      supp = { weeks: 0, cap: supp.cap };
    } else if (!sp.supplementary.validFrom) {
      supplementaryRefusal = "TRANSITIONAL_RULE_NOT_MET";
    }
    const nonEmployee = facts.claimant.titles.some(isNonEmployeeTitle) && !facts.claimant.titles.some((t) => t.kind === "employment");
    if (nonEmployee && !p.interpretation.supplementaryForNonEmployees) supp = { weeks: 0, cap: 0 };
  }

  // Paternity deadline and the parental horizon.
  let paternityExpiresOn: ISODate | undefined;
  let parentalDeadline: ISODate | undefined;
  if (ev.kind === "birth") {
    if (ev.childBirthDate) {
      paternityExpiresOn = addDays(addMonths(ev.childBirthDate, p.paternity.untilChildMonths), -1);
      parentalDeadline = endOfYear(yearOf(ev.childBirthDate) + p.parental.untilEndOfYearChildTurns);
    }
  } else {
    const e = facts.event.kind !== "birth" ? facts.event : undefined;
    if (e?.finalOrderOn) {
      paternityExpiresOn = addDays(addMonths(e.finalOrderOn, p.paternity.untilChildMonths), -1);
      if (ev.childBirthDate) paternityExpiresOn = minDate(paternityExpiresOn, dayBeforeBirthday(ev.childBirthDate, p.paternity.adoptionMaxChildAgeYears));
    }
    // Care events: parental leave until the age limit of the event type (KP 183 §4–4¹).
    parentalDeadline = ev.ageLimitEnd;
  }

  ctx.lengths = {
    maternityDays,
    motherMandatoryDays: p.maternity.motherMandatoryWeeks * 7,
    motherMandatorySpecialDays: p.maternity.motherMandatoryWeeksSpecial * 7,
    preBirthMaxDays: p.maternity.preBirthMaxWeeks * 7,
    supplementaryWeeks: supp.weeks,
    supplementaryCap: supp.cap,
    supplementaryRefusal,
    parentalTotal,
    reservedPerParent: reserved,
    parentalMaxClaimant,
    parentalMaxOther,
    parentalCalendarCap: (ev.multiple ? capWeeks.multiple : capWeeks.single) * 7,
    paternityDays: p.paternity.days,
    paternityExpiresOn,
    parentalDeadline,
    reducedAdoptionCase,
  };

  addTrace(ctx, "lengths", ev.kind === "birth" ? (ev.loss === "total" ? "KP-180-1" : "KP-180-1-TABLE") : "KP-183-ADOPTION", {
    factPaths: ["facts.event.children"],
    paramKeys: ev.loss === "total" ? ["loss.weeksAfterStillbirthOrEarlyDeath", "loss.minDaysFromDeath"] : ["maternity.weeksByChildren", "adoption.minLeaveWeeks"],
    inputs: { children: ev.childrenCount, loss: ev.loss },
    output: { maternityDays, reducedAdoptionCase },
    citations: ev.kind === "birth" ? (ev.loss === "total" ? C.loss : C.maternityLength) : C.adoption,
  });
  addTrace(ctx, "lengths", "KP-182-1A-POOL", {
    factPaths: ["facts.event.children", "facts.otherParent.insured"],
    paramKeys: ["parental.weeks", "parental.weeksZaZyciem", "parental.reservedWeeksPerParent", "interpretation.nineWeeksLostIfOtherParentUninsured", "parental.untilEndOfYearChildTurns"],
    inputs: { multiple: ev.multiple, zaZyciem: ev.zaZyciem, otherUninsured },
    output: { parentalTotal, parentalMaxClaimant, reserved, parentalDeadline },
    citations: reducedAdoptionCase ? C.adoptionParental : C.parental,
  });
  if (ev.kind === "birth") {
    addTrace(ctx, "lengths", "KP-180-2-SUPPLEMENTARY", {
      factPaths: ["facts.event.children"],
      paramKeys: ["supplementary.validFrom", "supplementary.extremePretermBeforeWeek", "supplementary.extremeMaxWeightG", "supplementary.pretermBeforeWeek", "supplementary.capWeeksExtreme", "supplementary.capWeeksPreterm", "supplementary.capWeeksTerm"],
      inputs: { birth: ev.date },
      output: { weeks: supp.weeks, cap: supp.cap, refusal: supplementaryRefusal },
      citations: C.supplementary,
    });
    addTrace(ctx, "lengths", "KP-182-3-PATERNITY", {
      factPaths: ["facts.event.date"],
      paramKeys: ["paternity.days", "paternity.untilChildMonths"],
      inputs: { childBirthDate: ev.childBirthDate },
      output: { paternityDays: p.paternity.days, paternityExpiresOn },
      citations: C.paternity,
    });
  }
  return ctx;
}
