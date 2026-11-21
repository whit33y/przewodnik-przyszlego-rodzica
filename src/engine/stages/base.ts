/**
 * Base stage (digest 02 §3.1–3.2).
 * Employees (UZ 36–45): 12 full calendar months before the month the right arose, current title only; months with
 * < ½ of the working time worked are excluded, months with ≥ ½ topped up (art. 38); only full months after a
 * working-time change (art. 40); bonuses as 1/12 (art. 41–42); first-month rule (art. 37); full-time floor (art. 45);
 * no cap. Non-employees (UZ 48–50): declared bases; Art. 48a dilution under 12 months; first-month rule (art. 49);
 * 250% cap. No recalculation when the previous benefit ended less than one calendar month earlier (art. 43).
 */
import { C } from "../cite";
import { addTrace, isDeclaredBaseTitle, paramsAt, titlePath, type Ctx, type Segment } from "../context";
import { addDays, addMonths, addYearMonths, monthStart, yearMonth, yearOf } from "../dates";
import { divRoundHalfUp, netOfDeduction, sum } from "../money";
import { afterTitleCap, employeeFloor, nonEmployeeMinBase, preferentialBase, selectParameterSet, voluntaryCap } from "../params";
import type { BaseCalculation, Grosze, InsuranceTitle, ISODate, LeaveType, MonthRecord, ParameterSet, Person } from "../types";
import { voluntaryStart } from "./insurance";

export interface BaseContext {
  person: Person;
  /** All parameter sets: per-month minimum bases use the set in force in that month. */
  sets?: ParameterSet[];
  parameterDate?: ISODate;
}

type MonthUsed = BaseCalculation["monthsUsed"][number];

function setFor(ctx: BaseContext, params: ParameterSet, date: ISODate): ParameterSet {
  if (!ctx.sets?.length) return params;
  return selectParameterSet(ctx.sets, ctx.parameterDate ?? date);
}

function deductionFor(rec: MonthRecord, gross: Grosze, p: ParameterSet): Grosze {
  if (rec.employeeContributions !== undefined) return rec.employeeContributions;
  return gross - netOfDeduction(gross, rec.deductionBps ?? p.deductions.employeeSocialBps);
}

function isFullMonth(t: InsuranceTitle, rec: MonthRecord): boolean {
  if (rec.fullMonthInsured === false) return false;
  const start = monthStart(rec.month);
  if (t.from > start) return false;
  if (t.kind !== "employment" && t.sickness.mode === "voluntary" && t.sickness.periods.length) {
    return t.sickness.periods.some((p) => voluntaryStart(t, p.from) <= start && (!p.to || p.to >= addDays(addMonths(start, 1), -1)));
  }
  return true;
}

function fractionAt(t: InsuranceTitle, date: ISODate): { num: number; den: number } | undefined {
  const wt = [...(t.workTime ?? [])].filter((w) => w.from <= date).sort((a, b) => (a.from < b.from ? -1 : 1));
  return wt.at(-1)?.fraction;
}

/** Default minimum declared base of a self-employed person in a month (Art. 48a ust. 1, 5). */
function minimumDeclaredBase(t: InsuranceTitle, rec: MonthRecord, p: ParameterSet, allAbove60: boolean): Grosze {
  if (rec.minimumBase !== undefined) return rec.minimumBase;
  if (t.scheme === "preferential" && !allAbove60) return preferentialBase(p);
  if (t.scheme === "malyZusPlus") return Math.min(rec.contributionBase, nonEmployeeMinBase(p));
  return nonEmployeeMinBase(p);
}

/** Raw base on one title (no carry-over): plan 02 §3 public API. */
export function computeBase(title: InsuranceTitle, rightArisesOn: ISODate, ctx: BaseContext, params: ParameterSet): BaseCalculation {
  if (title.statedBenefitBase !== undefined) {
    return { titleId: title.id, method: "stated", base: title.statedBenefitBase, monthsUsed: [] };
  }
  const p = params;
  const M = yearMonth(rightArisesOn);
  const windowStart = addYearMonths(M, -12);
  const reduced = ctx.person.insuranceDecisions.filter((d) => d.titleId === title.id && d.kind === "baseReduced" && d.reducedBase !== undefined && d.from <= rightArisesOn);
  const months = title.months
    .map((m) => {
      const dec = reduced.find((d) => yearMonth(d.from) <= m.month);
      return dec ? { ...m, contributionBase: dec.reducedBase! } : m;
    })
    .sort((a, b) => (a.month < b.month ? -1 : 1));
  const inWindow = months.filter((m) => m.month >= windowStart && m.month < M);

  if (title.kind === "employment" || title.kind === "childcareLeave") {
    let method: BaseCalculation["method"] = "employee12m";
    // Art. 40: a working-time change in the window or the event month → only full months after it.
    const wt = [...(title.workTime ?? [])].sort((a, b) => (a.from < b.from ? -1 : 1));
    const changes = wt.filter((w, i) => i > 0 && (w.fraction.num * wt[i - 1].fraction.den !== wt[i - 1].fraction.num * w.fraction.den) && w.from > monthStart(windowStart) && w.from <= rightArisesOn);
    const change = changes.at(-1);
    const firstMonthAfterChange = change ? (change.from.endsWith("-01") ? yearMonth(change.from) : addYearMonths(yearMonth(change.from), 1)) : undefined;
    const used: MonthUsed[] = [];
    const candidates: { rec: MonthRecord; gross: Grosze; adjusted?: "toppedUp"; lowWork: boolean }[] = [];
    for (const rec of inWindow) {
      if (!isFullMonth(title, rec)) { used.push({ month: rec.month, income: 0, adjusted: "excluded", reason: "notFullMonth" }); continue; }
      if (firstMonthAfterChange && rec.month < firstMonthAfterChange) { used.push({ month: rec.month, income: 0, adjusted: "excluded", reason: "beforeWorkTimeChange" }); continue; }
      const dw = rec.daysWorked;
      const dd = rec.daysDue;
      const partial = dw !== undefined && dd !== undefined && dw < dd;
      const lowWork = partial && dw! * 2 < dd!;
      let gross = rec.contributionBase;
      let adjusted: "toppedUp" | undefined;
      if (partial && (rec.fixedPay !== undefined || rec.variablePay !== undefined)) {
        // Top-up (art. 38 ust. 2): fixed pay at its full amount, variable pay scaled to the days due.
        gross = (rec.fixedPay ?? 0) + (rec.variablePay !== undefined && dw! > 0 ? divRoundHalfUp(rec.variablePay * dd!, dw!) : 0);
        adjusted = "toppedUp";
      }
      candidates.push({ rec, gross, adjusted, lowWork });
    }
    // Months with < ½ worked are excluded — unless every month is like that (art. 38 ust. 3).
    const allLow = candidates.length > 0 && candidates.every((c) => c.lowWork);
    const kept = candidates.filter((c) => allLow || !c.lowWork);
    for (const c of candidates) if (!allLow && c.lowWork) used.push({ month: c.rec.month, income: 0, adjusted: "excluded", reason: "lessThanHalfWorked" });
    const incomes = kept.map((c) => {
      const income = c.gross - deductionFor(c.rec, c.gross, p);
      used.push({ month: c.rec.month, income, adjusted: c.adjusted });
      return income;
    });
    let base: Grosze;
    let dataMissing = false;
    if (incomes.length > 0) {
      base = divRoundHalfUp(sum(incomes), incomes.length);
      method = change ? "employeeNewWorkTime" : incomes.length < 12 ? "employeeShort" : "employee12m";
    } else {
      // Art. 37: right in the first (incomplete) month → pay for a full month.
      method = change ? "employeeNewWorkTime" : "employeeFirstMonth";
      const rec = months.filter((m) => m.month <= M).at(-1);
      if (rec) {
        const gross = rec.fixedPay !== undefined ? rec.fixedPay + (rec.variablePay ?? 0)
          : rec.daysWorked && rec.daysDue && rec.daysWorked < rec.daysDue ? divRoundHalfUp(rec.contributionBase * rec.daysDue, rec.daysWorked) : rec.contributionBase;
        base = gross - deductionFor(rec, gross, p);
        used.push({ month: rec.month, income: base, adjusted: rec.fixedPay !== undefined ? "toppedUp" : undefined, reason: "firstMonth" });
      } else { base = 0; dataMissing = true; }
    }
    // Bonuses (art. 41–42): annual bonus for the previous year and quarterly bonuses for the last 4 quarters, as 1/12.
    const year = yearOf(rightArisesOn);
    const annual = (title.annualBonuses ?? []).filter((b) => b.year === year - 1);
    const qIdx = (q: string) => Number(q.slice(0, 4)) * 4 + Number(q.slice(6)) - 1;
    const curQ = year * 4 + Math.floor((Number(M.slice(5)) - 1) / 3);
    const quarterly = (title.quarterlyBonuses ?? []).filter((b) => qIdx(b.quarter) < curQ && qIdx(b.quarter) >= curQ - 4);
    const bonusNet = sum([...annual, ...quarterly].map((b) => netOfDeduction(b.amount, p.deductions.employeeSocialBps)));
    if (bonusNet > 0) base += divRoundHalfUp(bonusNet, 12);
    // Art. 45 floor for full-time employees (working time unknown → assumed full time).
    const f = fractionAt(title, rightArisesOn);
    const fullTime = !f || f.num >= f.den;
    let floorApplied = false;
    const floor = employeeFloor(p);
    if (p.base.employeeFloorFullTime && fullTime && title.kind === "employment" && base < floor) { base = floor; floorApplied = true; }
    used.sort((a, b) => (a.month < b.month ? -1 : 1));
    return { titleId: title.id, method, base, monthsUsed: used, floorApplied: floorApplied || undefined, dataMissing: dataMissing || undefined };
  }

  // Non-employees.
  const used: MonthUsed[] = [];
  const full = inWindow.filter((rec) => {
    const ok = isFullMonth(title, rec);
    if (!ok) used.push({ month: rec.month, income: 0, adjusted: "excluded", reason: "notFullMonth" });
    return ok;
  });
  const capFor = (rec: MonthRecord) => Math.min(rec.contributionBase, voluntaryCap(setFor(ctx, p, monthStart(rec.month))));
  let base: Grosze;
  let method: BaseCalculation["method"];
  let dataMissing = false;
  if (full.length > 0 && full.length < 12 && isDeclaredBaseTitle(title)) {
    // Art. 48a: minimum-base part averaged over n months + 1/12 of the excess over the minimum base.
    const allAbove60 = full.every((rec) => rec.contributionBase >= nonEmployeeMinBase(setFor(ctx, p, monthStart(rec.month))));
    let netMin = 0;
    let netExcess = 0;
    for (const rec of full) {
      const mp = setFor(ctx, p, monthStart(rec.month));
      const declared = capFor(rec);
      const min = Math.min(minimumDeclaredBase(title, rec, mp, allAbove60), declared);
      const nMin = netOfDeduction(min, rec.deductionBps ?? p.deductions.employeeSocialBps);
      const nEx = netOfDeduction(declared - min, rec.deductionBps ?? p.deductions.employeeSocialBps);
      netMin += nMin;
      netExcess += nEx;
      used.push({ month: rec.month, income: nMin + nEx });
    }
    base = divRoundHalfUp(netMin, full.length) + divRoundHalfUp(netExcess, 12);
    method = "nonEmployeeArt48a";
  } else if (full.length > 0) {
    const incomes = full.map((rec) => {
      const income = netOfDeduction(capFor(rec), rec.deductionBps ?? p.deductions.employeeSocialBps);
      used.push({ month: rec.month, income });
      return income;
    });
    base = divRoundHalfUp(sum(incomes), incomes.length);
    method = "nonEmployee12m";
  } else {
    // Art. 49: right before the first full month — minimum base (self-employed) or the month's contract income.
    method = "nonEmployeeFirstMonth";
    const rec = months.filter((m) => m.month <= M).at(-1);
    const insuredBeforeMonth = title.from < monthStart(M);
    if (isDeclaredBaseTitle(title) && insuredBeforeMonth && !rec) {
      // Insured for full months but no declared bases in the data: estimate with the scheme's minimum base.
      const mp = setFor(ctx, p, rightArisesOn);
      const min = title.scheme === "preferential" || title.scheme === "malyZusPlus" ? preferentialBase(mp) : nonEmployeeMinBase(mp);
      base = netOfDeduction(min, p.deductions.employeeSocialBps);
      dataMissing = true;
      used.push({ month: M, income: base, reason: "estimatedFromSchemeMinimum" });
    } else if (isDeclaredBaseTitle(title)) {
      const mp = setFor(ctx, p, rightArisesOn);
      const min = rec ? minimumDeclaredBase(title, rec, mp, false) : title.scheme === "preferential" ? preferentialBase(mp) : nonEmployeeMinBase(mp);
      base = netOfDeduction(min, p.deductions.employeeSocialBps);
      used.push({ month: M, income: base, reason: "firstMonth" });
    } else if (rec) {
      base = netOfDeduction(rec.contributionBase, rec.deductionBps ?? p.deductions.employeeSocialBps);
      used.push({ month: rec.month, income: base, reason: "firstMonth" });
    } else { base = 0; dataMissing = true; }
  }
  const cap = netOfDeduction(voluntaryCap(p), p.deductions.employeeSocialBps);
  let capApplied = false;
  if (base > cap) { base = cap; capApplied = true; }
  used.sort((a, b) => (a.month < b.month ? -1 : 1));
  return { titleId: title.id, method, base, monthsUsed: used, capApplied: capApplied || undefined, dataMissing: dataMissing || undefined };
}

interface PriorBenefit { type: LeaveType; titleId?: string; from: ISODate; to: ISODate; base?: Grosze; chainStart: ISODate }

/** Base with Art. 43 continuity: reuse the previous benefit's base when the gap is shorter than a calendar month. */
function resolveBase(ctx: Ctx, title: InsuranceTitle, date: ISODate, priors: PriorBenefit[], depth = 0): BaseCalculation {
  const memoKey = `${title.id}@${date}`;
  const memo = ctx.baseMemo.get(memoKey);
  if (memo) return memo;
  const prev = priors
    .filter((b) => (!b.titleId || b.titleId === title.id) && b.from < date && date < addMonths(addDays(b.to, 1), 1))
    .sort((a, b) => (a.to < b.to ? 1 : a.to > b.to ? -1 : 0))[0];
  // Poradnik p. 25: a working-time change between the benefits forces a recalculation.
  const wtChanged = prev && (title.workTime ?? []).some((w, i) => i > 0 && w.from > prev.from && w.from <= date);
  let calc: BaseCalculation;
  if (prev && !wtChanged && depth < 20 && title.statedBenefitBase === undefined) {
    const inner = prev.base !== undefined
      ? { titleId: title.id, method: "stated" as const, base: prev.base, monthsUsed: [] }
      : resolveBase(ctx, title, prev.chainStart, priors, depth + 1);
    calc = { ...inner, method: "carriedOver", carriedOverFrom: prev.type };
  } else {
    calc = computeBase(title, date, { person: ctx.facts.claimant, sets: ctx.sets, parameterDate: ctx.facts.parameterDate }, paramsAt(ctx, date));
  }
  ctx.baseMemo.set(memoKey, calc);
  return calc;
}

export function run(ctx: Ctx): Ctx {
  const person = ctx.facts.claimant;
  // Earlier benefits: paid ones (chain start = earliest paid benefit linked by < 1-month gaps) and this plan's chains.
  const paid = [...person.paidBenefits].sort((a, b) => (a.from < b.from ? -1 : 1));
  const priors: PriorBenefit[] = [];
  for (const b of paid) {
    const link = priors.filter((x) => (x.titleId ?? b.titleId) === (b.titleId ?? x.titleId) && b.from < addMonths(addDays(x.to, 1), 1) && x.from <= b.from).at(-1);
    priors.push({ type: b.type, titleId: b.titleId, from: b.from, to: b.to, base: b.base, chainStart: link && b.base === undefined ? link.chainStart : b.from });
  }
  const chains = new Map<string, Segment[]>();
  for (const s of ctx.segments) chains.set(s.chain, [...(chains.get(s.chain) ?? []), s]);
  const ordered = [...chains.values()].sort((a, b) => (a[0].rightArisesOn < b[0].rightArisesOn ? -1 : a[0].rightArisesOn > b[0].rightArisesOn ? 1 : 0));
  const seen = new Set<string>();

  for (const segs of ordered) {
    const first = segs[0];
    let calc: BaseCalculation | undefined;
    if (first.parent === "other") {
      const op = ctx.facts.otherParent;
      const t = op?.person?.titles.find((x) => x.id === first.titleId) ?? op?.person?.titles[0];
      if (t && op?.person) calc = computeBase(t, first.rightArisesOn, { person: op.person, sets: ctx.sets, parameterDate: ctx.facts.parameterDate }, paramsAt(ctx, first.rightArisesOn));
      else calc = { titleId: "other", method: "stated", base: op?.estimatedBase ?? 0, monthsUsed: [], dataMissing: op?.estimatedBase === undefined || undefined };
    } else {
      const title = person.titles.find((t) => t.id === first.titleId);
      if (!title) calc = { titleId: first.titleId ?? "none", method: "stated", base: 0, monthsUsed: [], dataMissing: true };
      else calc = resolveBase(ctx, title, first.rightArisesOn, priors);
    }
    const p = paramsAt(ctx, first.rightArisesOn);
    for (const s of segs) {
      s.base = calc.base;
      // Art. 46 (via art. 47): after the title ended the base is capped at the average wage.
      if (s.afterTitle && s.parent === "claimant") {
        const cap = afterTitleCap(p);
        if (s.base > cap) {
          s.base = cap;
          addTrace(ctx, "base", "R-BASE-AFTER-TITLE-CAP", { factPaths: [titlePath(ctx, s.titleId)], paramKeys: ["base.afterTitleCapPctOfForecastBps", "wage.forecastAverageWage"], inputs: { blockId: s.block.id, base: calc.base }, output: { base: cap }, citations: C.baseAfterTitleCap });
        }
      }
    }
    // This plan's earlier chains are prior benefits for later ones (sickness → maternity, Art. 30 → maternity).
    const payable = segs.filter((s) => s.status !== "refused");
    if (first.parent === "claimant" && payable.length) {
      priors.push({ type: first.type, titleId: first.titleId, from: payable[0].from, to: payable.map((s) => s.to).sort().at(-1)!, base: calc.base, chainStart: first.rightArisesOn });
    }
    const key = `${first.parent}|${calc.titleId}|${calc.method}|${calc.base}|${first.rightArisesOn}`;
    if (!seen.has(key)) { seen.add(key); ctx.bases.push(calc); }
    const method = calc.method;
    const cites = method === "carriedOver" ? C.baseNoRecalc : method === "stated" ? C.baseEmployee : method.startsWith("employee")
      ? [...C.baseEmployee, ...(method === "employeeFirstMonth" ? C.baseFirstMonth : []), ...(method === "employeeNewWorkTime" ? C.baseWorkTime : []), ...(calc.floorApplied ? C.baseFloor : []), ...C.baseMonths]
      : [...C.baseNonEmployee, ...(method === "nonEmployeeArt48a" ? C.baseArt48a : []), ...(method === "nonEmployeeFirstMonth" ? C.baseNonEmployeeFirst : [])];
    addTrace(ctx, "base", `R-BASE-${method}`, {
      factPaths: first.parent === "other" ? ["facts.otherParent"] : [titlePath(ctx, first.titleId, "months"), titlePath(ctx, first.titleId, "statedBenefitBase"), "facts.claimant.paidBenefits"],
      paramKeys: ["deductions.employeeSocialBps", ...(calc.floorApplied ? ["wage.minimumWage", "base.employeeFloorFullTime"] : []), ...(method === "nonEmployeeArt48a" || method === "nonEmployeeFirstMonth" ? ["base.nonEmployeeMinBasePctOfForecastBps", "base.preferentialBasePctOfMinWageBps", "wage.forecastAverageWage"] : []), ...(calc.capApplied ? ["base.voluntaryCapPctOfForecastBps"] : []), "base.noRecalcGapMonths"],
      inputs: { chain: first.chain, blockIds: [...new Set(segs.map((s) => s.block.id))], rightArisesOn: first.rightArisesOn, titleId: calc.titleId },
      output: { base: calc.base, method, carriedOverFrom: calc.carriedOverFrom, monthsUsed: calc.monthsUsed.length, floorApplied: !!calc.floorApplied, capApplied: !!calc.capApplied, dataMissing: !!calc.dataMissing },
      citations: cites,
    });
  }
  return ctx;
}
