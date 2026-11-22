/**
 * Gating stage.
 * - Arrears (UZ art. 2a): self-employed (own account) and collaborators (the business owner's account) with
 *   contribution arrears above 1% of the minimum wage on the day the right arises get nothing until the debt is
 *   repaid in full; an instalment agreement is not repayment. Not repaid within 6 months → the right expires.
 *   Adjudication: unpaid at the decision date → refused (ARREARS_UNPAID), the ZUS practice (B6-13, B1-2);
 *   prospective: payment withheld.
 * - Waiting period (UZ art. 4) and benefit period (UZ art. 8–9) for sickness benefit and sick pay only;
 *   maternity benefit has no waiting period (digest 03 §6).
 */
import { C } from "../cite";
import { addTrace, isDeclaredBaseTitle, paramsAt, SICKNESS_TYPES, titlePath, type Ctx, type Segment } from "../context";
import { addDays, addMonths, daysInclusive } from "../dates";
import { arrearsThreshold } from "../params";
import type { ArrearsSnapshot, ISODate, ReasonCode } from "../types";
import { benefitPeriodUsedBefore, waitingPeriodEnd } from "./sickness";

/** The snapshot relevant on a date: the latest on or before it, else the earliest after it. */
export function snapshotOn(list: ArrearsSnapshot[], account: "own" | "payer", date: ISODate): ArrearsSnapshot | undefined {
  const mine = list.filter((a) => a.account === account).sort((a, b) => (a.onDate < b.onDate ? -1 : a.onDate > b.onDate ? 1 : 0));
  return mine.filter((a) => a.onDate <= date).at(-1) ?? mine.find((a) => a.onDate > date);
}

export function aboveThreshold(a: ArrearsSnapshot, threshold: number): boolean {
  if (a.amount !== undefined) return a.amount > threshold;
  return a.aboveThreshold === true;
}

export interface ArrearsVerdict {
  blocked: boolean;
  status?: "withheld" | "refused";
  reasonCode?: ReasonCode;
  account?: "own" | "payer";
  threshold: number;
  amount?: number;
  expiresOn?: ISODate;
  repaidOn?: ISODate;
}

export function arrearsVerdict(ctx: Ctx, titleId: string | undefined, rightArisesOn: ISODate): ArrearsVerdict {
  const title = ctx.facts.claimant.titles.find((t) => t.id === titleId);
  const threshold = arrearsThreshold(paramsAt(ctx, rightArisesOn));
  if (!title || !isDeclaredBaseTitle(title)) return { blocked: false, threshold };
  const account = title.kind === "collaborator" ? "payer" : "own";
  const snap = snapshotOn(ctx.facts.claimant.arrears, account, rightArisesOn);
  if (!snap || !aboveThreshold(snap, threshold)) return { blocked: false, threshold, account, amount: snap?.amount };
  const expiresOn = addMonths(rightArisesOn, ctx.params.arrears.expiryMonths);
  const repaid = snap.repaidOn && !snap.instalmentAgreement ? snap.repaidOn : undefined;
  if (repaid && repaid <= expiresOn && (ctx.mode === "prospective" || repaid <= ctx.facts.asOf)) {
    return { blocked: false, threshold, account, amount: snap.amount, expiresOn, repaidOn: repaid };
  }
  if (ctx.facts.asOf > expiresOn || (repaid && repaid > expiresOn)) {
    return { blocked: true, status: "refused", reasonCode: "ARREARS_RIGHT_EXPIRED", threshold, account, amount: snap.amount, expiresOn };
  }
  return { blocked: true, status: ctx.mode === "adjudication" ? "refused" : "withheld", reasonCode: "ARREARS_UNPAID", threshold, account, amount: snap.amount, expiresOn };
}

/** Split a segment so that a new segment starts on `at` (from < at ≤ to); returns the tail. */
function splitSegment(ctx: Ctx, s: Segment, at: ISODate): Segment {
  const headDays = daysInclusive(s.from, addDays(at, -1));
  const tail: Segment = { ...s, key: s.key + "+", from: at, days: s.days - headDays, months: [] };
  s.to = addDays(at, -1);
  s.days = headDays;
  ctx.segments.splice(ctx.segments.indexOf(s) + 1, 0, tail);
  return tail;
}

/** Give the days before `first` a status and reason; days from `first` keep theirs. */
function refuseBefore(ctx: Ctx, s: Segment, first: ISODate, reason: ReasonCode): void {
  if (s.from >= first || s.status !== "payable") return;
  if (s.to >= first) splitSegment(ctx, s, first);
  s.status = "refused";
  s.reasonCode = reason;
}

export function run(ctx: Ctx): Ctx {
  const p = ctx.params;
  // Arrears per chain (one right-arising date per chain).
  const chainsDone = new Set<string>();
  for (const s of ctx.segments) {
    if (s.parent !== "claimant" || chainsDone.has(s.chain)) continue;
    chainsDone.add(s.chain);
    const v = arrearsVerdict(ctx, s.titleId, s.rightArisesOn);
    if (v.account) {
      addTrace(ctx, "gating", "R-ELIG-ARREARS", {
        factPaths: ["facts.claimant.arrears", titlePath(ctx, s.titleId, "kind")],
        paramKeys: ["arrears.thresholdPctOfMinWageBps", "wage.minimumWage", "arrears.expiryMonths"],
        inputs: { chain: s.chain, blockId: s.block.id, rightArisesOn: s.rightArisesOn, account: v.account, amount: v.amount },
        output: { blocked: v.blocked, status: v.status, reasonCode: v.reasonCode, threshold: v.threshold, expiresOn: v.expiresOn, repaidOn: v.repaidOn },
        citations: C.arrears,
      });
    }
    if (!v.blocked) continue;
    for (const x of ctx.segments) if (x.chain === s.chain && x.status === "payable") { x.status = v.status!; x.reasonCode = v.reasonCode; }
  }

  // Sickness: waiting period.
  for (const s of [...ctx.segments].filter((x) => SICKNESS_TYPES.has(x.type) && x.parent === "claimant").sort((a, b) => (a.from < b.from ? -1 : 1))) {
    const w = waitingPeriodEnd(ctx, s.from, s.titleId);
    if (w.firstPayable && s.from < w.firstPayable && !s.afterTitle) {
      addTrace(ctx, "gating", "R-ELIG-WAIT-SICK", {
        factPaths: [titlePath(ctx, s.titleId, "sickness"), `plan.blocks[${s.blockIndex}]`],
        paramKeys: ["sickness.waitingDaysMandatory", "sickness.waitingDaysVoluntary", "sickness.bridgingGapDays"],
        inputs: { blockId: s.block.id, from: s.from, coverStart: w.coverStart },
        output: { firstPayable: w.firstPayable, waitingDays: w.waitingDays },
        citations: C.waiting,
      });
      refuseBefore(ctx, s, w.firstPayable, "WAITING_PERIOD");
    }
  }
  // Benefit period: 270 days in pregnancy (code B), 182 otherwise; sick-pay days count, waiting-period days do not.
  const earlier: { from: ISODate; to: ISODate; codeB: boolean }[] = [];
  for (const x of [...ctx.segments].filter((y) => SICKNESS_TYPES.has(y.type) && y.parent === "claimant" && y.status === "payable").sort((a, b) => (a.from < b.from ? -1 : 1))) {
    const codeB = x.rateBps === p.rates.sicknessPregnancy;
    const limit = codeB ? p.sickness.benefitPeriodPregnancyDays : p.sickness.benefitPeriodDays;
    const used = benefitPeriodUsedBefore(ctx, x.from, codeB, earlier);
    const left = limit - used;
    if (left < x.days) {
      const exhaustedFrom = addDays(x.from, Math.max(0, left));
      const refused = left > 0 ? splitSegment(ctx, x, exhaustedFrom) : x;
      refused.status = "refused";
      refused.reasonCode = "BENEFIT_PERIOD_EXHAUSTED";
      addTrace(ctx, "gating", "R-SICK-BENEFIT-PERIOD", {
        factPaths: ["facts.claimant.paidBenefits", `plan.blocks[${x.blockIndex}]`],
        paramKeys: [codeB ? "sickness.benefitPeriodPregnancyDays" : "sickness.benefitPeriodDays"],
        inputs: { blockId: x.block.id, usedBefore: used },
        output: { limit, exhaustedFrom },
        citations: C.benefitPeriod,
      });
    }
    if (left > 0) earlier.push({ from: x.from, to: x.to, codeB });
  }
  return ctx;
}
