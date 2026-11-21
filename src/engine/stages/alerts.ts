/**
 * Alerts stage (plan 02 §4.1; digest 03 §2 causes 1–12). Alerts are the proactive side of the refusals: each names
 * the day the problem bites, the last day to fix it and the fix. Thresholds are parameters (`titleRisk`).
 */
import { C, KP, RD, UZ } from "../cite";
import { addTrace, isDeclaredBaseTitle, isNonEmployeeTitle, paramsAt, titlePath, type Ctx } from "../context";
import { addDays, addMonths, diffDays, maxDate, minDate, within } from "../dates";
import { compareFractions } from "../money";
import { arrearsThreshold, nonEmployeeMinBase } from "../params";
import type { Alert, AlertCode, ISODate } from "../types";
import { topUpShortfalls } from "./amount";
import { aboveThreshold } from "./gating";
import { afterTitleQualifying, coverOn, insuredOnTitles, titleEnd } from "./insurance";
import { averagedEligible } from "./rate";
import { waitingPeriodEnd } from "./sickness";

export function run(ctx: Ctx): Ctx {
  const { facts, ev, lengths } = ctx;
  const p = ctx.params;
  const person = facts.claimant;
  const prospective = ctx.mode === "prospective";
  const due = ev.dueDate ?? ev.refDate;
  const isFather = person.role === "father" || (person.role !== "mother" && person.sex === "M" && ev.kind === "birth");
  const motherLike = !isFather;
  const claimantSegs = ctx.segments.filter((s) => s.parent === "claimant");
  const alerts: Alert[] = [];
  const add = (a: Omit<Alert, "values" | "citations" | "factPaths"> & Partial<Pick<Alert, "values" | "citations" | "factPaths">>) => {
    if (alerts.some((x) => x.code === a.code && x.onDate === a.onDate)) return;
    alerts.push({ values: {}, citations: [], factPaths: [], ...a });
  };

  // 1. Title likely to be verified (sham-contract risk) — a risk flag, never an eligibility "no".
  for (const [i, t] of person.titles.entries()) {
    if (t.kind !== "employment" && t.kind !== "mandate") continue;
    const signals: string[] = [];
    if (due && diffDays(t.from, due) >= 0 && t.from > addMonths(due, -p.titleRisk.newTitleMonthsBeforeDue)) signals.push("newTitle");
    const firstSick = [...person.sickNotes.filter((n) => n.titleId === t.id).map((n) => n.from), ...person.paidBenefits.filter((b) => (b.type === "sickPay" || b.type === "sickness") && (!b.titleId || b.titleId === t.id)).map((b) => b.from)].sort()[0];
    if (firstSick && firstSick >= t.from && diffDays(t.from, firstSick) < p.titleRisk.sickWithinDaysOfStart) signals.push("earlySickLeave");
    const f = t.workTime?.length ? [...t.workTime].sort((a, b) => (a.from < b.from ? -1 : 1)).at(-1)!.fraction : undefined;
    if (f && compareFractions(f, p.titleRisk.smallFraction) <= 0) signals.push("smallFraction");
    const lastBase = [...t.months].sort((a, b) => (a.month < b.month ? -1 : 1)).at(-1)?.contributionBase;
    if (f && lastBase && f.num < f.den && lastBase * f.den > 2 * paramsAt(ctx, due ?? facts.asOf).wage.minimumWage * f.num) signals.push("payOutOfProportion");
    if (t.registeredOn && diffDays(t.from, t.registeredOn) > p.titleRisk.lateRegistrationDays) signals.push("lateRegistration");
    if (t.payer.relatedToClaimant) signals.push("familyFirm");
    if (t.payer.sameFirmPriorContract) signals.push("sameFirmPriorContract");
    const otherFullTime = person.titles.some((o) => o !== t && o.kind === "employment" && (!o.workTime?.length || o.workTime.at(-1)!.fraction.num >= o.workTime.at(-1)!.fraction.den) && within(t.from, o.from, o.to));
    if (otherFullTime) signals.push("secondFullTimeJob");
    if (signals.length >= p.titleRisk.threshold) {
      add({
        code: "TITLE_LIKELY_VERIFIED", severity: "high", onDate: due,
        fix: { action: "COLLECT_PROOF_OF_WORK", byDate: facts.asOf },
        values: { titleId: t.id, score: signals.length, signals: signals.join(","), threshold: p.titleRisk.threshold, monthsWithoutIncomeMin: 2, monthsWithoutIncomeMax: 4 },
        citations: C.sham, factPaths: [`facts.claimant.titles[${i}]`],
      });
    }
  }

  // 2. Insurance on the due date (mother / adoptive parent), with the specific causes.
  if (motherLike && due && claimantSegs.some((s) => s.type === "maternity" || s.type === "maternityOnAdoption")) {
    const check = insuredOnTitles(person, due, undefined, true);
    const art30 = afterTitleQualifying(ctx, due, true);
    if (!check.insured && !check.childcare && !art30) {
      const nonEmp = person.titles.find((t) => isNonEmployeeTitle(t) && within(due, t.from, titleEnd(t, true).to));
      add({
        code: "NOT_INSURED_ON_DUE_DATE", severity: "blocking", onDate: due, deadline: addDays(due, -1),
        fix: nonEmp ? { action: "FILE_ZUA", byDate: addDays(due, -1) } : { action: "APPLY_MUNICIPAL_BENEFIT" },
        values: { reasonCode: check.reasonCode ?? "NOT_INSURED_AT_EVENT" }, citations: C.insuredAtEvent, factPaths: ["facts.claimant.titles", "facts.event"],
      });
    }
  }
  const anchor = due ?? facts.asOf;
  for (const [i, t] of person.titles.entries()) {
    const end = titleEnd(t, true).to;
    const active = within(anchor, t.from, end) || (end !== undefined && end >= facts.asOf);
    if (!active) continue;
    if (t.scheme === "ulgaNaStart") {
      add({ code: "NO_SCHEME_ULGA_NA_START", severity: "blocking", onDate: anchor, fix: { action: "FILE_ZUA", byDate: addDays(anchor, -1) }, values: { titleId: t.id }, citations: C.ulgaNaStart, factPaths: [`facts.claimant.titles[${i}].scheme`] });
      continue;
    }
    if (isNonEmployeeTitle(t) && !(t.kind === "mandate" && person.flags?.studentUnder26)) {
      const covered = t.sickness.mode !== "none" && t.sickness.periods.some((pr) => !pr.to || pr.to >= facts.asOf || (due && pr.to >= due));
      const otherCover = person.titles.some((o) => o !== t && insuredOnTitles(person, anchor, o.id, true).insured);
      if (!covered) {
        // Blocking when nothing else covers the due date; otherwise this title alone gives no benefit (B5-12).
        add({ code: "VOLUNTARY_SICKNESS_NOT_JOINED", severity: otherCover ? "high" : "blocking", onDate: anchor, fix: { action: "FILE_ZUA", byDate: maxDate(facts.asOf, addDays(anchor, -1)) }, values: { titleId: t.id, startsOnReceipt: 1 }, citations: C.voluntary, factPaths: [`facts.claimant.titles[${i}].sickness`] });
      }
    }
    // Suspension (or planned suspension) of the business near the due date.
    if (due && isDeclaredBaseTitle(t)) {
      const w = p.titleRisk.dueDateWindowDays;
      const winFrom = addDays(due, -w);
      const winTo = addDays(due, w);
      const sus = (t.suspensions ?? []).find((s) => s.from <= winTo && (!s.to || s.to >= winFrom));
      const planned = t.plannedEnd && (t.plannedEnd.reason === "businessSuspended" || t.plannedEnd.reason === "businessClosed") && t.plannedEnd.date <= winTo;
      const ended = t.to && t.endReason && (t.endReason === "businessSuspended" || t.endReason === "businessClosed") && within(t.to, winFrom, winTo);
      if (sus || planned || ended) {
        const onDate = sus ? maxDate(sus.from, winFrom) : (t.plannedEnd?.date ?? t.to)!;
        add({ code: "BUSINESS_SUSPENDED_NEAR_DUE_DATE", severity: "blocking", onDate, deadline: addDays(onDate, -1), fix: { action: "KEEP_BUSINESS_ACTIVE", byDate: addDays(onDate, -1) }, values: { titleId: t.id, windowDays: w }, citations: C.insuredAtEvent, factPaths: [`facts.claimant.titles[${i}].suspensions`] });
      }
    }
    // Contract ends before the birth for a non-qualifying reason.
    const e = titleEnd(t, true);
    if (motherLike && due && ev.kind === "birth" && e.to && e.to < due && (t.kind === "employment" || isNonEmployeeTitle(t))) {
      const art30 = afterTitleQualifying(ctx, due, true);
      const otherCover = person.titles.some((o) => o !== t && coverOn(person, o, due, true).insured);
      if ((!art30 || art30.title.id !== t.id) && !otherCover && e.reason !== "businessSuspended") {
        add({ code: "CONTRACT_ENDS_BEFORE_BIRTH", severity: "blocking", onDate: addDays(e.to, 1), deadline: e.to, values: { titleId: t.id, reason: e.reason ?? "unknown" }, citations: C.afterTitle, factPaths: [`facts.claimant.titles[${i}].to`, `facts.claimant.titles[${i}].plannedEnd`] });
      }
    }
  }

  // 3. Voluntary cover ends with the maternity benefit (title concurrence): re-register before a later separate part.
  const matSegs = claimantSegs.filter((s) => s.type === "maternity" || s.type === "maternityOnAdoption");
  const vTitle = person.titles.find((t) => isNonEmployeeTitle(t) && t.sickness.mode === "voluntary" && (matSegs.some((s) => s.titleId === t.id) || (motherLike && due && coverOn(person, t, due, true).insured)));
  if (vTitle && motherLike && ev.loss !== "total") {
    const matStart = matSegs.map((s) => s.from).sort()[0] ?? due;
    const matEnd = claimantSegs.filter((s) => s.type === "maternity" || s.type === "maternityOnAdoption" || s.type === "supplementary").map((s) => s.to).sort().at(-1) ?? (due ? addDays(due, lengths.maternityDays - 1) : undefined);
    const separatePart = claimantSegs.find((s) => s.type === "parental" && (s.block.claimedSeparatelyOn || (matEnd && s.from > addDays(matEnd, 1))));
    const gapAtPart = separatePart && !insuredOnTitles(person, separatePart.block.from, vTitle.id, prospective).insured;
    if (gapAtPart && separatePart) {
      add({ code: "INSURANCE_GAP_BEFORE_PART", severity: "high", onDate: separatePart.block.from, deadline: matEnd, fix: { action: "FILE_ZUA", byDate: matEnd }, values: { titleId: vTitle.id, partStart: separatePart.block.from }, citations: C.insuredAtEvent, factPaths: [titlePath(ctx, vTitle.id, "sickness"), `plan.blocks[${separatePart.blockIndex}]`] });
    }
    if (matStart && matEnd) {
      add({ code: "REREGISTER_AFTER_MATERNITY", severity: "high", onDate: matStart, deadline: matEnd, fix: { action: "FILE_ZUA", byDate: matEnd }, values: { titleId: vTitle.id, coverEndsOn: addDays(matStart, -1) }, citations: C.voluntary, factPaths: [titlePath(ctx, vTitle.id, "sickness")] });
    }
  }
  // Father / separately claimed parts not covered at their start.
  for (const s of claimantSegs) {
    if (s.checkPurpose !== "partStart" || s.reasonCode !== "NOT_INSURED_AT_PART_START") continue;
    add({ code: "INSURANCE_GAP_BEFORE_PART", severity: "high", onDate: s.rightArisesOn, deadline: addDays(s.rightArisesOn, -1), fix: { action: "FILE_ZUA", byDate: addDays(s.rightArisesOn, -1) }, values: { blockId: s.block.id }, citations: C.insuredAtEvent, factPaths: [`plan.blocks[${s.blockIndex}]`] });
  }

  // 4. Arrears on the own or the payer's account.
  const right = claimantSegs.map((s) => s.rightArisesOn).sort()[0] ?? due ?? facts.asOf;
  const decl = person.titles.find(isDeclaredBaseTitle);
  if (decl) {
    const account = decl.kind === "collaborator" ? "payer" : "own";
    const threshold = arrearsThreshold(paramsAt(ctx, right));
    const snap = [...person.arrears].filter((a) => a.account === account).sort((a, b) => (a.onDate < b.onDate ? -1 : 1)).at(-1);
    const repaid = snap?.repaidOn && !snap.instalmentAgreement && snap.repaidOn <= maxDate(facts.asOf, snap.onDate);
    if (snap && aboveThreshold(snap, threshold) && !repaid) {
      const deadline = addMonths(right, p.arrears.expiryMonths);
      add({ code: account === "own" ? "ARREARS_OWN" : "ARREARS_PAYER", severity: "blocking", onDate: right, deadline, fix: { action: "PAY_ARREARS", byDate: minDate(deadline, maxDate(facts.asOf, addDays(right, -1))) }, values: { amount: snap.amount ?? -1, threshold, instalmentAgreement: snap.instalmentAgreement ? 1 : 0 }, citations: C.arrears, factPaths: ["facts.claimant.arrears"] });
    }
  }

  // 5. Waiting period for sickness benefit (maternity unaffected).
  for (const n of person.sickNotes) {
    const w = waitingPeriodEnd(ctx, n.from, n.titleId);
    if (w.firstPayable && n.from < w.firstPayable) {
      add({ code: "WAITING_PERIOD_NOT_MET", severity: "warning", onDate: w.firstPayable, values: { sickFrom: n.from, waitingDays: w.waitingDays, firstPayable: w.firstPayable }, citations: C.waiting, factPaths: ["facts.claimant.sickNotes"] });
    }
  }

  // 6. 21-day rate deadline.
  const ref = ev.date ?? ev.refDate;
  if (motherLike && ref && matSegs.length && ev.loss !== "total" && (!ctx.inputPlan || !ctx.plan.applicationDate)) {
    const avg = averagedEligible(ctx);
    const deadline = avg.deadline ?? addDays(ref, p.averagedOption.deadlineDaysAfterEvent);
    add({ code: "RATE_DEADLINE_21_DAYS", severity: "warning", onDate: deadline, deadline, fix: { action: "FILE_WITHIN_21_DAYS", byDate: deadline }, values: { daysLeft: diffDays(facts.asOf, deadline) }, citations: C.rate815, factPaths: ["plan.applicationDate", "facts.event"] });
  }

  // 7. Day counts that do not match a statutory or remaining count (B1-8 "8 weeks + 3 days", B3-14 "225 days").
  for (const s of claimantSegs) {
    if (s.key !== `${s.block.id}#0`) continue;
    const b = s.block;
    const weekly = b.type === "maternity" || b.type === "parental" || b.type === "paternity" || b.type === "supplementary" || b.type === "maternityOnAdoption";
    const refusedDays = claimantSegs.filter((x) => x.block === b && x.reasonCode === "EXCESS_DAYS").reduce((a, x) => a + x.days, 0);
    const payable = b.days - refusedDays;
    if (weekly && (refusedDays > 0 || (b.days % 7 !== 0 && !(b.type === "maternity" && ev.loss === "total")))) {
      const expected = refusedDays > 0 ? payable : Math.round(b.days / 7) * 7;
      if (expected !== b.days || refusedDays > 0) {
        add({ code: "DAY_COUNT_MISMATCH", severity: "warning", onDate: b.from, fix: { action: "CORRECT_DAYS" }, values: { blockId: b.id, requested: b.days, expected }, citations: b.type === "parental" ? C.parental : C.maternityLength, factPaths: [`plan.blocks[${s.blockIndex}].days`] });
      }
    }
  }

  // 8. Parts limit near.
  const partsRefused = claimantSegs.some((s) => s.reasonCode === "PARTS_LIMIT" && s.type === "parental");
  if (ctx.pools.parentalParts.used >= p.parental.maxParts - 1 || partsRefused) {
    add({ code: "PARTS_LIMIT_NEAR", severity: partsRefused || ctx.pools.parentalParts.used >= p.parental.maxParts ? "high" : "warning", fix: { action: "MERGE_PARTS" }, values: { used: ctx.pools.parentalParts.used, max: p.parental.maxParts }, citations: C.parentalParts, factPaths: ["facts.otherParent.used", "plan.blocks"] });
  }

  // 9. Top-up needs the single-title statement.
  const shortfalls = topUpShortfalls(ctx);
  if (shortfalls.size > 0) {
    // Warning while the statement is missing; info (report any new title within 7 days) once it is filed.
    add({ code: "TOP_UP_STATEMENT_NEEDED", severity: ctx.plan.singleTitleStatement && ctx.inputPlan ? "info" : "warning", fix: { action: "ADD_SINGLE_TITLE_STATEMENT" }, values: { months: shortfalls.size, floor: p.minimumBenefit.netMonthly }, citations: C.topUp, factPaths: ["plan.singleTitleStatement"] });
  }

  // 10. Base explanations.
  for (const b of ctx.bases) {
    const t = person.titles.find((x) => x.id === b.titleId);
    if (!t) continue;
    const f = t.workTime?.length ? t.workTime.at(-1)!.fraction : undefined;
    if (t.scheme === "preferential" || t.scheme === "malyZusPlus" || (f && compareFractions(f, p.titleRisk.smallFraction) <= 0)) {
      add({ code: "LOW_BASE", severity: "info", values: { titleId: t.id, base: b.base, scheme: t.scheme ?? "employment" }, citations: C.baseNonEmployee, factPaths: [titlePath(ctx, t.id, "months")] });
    }
    if (b.method === "nonEmployeeArt48a" && b.monthsUsed.some((m) => m.income > 0)) {
      const minNet = Math.round(nonEmployeeMinBase(p) * (10000 - p.deductions.employeeSocialBps) / 10000);
      if (t.months.some((m) => m.contributionBase > nonEmployeeMinBase(paramsAt(ctx, `${m.month}-01`)))) {
        add({ code: "BASE_DILUTED_ART48A", severity: "warning", values: { titleId: t.id, base: b.base, monthsInsured: b.monthsUsed.filter((m) => !m.adjusted).length, minimumNet: minNet }, citations: C.baseArt48a, factPaths: [titlePath(ctx, t.id, "months")] });
      }
    }
  }
  if (due) {
    for (const [i, t] of person.titles.entries()) {
      const from = addMonths(due, -p.titleRisk.baseRaiseMonthsBeforeDue);
      const ms = [...t.months].filter((m) => `${m.month}-01` >= addMonths(from, -12)).sort((a, b) => (a.month < b.month ? -1 : 1));
      let raised: string | undefined;
      for (let k = 1; k < ms.length; k++) if (`${ms[k].month}-01` >= from && ms[k].contributionBase * 2 >= ms[k - 1].contributionBase * 3 && ms[k - 1].contributionBase > 0) raised = ms[k].month;
      const wt = (t.workTime ?? []).find((w, k) => k > 0 && w.from >= from && compareFractions(w.fraction, t.workTime![k - 1].fraction) > 0);
      if (raised || wt) {
        add({ code: "BASE_CHANGE_SCRUTINY", severity: "warning", onDate: due, values: { titleId: t.id, month: raised ?? wt!.from.slice(0, 7) }, citations: [...C.sham, ...C.baseWorkTime], factPaths: [`facts.claimant.titles[${i}].months`, `facts.claimant.titles[${i}].workTime`] });
      }
    }
  }

  // 11. Date-driven reminders.
  if (isFather && lengths.paternityExpiresOn && ev.loss !== "total" && ctx.pools.paternityDays.used < lengths.paternityDays && facts.asOf <= lengths.paternityExpiresOn) {
    const soon = diffDays(facts.asOf, lengths.paternityExpiresOn) <= 60;
    add({ code: "PATERNITY_EXPIRES", severity: soon ? "warning" : "info", onDate: lengths.paternityExpiresOn, deadline: lengths.paternityExpiresOn, fix: { action: "USE_PATERNITY_BEFORE", byDate: addDays(lengths.paternityExpiresOn, -(lengths.paternityDays - ctx.pools.paternityDays.used) + 1) }, values: { daysLeft: lengths.paternityDays - ctx.pools.paternityDays.used }, citations: C.paternity, factPaths: ["facts.event.date", "facts.claimant.paidBenefits"] });
  }
  if (ctx.trace.some((t) => t.ruleId === "R-AMT-815-1Y-TOPUP")) {
    add({ code: "NO_PARENTAL_IN_FIRST_YEAR", severity: "warning", onDate: ev.childBirthDate ? addMonths(ev.childBirthDate, 12) : undefined, values: {}, citations: C.rateFirstYear, factPaths: ["plan.blocks"] });
  }
  if (lengths.parentalDeadline && lengths.parentalTotal > 0 && ev.loss !== "total") {
    const left = lengths.parentalMaxClaimant - ctx.pools.parentalDays.usedByClaimant;
    if (left > 0) add({ code: "PARENTAL_HORIZON", severity: "info", onDate: lengths.parentalDeadline, deadline: lengths.parentalDeadline, values: { daysLeft: left }, citations: C.parentalParts, factPaths: ["facts.event.date"] });
  }
  // Claim limitation: a benefit period that ended more than 6 months before the application (UZ art. 67).
  const filed = ctx.plan.applicationDate ?? (ctx.inputPlan ? undefined : facts.asOf);
  if (filed) {
    for (const s of claimantSegs) {
      if (s.status === "refused" || s.type === "sickPay") continue;
      const lim = addMonths(s.to, p.claims.limitationMonths);
      if (lim < filed) add({ code: "CLAIM_LIMITATION", severity: "warning", onDate: lim, deadline: lim, values: { blockId: s.block.id }, citations: C.limitation, factPaths: [`plan.blocks[${s.blockIndex}]`] });
    }
  }

  // 12. Documents and the other parent.
  const op = facts.otherParent;
  const parentalPlanned = claimantSegs.some((s) => s.type === "parental" || s.type === "supplementary");
  if (parentalPlanned && (!op || ((op.insured === "unknown" || op.insured === "krus" || op.insured === "abroad") && !op.declaresNonUse && op.used.length === 0))) {
    add({ code: "OTHER_PARENT_INFO_MISSING", severity: "warning", fix: { action: "ADD_OTHER_PARENT_STATEMENT" }, values: { insured: op?.insured ?? "unknown" }, citations: [RD("§ 29–32")], factPaths: ["facts.otherParent"] });
  }
  if (ev.kind === "birth" && facts.event.kind === "birth") {
    const docs = facts.event.documents ?? [];
    const need: [boolean, string, string][] = [
      [ev.zaZyciem, "zaZyciemCert", "zaZyciem"],
      [claimantSegs.some((s) => s.type === "supplementary") || lengths.supplementaryWeeks > 0, "hospitalStayCert", "hospitalStay"],
      [ev.loss === "total", docs.includes("birthAct") ? "birthAct" : "stillbirthCert", "stillbirth"],
    ];
    // Guidance on the exact certificate to ask for; info once the right document is on file (B1-3, B2-1).
    for (const [cond, doc, kind] of need) {
      if (cond) add({ code: "CERTIFICATE_TYPE", severity: docs.includes(doc as never) ? "info" : "warning", fix: { action: "ASK_DOCTOR_FOR_CERTIFICATE" }, values: { document: doc, kind }, citations: kind === "zaZyciem" ? [UZ("61b ust. 4a"), KP("182¹a § 2")] : kind === "hospitalStay" ? C.supplementary : [RD("§ 13 ust. 1 pkt 2")], factPaths: ["facts.event.documents"] });
    }
  }

  alerts.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity] || (a.onDate ?? "").localeCompare(b.onDate ?? "") || a.code.localeCompare(b.code));
  ctx.alerts = alerts;
  addTrace(ctx, "alerts", "ALERTS", {
    factPaths: [...new Set(alerts.flatMap((a) => a.factPaths))],
    paramKeys: ["titleRisk.threshold", "titleRisk.newTitleMonthsBeforeDue", "titleRisk.sickWithinDaysOfStart", "titleRisk.dueDateWindowDays", "arrears.thresholdPctOfMinWageBps"],
    inputs: { asOf: facts.asOf, mode: ctx.mode },
    output: alerts.map((a) => ({ code: a.code, severity: a.severity, onDate: a.onDate })) as { code: AlertCode; severity: string; onDate?: ISODate }[],
    citations: [],
  });
  return ctx;
}

export const SEVERITY: Record<Alert["severity"], number> = { info: 0, warning: 1, high: 2, blocking: 3 };
