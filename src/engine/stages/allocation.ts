/**
 * Allocation stage (KP 180 §4–14, 182¹a–182¹f, 182³; UZ 29a).
 * Normalises the plan (or builds the default "maximum entitlement" plan), validates every block against the pools
 * and splits it into payable / refused segments — a surplus is refused on the surplus only (EXCESS_DAYS, B3-14).
 * Then groups blocks into chains (one right-arising date each) and checks sickness insurance per chain: on the
 * event date for the mother's maternity, on the first day of every separately claimed part (B5-8, B3-6).
 */
import { C } from "../cite";
import { addTrace, findTitle, MATERNITY_TYPES, SICKNESS_TYPES, TYPE_ORDER, type Ctx, type Segment } from "../context";
import { addDays, daysInclusive, diffDays, maxDate, minDate, periodEnd } from "../dates";
import { floorTimes, compareFractions, fractionToBps } from "../money";
import type { InsuranceCheck, ISODate, PaidBenefit, Plan, PlanBlock, ReasonCode } from "../types";
import { afterTitleQualifying, insuredOnTitles, titleEnd } from "./insurance";
import { payerPays } from "./routing";
import { sicknessBlocksFromNotes } from "./sickness";

// ───────────────────────── default plan ─────────────────────────

function primaryTitleId(ctx: Ctx, date: ISODate | undefined): string | undefined {
  if (!date) return ctx.facts.claimant.titles[0]?.id;
  const check = insuredOnTitles(ctx.facts.claimant, date, undefined, true);
  return check.titleId ?? ctx.facts.claimant.titles[0]?.id;
}

/** Earliest date in [from, until] on which the person is insured (tries `from` and every cover start). */
function firstInsuredDate(ctx: Ctx, from: ISODate, until: ISODate | undefined): ISODate {
  const person = ctx.facts.claimant;
  const candidates = new Set<ISODate>([from]);
  for (const t of person.titles) {
    if (t.from > from) candidates.add(t.from);
    if (t.registeredOn && t.registeredOn > from) candidates.add(t.registeredOn);
    for (const p of t.sickness.periods) if (p.from > from) candidates.add(p.from);
  }
  const sorted = [...candidates].filter((d) => !until || d <= until).sort();
  return sorted.find((d) => insuredOnTitles(person, d, undefined, true).insured) ?? from;
}

/**
 * The plan used when `plan === null`: the claimant's maximum entitlement, every block dated. Block ids are
 * deterministic: `${type}-${parent}-${n}`. When the other parent is present and insured, their lane is included
 * (father: paternity 14 days + his 9 reserved weeks; mother: maternity + her parental share) and the claimant
 * takes the rest.
 */
export function buildDefaultPlan(ctx: Ctx): Plan {
  const { ev, lengths, facts } = ctx;
  const person = facts.claimant;
  const blocks: PlanBlock[] = [];
  const counters = new Map<string, number>();
  const push = (b: Omit<PlanBlock, "id">) => {
    const k = `${b.type}-${b.parent}`;
    const n = (counters.get(k) ?? 0) + 1;
    counters.set(k, n);
    blocks.push({ id: `${k}-${n}`, ...b });
  };
  const ref = ev.refDate;
  const isFather = ev.kind === "birth" && (person.role === "father" || (person.role !== "mother" && person.sex === "M"));
  const op = facts.otherParent;
  const otherLane = !!op && (op.insured === "yes" || !!op.person) && ev.loss !== "total";
  if (ref) {
    if (ev.kind === "birth" && !isFather && person.role === "mother") {
      const at = afterTitleQualifying(ctx, ref, true);
      const titleEndDate = at ? titleEnd(at.title, true).to : undefined;
      if (at?.preBirth && titleEndDate && addDays(titleEndDate, 1) < ref) {
        push({ parent: "claimant", type: "art30PreBirth", titleId: at.title.id, from: addDays(titleEndDate, 1), days: diffDays(titleEndDate, ref) - 1 });
      }
      const titleId = at?.title.id ?? primaryTitleId(ctx, ref);
      let cursor = ref;
      push({ parent: "claimant", type: "maternity", titleId, from: cursor, days: lengths.maternityDays });
      cursor = addDays(cursor, lengths.maternityDays);
      if (lengths.supplementaryWeeks > 0) {
        push({ parent: "claimant", type: "supplementary", titleId, from: cursor, days: lengths.supplementaryWeeks * 7 });
        cursor = addDays(cursor, lengths.supplementaryWeeks * 7);
      }
      if (lengths.parentalMaxClaimant > 0) {
        push({ parent: "claimant", type: "parental", titleId, from: cursor, days: lengths.parentalMaxClaimant, pool: "shared" });
        cursor = addDays(cursor, lengths.parentalMaxClaimant);
      }
      if (otherLane && op!.role === "father") {
        push({ parent: "other", type: "paternity", from: ref, days: lengths.paternityDays });
        if (lengths.parentalTotal > lengths.parentalMaxClaimant) push({ parent: "other", type: "parental", from: cursor, days: lengths.parentalTotal - lengths.parentalMaxClaimant, pool: "ownNineWeeks" });
      }
    } else if (isFather) {
      const start = firstInsuredDate(ctx, ref, lengths.paternityExpiresOn ? addDays(lengths.paternityExpiresOn, -(lengths.paternityDays - 1)) : undefined);
      const titleId = primaryTitleId(ctx, start);
      if (ev.loss !== "total") {
        push({ parent: "claimant", type: "paternity", titleId, from: start, days: lengths.paternityDays });
        if (otherLane && op!.role === "mother") {
          // Mother's lane: maternity, then her parental share; the father takes his 9 weeks after it.
          const motherParental = lengths.parentalMaxOther;
          push({ parent: "other", type: "maternity", from: ref, days: lengths.maternityDays });
          if (motherParental > 0) push({ parent: "other", type: "parental", from: addDays(ref, lengths.maternityDays), days: motherParental, pool: "shared" });
          const after = addDays(ref, lengths.maternityDays + motherParental);
          if (lengths.parentalTotal > motherParental) push({ parent: "claimant", type: "parental", titleId, from: maxDate(after, addDays(start, lengths.paternityDays)), days: lengths.parentalTotal - motherParental, pool: "ownNineWeeks" });
        } else if (lengths.parentalTotal > 0) {
          push({ parent: "claimant", type: "parental", titleId, from: addDays(start, lengths.paternityDays), days: lengths.reservedPerParent, pool: "ownNineWeeks" });
        }
      }
    } else if (ev.kind !== "birth" && !ev.careRefusal) {
      const titleId = primaryTitleId(ctx, ref);
      push({ parent: "claimant", type: "maternityOnAdoption", titleId, from: ref, days: lengths.maternityDays });
      const parentalFrom = addDays(ref, lengths.maternityDays);
      if (lengths.parentalMaxClaimant > 0) push({ parent: "claimant", type: "parental", titleId, from: parentalFrom, days: lengths.parentalMaxClaimant, pool: "shared" });
      if (otherLane && lengths.parentalTotal > lengths.parentalMaxClaimant) {
        push({ parent: "other", type: "parental", from: addDays(parentalFrom, lengths.parentalMaxClaimant), days: lengths.parentalTotal - lengths.parentalMaxClaimant, pool: "ownNineWeeks" });
      }
    }
  }
  for (const b of sicknessBlocksFromNotes(ctx)) push({ ...b });
  const insuredTitles = person.titles.filter((t) => ref && insuredOnTitles(person, ref, t.id, true).insured).length;
  return { rateOption: "averaged81_5", singleTitleStatement: insuredTitles <= 1, blocks };
}

// ───────────────────────── validation ─────────────────────────

interface Piece { from: ISODate; to: ISODate; days: number; status: Segment["status"]; reasonCode?: ReasonCode }

/** Keep the first `keep` days payable; the rest is refused with `reason`. */
function cut(pieces: Piece[], keep: number, reason: ReasonCode): Piece[] {
  const out: Piece[] = [];
  let left = Math.max(0, keep);
  for (const p of pieces) {
    if (p.status !== "payable") { out.push(p); continue; }
    if (left >= p.days) { out.push(p); left -= p.days; continue; }
    if (left > 0) out.push({ ...p, to: addDays(p.from, left - 1), days: left });
    const from = addDays(p.from, left);
    out.push({ from, to: p.to, days: daysInclusive(from, p.to), status: "refused", reasonCode: reason });
    left = 0;
  }
  return out;
}

/** Refuse payable days after `last` (inclusive bound). */
function cutAfter(pieces: Piece[], last: ISODate, reason: ReasonCode): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    if (p.status !== "payable" || p.to <= last) { out.push(p); continue; }
    if (p.from <= last) out.push({ ...p, to: last, days: daysInclusive(p.from, last) });
    const from = maxDate(p.from, addDays(last, 1));
    out.push({ from, to: p.to, days: daysInclusive(from, p.to), status: "refused", reasonCode: reason });
  }
  return out;
}

/** Refuse payable days before `first`. */
function cutBefore(pieces: Piece[], first: ISODate, reason: ReasonCode): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    if (p.status !== "payable" || p.from >= first) { out.push(p); continue; }
    const to = minDate(p.to, addDays(first, -1));
    out.push({ from: p.from, to, days: daysInclusive(p.from, to), status: "refused", reasonCode: reason });
    if (p.to >= first) out.push({ ...p, from: first, days: daysInclusive(first, p.to) });
  }
  return out;
}

const refuseAll = (pieces: Piece[], reason: ReasonCode): Piece[] => pieces.map((p) => (p.status === "payable" ? { ...p, status: "refused" as const, reasonCode: reason } : p));
const payableDays = (pieces: Piece[]) => pieces.filter((p) => p.status === "payable").reduce((a, p) => a + p.days, 0);

function benefitDaysOf(list: PaidBenefit[], types: string[], since?: ISODate): number {
  return list.filter((b) => types.includes(b.type) && (!since || b.from >= since)).reduce((a, b) => a + daysInclusive(b.from, b.to), 0);
}

export function sortBlocks(plan: Plan): { b: PlanBlock; i: number }[] {
  return plan.blocks
    .map((b, i) => ({ b, i }))
    .sort((x, y) =>
      x.b.from < y.b.from ? -1 : x.b.from > y.b.from ? 1 :
      TYPE_ORDER[x.b.type] - TYPE_ORDER[y.b.type] ||
      x.b.parent.localeCompare(y.b.parent) || x.b.id.localeCompare(y.b.id) || x.b.days - y.b.days);
}

export function run(ctx: Ctx): Ctx {
  const { ev, lengths, facts } = ctx;
  const p = ctx.params;
  const person = facts.claimant;
  const op = facts.otherParent;
  const isFatherClaimant = person.role === "father" || (person.role !== "mother" && person.sex === "M" && ev.kind === "birth");
  // Benefits already paid for this child: those starting no earlier than the earliest pre-birth start (an earlier
  // child's maternity in the same file must not count, B3-07).
  const since = ev.refDate ? addDays(ev.refDate, -lengths.preBirthMaxDays) : undefined;

  // Already used (benefits paid before this plan, for this child). A paid benefit overlapping a planned block of the
  // same kind is that block already being paid (B1-10: day 1 paid by the employer) and is not counted twice.
  const family = (t: string) => (t === "maternityOnAdoption" ? "maternity" : t);
  const notInPlan = (parent: "claimant" | "other") => (b: PaidBenefit) =>
    !ctx.plan.blocks.some((x) => x.parent === parent && family(x.type) === family(b.type) && x.from <= b.to && periodEnd(x.from, x.days) >= b.from);
  const paidOwn = person.paidBenefits.filter(notInPlan("claimant"));
  const otherUsed = (op?.used ?? []).filter(notInPlan("other"));
  const motherUsed = facts.event.kind === "birth" ? facts.event.mother?.maternityUsed : undefined;
  let maternityUsedByOther = benefitDaysOf(otherUsed, ["maternity", "maternityOnAdoption"]);
  let maternityUsed = benefitDaysOf(paidOwn, ["maternity", "maternityOnAdoption"], since) + benefitDaysOf(otherUsed, ["maternity", "maternityOnAdoption"]) + (motherUsed && !otherUsed.some((u) => u.type === "maternity") ? daysInclusive(motherUsed.from, motherUsed.to) : 0);
  const motherMaternityDays = isFatherClaimant ? maternityUsed : 0;
  let supplementaryUsed = benefitDaysOf(paidOwn, ["supplementary"], since) + benefitDaysOf(otherUsed, ["supplementary"]);
  const parentalUsed = { claimant: benefitDaysOf(paidOwn, ["parental"], since), other: benefitDaysOf(otherUsed, ["parental"]) };
  let parentalCalendar = parentalUsed.claimant + parentalUsed.other;
  if (ev.kind !== "birth" && facts.event.kind !== "birth" && facts.event.previouslyUsedAsFoster) {
    maternityUsed += facts.event.previouslyUsedAsFoster.leaveDays;
    parentalUsed.claimant += facts.event.previouslyUsedAsFoster.parentalDays;
  }
  // Parts already used: every separate period of parental benefit counts, for both parents together (B4-12).
  const partStarts: { parent: "claimant" | "other"; from: ISODate; to: ISODate }[] = [];
  const addParts = (list: PaidBenefit[], parent: "claimant" | "other") => {
    const sorted = list.filter((b) => b.type === "parental" && (!since || b.from >= since)).sort((a, b) => (a.from < b.from ? -1 : 1));
    for (const b of sorted) {
      const prev = partStarts.filter((x) => x.parent === parent).at(-1);
      if (prev && addDays(prev.to, 1) === b.from) prev.to = b.to;
      else partStarts.push({ parent, from: b.from, to: b.to });
    }
  };
  addParts(paidOwn, "claimant");
  addParts(otherUsed, "other");
  const paidPaternity = paidOwn.filter((b) => b.type === "paternity" && (!since || b.from >= since));
  let paternityUsed = paidPaternity.reduce((a, b) => a + daysInclusive(b.from, b.to), 0);
  let paternityParts = paidPaternity.length;
  const lastMaternityEnd: Record<"claimant" | "other", ISODate | undefined> = {
    claimant: paidOwn.filter((b) => b.type === "maternity" && (!since || b.from >= since)).map((b) => b.to).sort().at(-1),
    other: otherUsed.filter((b) => b.type === "maternity").map((b) => b.to).sort().at(-1),
  };
  const lastParental: Record<"claimant" | "other", { to: ISODate } | undefined> = { claimant: undefined, other: undefined };

  const segments: Segment[] = [];
  for (const { b, i } of sortBlocks(ctx.plan)) {
    const to = periodEnd(b.from, b.days);
    let pieces: Piece[] = [{ from: b.from, to, days: b.days, status: "payable" }];
    const parent = b.parent;
    const factPath = `plan.blocks[${i}]`;
    const viol = (code: ReasonCode, values: Record<string, string | number>, citations = C.parental) =>
      ctx.violations.push({ code, blockId: b.id, values, citations });
    let rule = "ALLOC";
    let citations = C.parental;
    const type = b.type === "maternity" && ev.kind !== "birth" ? "maternityOnAdoption" : b.type;

    switch (type) {
      case "maternity": {
        rule = "KP-180";
        citations = C.maternityLength;
        const fatherTakeover = parent === "claimant" ? isFatherClaimant : !isFatherClaimant;
        if (ev.loss === "total" && ev.date) {
          // 8 weeks after the birth, not shorter than 7 days from the death (KP 180¹ §1).
          const before = payableDays(pieces);
          pieces = cutAfter(pieces, periodEnd(ev.date, lengths.maternityDays), "EXCESS_DAYS");
          if (payableDays(pieces) < before) viol("EXCESS_DAYS", { allowedDays: payableDays(pieces), latestEnd: periodEnd(ev.date, lengths.maternityDays) }, C.loss);
          citations = C.loss;
        }
        if (fatherTakeover) {
          // Takeover by the father: the mother must have used ≥ 14 weeks after birth (8 in the special cases, none after death).
          const minimum = b.takeover === "motherDeath" ? 0 : b.takeover && b.takeover !== "afterResignation" ? lengths.motherMandatorySpecialDays : lengths.motherMandatoryDays;
          const used = parent === "claimant" ? motherMaternityDays : lastMaternityEnd.claimant && ev.date ? daysInclusive(ev.date, lastMaternityEnd.claimant) : 0;
          const motherAfterBirth = parent === "claimant" && motherUsed && ev.date ? daysInclusive(maxDate(motherUsed.from, ev.date), motherUsed.to) : used;
          const motherUninsured = facts.event.kind === "birth" && facts.event.mother?.insuredAtBirth === false;
          const uninsuredOk = b.takeover === "motherDeath" || b.takeover === "motherAbandonment" || b.takeover === "motherIncapacity" || (facts.event.kind === "birth" && !!facts.event.mother?.employedHalfTimeFrom);
          if ((motherUninsured && !uninsuredOk) || (!motherUninsured && motherAfterBirth < minimum)) {
            pieces = refuseAll(pieces, "MOTHER_MINIMUM_WEEKS");
            viol("MOTHER_MINIMUM_WEEKS", { requiredDays: minimum, motherDays: motherAfterBirth }, C.motherMinimum);
          }
          citations = b.takeover && b.takeover !== "afterResignation" ? C.motherSpecial : C.motherMinimum;
        } else if (ev.dueDate) {
          // At most 6 weeks before the expected date of birth (KP 180 §2).
          // (Only leave that starts before the actual birth is pre-birth leave: a preterm birth comes before the window.)
          const earliest = addDays(ev.dueDate, -lengths.preBirthMaxDays);
          if (b.from < earliest && (!ev.date || b.from < ev.date)) { pieces = cutBefore(pieces, earliest, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces), earliest }, C.preBirth); }
        }
        const avail = lengths.maternityDays - maternityUsed;
        if (payableDays(pieces) > avail) { pieces = cut(pieces, avail, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces) }, C.maternityLength); }
        maternityUsed += payableDays(pieces);
        if (parent === "other") maternityUsedByOther += payableDays(pieces);
        lastMaternityEnd[parent] = to;
        break;
      }
      case "maternityOnAdoption": {
        rule = "KP-183";
        citations = C.adoption;
        if (ev.careRefusal) { pieces = refuseAll(pieces, ev.careRefusal); viol(ev.careRefusal, {}, C.adoption); break; }
        if (ev.date && b.from < ev.date) { pieces = cutBefore(pieces, ev.date, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces), earliest: ev.date }, C.adoption); }
        const avail = lengths.maternityDays - maternityUsed;
        if (payableDays(pieces) > avail) { pieces = cut(pieces, avail, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces) }, C.adoption); }
        maternityUsed += payableDays(pieces);
        if (parent === "other") maternityUsedByOther += payableDays(pieces);
        lastMaternityEnd[parent] = to;
        break;
      }
      case "supplementary": {
        rule = "KP-180-2";
        citations = C.supplementary;
        if (lengths.supplementaryWeeks === 0) {
          const reason = lengths.supplementaryRefusal ?? "EXCESS_DAYS";
          pieces = refuseAll(pieces, reason);
          viol(reason, { weeks: 0, allowedDays: 0 }, C.supplementary);
          break;
        }
        const matEnd = lastMaternityEnd.claimant ?? lastMaternityEnd.other;
        if (matEnd && addDays(matEnd, 1) !== b.from) {
          pieces = refuseAll(pieces, "NOT_CONTIGUOUS");
          viol("NOT_CONTIGUOUS", { requiredFrom: addDays(matEnd, 1) }, C.supplementary);
          break;
        }
        const avail = lengths.supplementaryWeeks * 7 - supplementaryUsed;
        if (payableDays(pieces) > avail) { pieces = cut(pieces, avail, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces) }, C.supplementary); }
        supplementaryUsed += payableDays(pieces);
        lastMaternityEnd[parent] = to;
        break;
      }
      case "parental": {
        rule = "KP-182-1A";
        if (ev.loss === "total") { pieces = refuseAll(pieces, "NO_LIVING_CHILD"); viol("NO_LIVING_CHILD", {}, C.loss); break; }
        const f = b.workFraction;
        if (f && compareFractions(f, p.parental.workMaxFraction) > 0) {
          pieces = refuseAll(pieces, "WORK_FRACTION_TOO_HIGH");
          viol("WORK_FRACTION_TOO_HIGH", { maxNum: p.parental.workMaxFraction.num, maxDen: p.parental.workMaxFraction.den, fractionBps: fractionToBps(f) }, C.parentalWork);
          break;
        }
        // Parts: a block contiguous with the same parent's previous parental block in one application is one part.
        const prev = lastParental[parent];
        const continues = !!prev && addDays(prev.to, 1) === b.from && !b.claimedSeparatelyOn;
        if (!continues) {
          if (partStarts.length + 1 > p.parental.maxParts) {
            pieces = refuseAll(pieces, "PARTS_LIMIT");
            viol("PARTS_LIMIT", { partsUsed: partStarts.length, max: p.parental.maxParts }, C.parentalParts);
            citations = C.parentalParts;
            break;
          }
          partStarts.push({ parent, from: b.from, to });
        } else partStarts.filter((x) => x.parent === parent).at(-1)!.to = to;
        lastParental[parent] = { to };
        if (lengths.parentalDeadline && to > lengths.parentalDeadline) {
          pieces = cutAfter(pieces, lengths.parentalDeadline, "DEADLINE_PASSED");
          viol("DEADLINE_PASSED", { latestEnd: lengths.parentalDeadline, deadline: lengths.parentalDeadline }, C.parentalParts);
        }
        // Pool: each parent ≤ total − the other parent's 9 weeks; both together ≤ total.
        // Combining with work at fraction f consumes days − ⌊days × f⌋ pool days (extension, KP 182¹f §2).
        const parentMax = parent === "claimant" ? lengths.parentalMaxClaimant : lengths.parentalMaxOther;
        const availParent = parentMax - parentalUsed[parent];
        const availTotal = lengths.parentalTotal - parentalUsed.claimant - parentalUsed.other;
        const avail = Math.max(0, Math.min(availParent, availTotal));
        const consumption = (d: number) => d - (f ? floorTimes(d, f) : 0);
        let keep = payableDays(pieces);
        while (keep > 0 && consumption(keep) > avail) keep--;
        if (keep < payableDays(pieces)) {
          const reason: ReasonCode = lengths.zaZyciemCertMissing ? "CERTIFICATE_MISSING" : availParent <= availTotal ? "EXCESS_DAYS" : "POOL_EXCEEDED";
          pieces = cut(pieces, keep, reason);
          viol(reason, { allowedDays: payableDays(pieces), available: avail, requested: b.days }, C.parental);
          // The surplus comes from the other parent's non-transferable 9 weeks (KP 182¹a §4).
          if (availParent < availTotal && lengths.reservedPerParent > 0) viol("RESERVED_WEEKS", { reservedDays: lengths.reservedPerParent, allowedDays: payableDays(pieces) }, C.parental);
        }
        const calendarAvail = lengths.parentalCalendarCap - parentalCalendar;
        if (payableDays(pieces) > calendarAvail) { pieces = cut(pieces, calendarAvail, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces), calendarCap: lengths.parentalCalendarCap }, C.parentalWork); }
        parentalUsed[parent] += consumption(payableDays(pieces));
        parentalCalendar += payableDays(pieces);
        citations = f ? C.parentalWork : C.parental;
        break;
      }
      case "paternity": {
        rule = "KP-182-3";
        citations = C.paternity;
        if (ev.loss === "total") { pieces = refuseAll(pieces, "NO_LIVING_CHILD"); viol("NO_LIVING_CHILD", {}, C.paternity); break; }
        if (paternityParts + 1 > p.paternity.maxParts) {
          pieces = refuseAll(pieces, "PARTS_LIMIT");
          viol("PARTS_LIMIT", { partsUsed: paternityParts, max: p.paternity.maxParts }, C.paternity);
          break;
        }
        paternityParts++;
        if (lengths.paternityExpiresOn && to > lengths.paternityExpiresOn) {
          pieces = cutAfter(pieces, lengths.paternityExpiresOn, "DEADLINE_PASSED");
          viol("DEADLINE_PASSED", { latestEnd: lengths.paternityExpiresOn, allowedDays: payableDays(pieces) }, C.paternity);
        }
        const avail = lengths.paternityDays - paternityUsed;
        if (payableDays(pieces) > avail) { pieces = cut(pieces, avail, "EXCESS_DAYS"); viol("EXCESS_DAYS", { allowedDays: payableDays(pieces) }, C.paternity); }
        paternityUsed += payableDays(pieces);
        break;
      }
      case "art30PreBirth": {
        rule = "UZ-30-3";
        citations = C.art30PreBirth;
        const at = afterTitleQualifying(ctx, ev.refDate, ctx.mode === "prospective");
        if (!at || !at.preBirth) {
          pieces = refuseAll(pieces, "TITLE_END_NOT_QUALIFYING");
          viol("TITLE_END_NOT_QUALIFYING", { reason: at?.reason ?? "none" }, C.art30PreBirth);
          break;
        }
        const end = titleEnd(at.title, true).to!;
        const requested = payableDays(pieces);
        pieces = cutBefore(pieces, addDays(end, 1), "EXCESS_DAYS");
        // Paid until the day before the birth (UZ art. 30 ust. 3).
        const birth = ev.date ?? ev.dueDate;
        if (birth) pieces = cutAfter(pieces, addDays(birth, -1), "EXCESS_DAYS");
        if (payableDays(pieces) < requested) viol("EXCESS_DAYS", { allowedDays: payableDays(pieces), requiredFrom: addDays(end, 1) }, C.art30PreBirth);
        break;
      }
      default:
        rule = SICKNESS_TYPES.has(type) ? "UZ-SICKNESS" : "ALLOC";
        citations = type === "sickPay" ? C.sickPay : C.rateSickness;
    }

    // After the late death of the child every benefit ends 7 days after the death (KP 180¹ §2).
    if (ev.lateDeathEnd && MATERNITY_TYPES.has(type)) pieces = cutAfter(pieces, ev.lateDeathEnd, "NO_LIVING_CHILD");

    addTrace(ctx, "allocation", rule, {
      factPaths: [factPath, "facts.event"],
      paramKeys: type === "parental" ? ["parental.maxParts", "parental.reservedWeeksPerParent", "parental.workMaxFraction"] : type === "paternity" ? ["paternity.days", "paternity.maxParts", "paternity.untilChildMonths"] : type === "maternity" ? ["maternity.weeksByChildren", "maternity.preBirthMaxWeeks", "maternity.motherMandatoryWeeks"] : [],
      inputs: { blockId: b.id, type, parent, from: b.from, days: b.days },
      output: pieces.map((x) => ({ from: x.from, to: x.to, days: x.days, status: x.status, reasonCode: x.reasonCode })),
      citations,
    });

    pieces.forEach((x, n) => {
      segments.push({
        key: `${b.id}#${n}`, block: b, blockIndex: i, parent, type,
        from: x.from, to: x.to, days: x.days, status: x.status, reasonCode: x.reasonCode,
        chain: "", rightArisesOn: x.from, checkPurpose: "partStart", titleId: b.titleId, afterTitle: false,
        base: 0, rateBps: 0, workReductionBps: b.workFraction ? fractionToBps(b.workFraction) : undefined,
        daily: 0, gross: 0, months: [], paidBy: "zus",
      });
    });
  }
  ctx.segments = segments;
  assignChains(ctx);
  checkChainInsurance(ctx);
  splitAtTitleEnd(ctx);

  ctx.pools = {
    maternityDays: { total: lengths.maternityDays, used: maternityUsed, usedByOther: maternityUsedByOther, motherMandatory: lengths.motherMandatoryDays },
    supplementaryDays: { total: lengths.supplementaryWeeks * 7, used: supplementaryUsed, capWeeks: lengths.supplementaryCap },
    parentalDays: {
      total: lengths.parentalTotal, used: parentalUsed.claimant + parentalUsed.other, reservedPerParent: lengths.reservedPerParent,
      usedByClaimant: parentalUsed.claimant, usedByOther: parentalUsed.other,
      extensionDays: segments.filter((s) => s.type === "parental" && s.block.workFraction && s.status !== "refused").reduce((a, s) => a + floorTimes(s.days, s.block.workFraction!), 0),
    },
    parentalParts: { used: partStarts.length, max: p.parental.maxParts },
    paternityDays: { total: lengths.paternityDays, used: paternityUsed, parts: paternityParts, expiresOn: lengths.paternityExpiresOn },
    parentalDeadline: lengths.parentalDeadline,
  };
  return ctx;
}

// ───────────────────────── chains and insurance ─────────────────────────

const CHAINABLE = new Set(["maternity", "maternityOnAdoption", "supplementary", "parental"]);

/** Group segments into chains: one right-arising date, one insurance check, one base. */
function assignChains(ctx: Ctx): void {
  const { ev, facts } = ctx;
  const isMother = facts.claimant.role === "mother" || (facts.claimant.sex === "F" && facts.claimant.role !== "father");
  const byBlock = new Map<string, Segment[]>();
  for (const s of ctx.segments) byBlock.set(s.block.id + "|" + s.blockIndex, [...(byBlock.get(s.block.id + "|" + s.blockIndex) ?? []), s]);
  const blocks = [...byBlock.values()].map((segs) => ({ segs, b: segs[0].block, from: segs[0].block.from, to: periodEnd(segs[0].block.from, segs[0].block.days), parent: segs[0].parent, type: segs[0].type }));
  blocks.sort((x, y) => (x.from < y.from ? -1 : x.from > y.from ? 1 : TYPE_ORDER[x.type] - TYPE_ORDER[y.type] || x.b.id.localeCompare(y.b.id)));
  const open: Record<string, { key: string; to: ISODate; type: string } | undefined> = {};
  let n = 0;
  for (const blk of blocks) {
    const lane = `${blk.parent}:${CHAINABLE.has(blk.type) ? "mat" : SICKNESS_TYPES.has(blk.type) ? "sick" : blk.type}`;
    const prev = open[lane];
    const contiguous = prev && blk.from <= addDays(prev.to, 1) && blk.from >= addDays(prev.to, -400);
    const joins = contiguous && !blk.b.claimedSeparatelyOn && (CHAINABLE.has(blk.type) || SICKNESS_TYPES.has(blk.type));
    let key: string;
    let right: ISODate;
    let purpose: Segment["checkPurpose"];
    if (joins && prev) {
      key = prev.key;
      const first = ctx.segments.find((s) => s.chain === key)!;
      right = first.rightArisesOn;
      purpose = first.checkPurpose;
    } else {
      key = `chain-${++n}`;
      if (SICKNESS_TYPES.has(blk.type)) { right = blk.from; purpose = "sickness"; }
      else if ((blk.type === "maternity" && blk.parent === "claimant" && isMother) || blk.type === "maternityOnAdoption") {
        // The right arises on the birth / taking into care, or on the first day of pre-birth leave (UZ 29 ust. 1).
        right = ev.date && blk.from >= ev.date ? ev.date : blk.from;
        purpose = "event";
      } else { right = blk.from; purpose = "partStart"; }
    }
    open[lane] = { key, to: maxDate(prev && joins ? prev.to : blk.to, blk.to), type: blk.type };
    for (const s of blk.segs) { s.chain = key; s.rightArisesOn = right; s.checkPurpose = purpose; }
  }
}

function checkChainInsurance(ctx: Ctx): void {
  const person = ctx.facts.claimant;
  const p = ctx.params;
  const prospective = ctx.mode === "prospective";
  const chains = new Map<string, Segment[]>();
  for (const s of ctx.segments) chains.set(s.chain, [...(chains.get(s.chain) ?? []), s]);
  for (const [key, segs] of [...chains.entries()].sort((a, b) => (a[1][0].rightArisesOn < b[1][0].rightArisesOn ? -1 : 1))) {
    const first = segs[0];
    const date = first.rightArisesOn;
    if (first.parent === "other") {
      const op = ctx.facts.otherParent;
      const check = op?.person ? insuredOnTitles(op.person, date, undefined, prospective) : undefined;
      const insured = check ? check.insured : op?.insured !== "no";
      if (!insured) for (const s of segs) if (s.status === "payable") { s.status = "refused"; s.reasonCode = "NOT_INSURED_AT_PART_START"; }
      for (const s of segs) s.titleId = s.titleId ?? check?.titleId;
      continue;
    }
    if (first.type === "art30PreBirth") {
      const at = afterTitleQualifying(ctx, ctx.ev.refDate, prospective);
      for (const s of segs) { s.afterTitle = true; s.titleId = s.titleId ?? at?.title.id; }
      continue;
    }
    let titleId = first.block.titleId && findTitle(ctx, first.block.titleId) ? first.block.titleId : undefined;
    let check = insuredOnTitles(person, date, titleId, prospective);
    if (!check.insured && titleId) {
      // The same payer's title re-registered under a new entry (a business resumed, a new contract) still counts.
      const ref = findTitle(ctx, titleId)!.payer.ref;
      const alt = person.titles.find((t) => t.id !== titleId && t.payer.ref === ref && insuredOnTitles(person, date, t.id, prospective).insured);
      if (alt) { titleId = alt.id; check = insuredOnTitles(person, date, alt.id, prospective); }
    }
    let ok = check.insured || check.childcare === true;
    let afterTitle = false;
    let usedTitle = check.titleId;
    let rule = "R-ELIG-INSURED-AT-EVENT";
    if (!ok && first.checkPurpose === "event" && ctx.ev.kind === "birth") {
      // Art. 30: employment ended in pregnancy for a qualifying reason — maternity after the title.
      const at = afterTitleQualifying(ctx, ctx.ev.refDate, prospective);
      if (at && (!titleId || titleId === at.title.id)) { ok = true; afterTitle = true; usedTitle = at.title.id; rule = "R-ELIG-AFTER-TITLE-MAT"; }
    }
    if (!ok && first.checkPurpose === "sickness") {
      // Sickness after the title ended (UZ art. 7): incapacity within 14 days of the end, lasting ≥ 30 days.
      const total = segs.reduce((a, s) => a + s.days, 0);
      const ended = person.titles.find((t) => t.to && t.to < date && diffDays(t.to, date) <= p.sickness.afterTitleStartWithinDays && insuredOnTitles(person, t.to, t.id, prospective).insured);
      if (ended && total >= p.sickness.afterTitleMinDays && !person.flags?.pension && !person.flags?.unemploymentBenefit && !person.flags?.krus) {
        ok = true; afterTitle = true; usedTitle = ended.id; rule = "UZ-7-AFTER-TITLE";
      }
    }
    const purpose: InsuranceCheck["purpose"] = first.checkPurpose;
    const general: ReasonCode = purpose === "partStart" ? "NOT_INSURED_AT_PART_START" : "NOT_INSURED_AT_EVENT";
    const reasonCode = ok ? undefined : check.reasonCode && check.reasonCode !== "NOT_INSURED_AT_EVENT" ? check.reasonCode : general;
    if (!ctx.insurance.some((c) => c.onDate === date && c.purpose === purpose && c.titleId === usedTitle)) {
      ctx.insurance.push({ onDate: date, purpose, insured: check.insured, titleId: usedTitle, mode: check.mode, reasonCode: ok ? undefined : reasonCode });
    }
    // Art. 30 coverage of the parental part is an interpretation flag (digest 02 open question 2).
    const parentalBlocked = afterTitle && rule === "R-ELIG-AFTER-TITLE-MAT" && !p.interpretation.art30CoversParental;
    for (const s of segs) {
      s.titleId = s.titleId ?? usedTitle;
      if (!ok && s.status === "payable") { s.status = "refused"; s.reasonCode = reasonCode; }
      if (parentalBlocked && s.type === "parental" && s.status === "payable") { s.status = "refused"; s.reasonCode = "TITLE_END_NOT_QUALIFYING"; }
      const t = findTitle(ctx, s.titleId);
      const end = t ? titleEnd(t, prospective).to : undefined;
      s.afterTitle = afterTitle || (!!end && s.from > end);
    }
    const ti = person.titles.findIndex((t) => t.id === usedTitle);
    addTrace(ctx, "insurance", rule, {
      factPaths: [ti >= 0 ? `facts.claimant.titles[${ti}]` : "facts.claimant.titles", `plan.blocks[${first.blockIndex}]`],
      paramKeys: rule === "UZ-7-AFTER-TITLE" ? ["sickness.afterTitleStartWithinDays", "sickness.afterTitleMinDays"] : rule === "R-ELIG-AFTER-TITLE-MAT" ? ["interpretation.art30CoversParental"] : [],
      inputs: { chain: key, blockId: first.block.id, onDate: date, purpose, titleId },
      output: { insured: ok, afterTitle, titleId: usedTitle, reasonCode },
      citations: rule === "R-ELIG-AFTER-TITLE-MAT" ? C.afterTitle : rule === "UZ-7-AFTER-TITLE" ? C.sickAfterTitle : reasonCode === "TITLE_INVALIDATED" ? [...C.insuredAtEvent, ...C.sham] : C.insuredAtEvent,
    });
  }
}

/**
 * A title that ends inside a period (contract extended to the birth, B1-10 / B4-13): when the payer pays benefits,
 * it pays until the title ends and ZUS from the next day (UZ 61 ust. 1 pkt 2 lit. d).
 */
function splitAtTitleEnd(ctx: Ctx): void {
  for (const s of [...ctx.segments]) {
    const t = findTitle(ctx, s.titleId);
    const end = t?.to;
    if (s.parent !== "claimant" || !end || s.afterTitle || !(s.from <= end && end < s.to)) continue;
    if (!payerPays(t, ctx.params.payer.ownPaymentAboveInsured)) continue;
    const headDays = daysInclusive(s.from, end);
    const tail: Segment = { ...s, key: s.key + "z", from: addDays(end, 1), days: s.days - headDays, afterTitle: true };
    s.to = end;
    s.days = headDays;
    ctx.segments.splice(ctx.segments.indexOf(s) + 1, 0, tail);
  }
}
