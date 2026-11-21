/**
 * Event stage: classify the family event (digest 02 B5, B6, B10).
 * - Birth: live / stillbirth / death before 8 weeks (loss, KP 180¹ §1) / death after 8 weeks (§2) / mixed multiples
 *   (length by the children who survive, unless `stillbornCountsForMaternityLength`).
 * - Adoption: child under 14 when taken into care with a petition filed (KP 183 §1).
 * - Foster: non-professional family only, child under 7 (10 with deferred schooling) (KP 183 §1¹).
 */
import { C } from "../cite";
import { addDays, dayBeforeBirthday, diffDays, maxDate } from "../dates";
import { addTrace, type Ctx, type EventInfo } from "../context";
import type { Facts, ParameterSet } from "../types";

export function classifyEvent(facts: Facts, p: ParameterSet): EventInfo {
  const e = facts.event;
  const children = e.children.length ? e.children : [{ ref: "child-1" }];
  if (e.kind === "birth") {
    const date = e.date;
    const dueDate = e.expectedDate ?? e.date;
    const lossDays = p.loss.earlyDeathBeforeWeeks * 7;
    let survivors = 0;
    let lastDeath: string | undefined;
    let lateDeathEnd: string | undefined;
    for (const c of children) {
      const stillborn = c.bornAlive === false;
      const deathOffset = c.deathDate && date ? diffDays(date, c.deathDate) : undefined;
      const earlyDeath = deathOffset !== undefined && deathOffset < lossDays;
      if (stillborn || earlyDeath) {
        const d = stillborn ? date : c.deathDate;
        if (d) lastDeath = lastDeath ? maxDate(lastDeath, d) : d;
      } else {
        survivors++;
        if (c.deathDate) lateDeathEnd = lateDeathEnd ? maxDate(lateDeathEnd, addDays(c.deathDate, p.loss.minDaysFromDeath - 1)) : addDays(c.deathDate, p.loss.minDaysFromDeath - 1);
      }
    }
    const loss = survivors === 0 ? "total" : survivors < children.length ? "partial" : "none";
    const allLateDead = survivors > 0 && children.filter((c) => c.bornAlive !== false).every((c) => !!c.deathDate);
    const count = loss === "partial" && !p.interpretation.stillbornCountsForMaternityLength ? survivors : children.length;
    return {
      kind: "birth",
      date,
      dueDate,
      refDate: date ?? dueDate,
      happened: !!date || e.occurred === true,
      childrenCount: loss === "total" ? children.length : count,
      liveCount: survivors,
      loss,
      lossMinEnd: lastDeath ? addDays(lastDeath, p.loss.minDaysFromDeath - 1) : undefined,
      lateDeathEnd: allLateDead ? lateDeathEnd : undefined,
      zaZyciem: children.some((c) => c.zaZyciem === true && c.bornAlive !== false),
      multiple: (loss === "none" ? children.length : survivors) >= 2,
      childBirthDate: date ?? dueDate,
    };
  }
  // Adoption / foster family.
  const date = e.takenIntoCareOn;
  const births = children.map((c) => c.birthDate).filter((d): d is string => !!d).sort();
  const youngest = births[births.length - 1];
  const oldest = births[0];
  let careRefusal: EventInfo["careRefusal"];
  let ageLimitEnd: string | undefined;
  if (e.kind === "foster") {
    if (e.fosterType === "professional") careRefusal = "FOSTER_PROFESSIONAL";
    const deferred = children.some((c) => c.schoolDeferred);
    const years = deferred ? p.adoption.fosterMaxAgeDeferredYears : p.adoption.fosterMaxAgeYears;
    if (oldest) ageLimitEnd = dayBeforeBirthday(youngest ?? oldest, years);
    if (!careRefusal && oldest && dayBeforeBirthday(oldest, years) < date) careRefusal = "CHILD_AGE_LIMIT";
  } else {
    if (oldest) ageLimitEnd = dayBeforeBirthday(youngest ?? oldest, p.adoption.adoptionMaxAgeYears);
    if (oldest && dayBeforeBirthday(oldest, p.adoption.adoptionMaxAgeYears) < date) careRefusal = "CHILD_AGE_LIMIT";
  }
  return {
    kind: e.kind,
    date,
    dueDate: date,
    refDate: date,
    happened: true,
    childrenCount: children.length,
    liveCount: children.length,
    loss: "none",
    zaZyciem: children.some((c) => c.zaZyciem === true),
    multiple: children.length >= 2,
    childBirthDate: youngest,
    ageLimitEnd,
    careRefusal,
  };
}

export function run(ctx: Ctx): Ctx {
  addTrace(ctx, "event", ctx.ev.kind === "birth" ? "B5-B10-EVENT" : "B6-CARE-EVENT", {
    factPaths: ["facts.event"],
    paramKeys: ctx.ev.kind === "birth" ? ["loss.earlyDeathBeforeWeeks", "loss.minDaysFromDeath", "interpretation.stillbornCountsForMaternityLength"] : ["adoption.fosterMaxAgeYears", "adoption.fosterMaxAgeDeferredYears", "adoption.adoptionMaxAgeYears"],
    inputs: { kind: ctx.ev.kind, date: ctx.ev.date, dueDate: ctx.ev.dueDate },
    output: { loss: ctx.ev.loss, childrenCount: ctx.ev.childrenCount, liveCount: ctx.ev.liveCount, zaZyciem: ctx.ev.zaZyciem, careRefusal: ctx.ev.careRefusal },
    citations: ctx.ev.kind === "birth" ? (ctx.ev.loss === "none" ? C.maternityLength : C.loss) : C.adoption,
  });
  return ctx;
}
