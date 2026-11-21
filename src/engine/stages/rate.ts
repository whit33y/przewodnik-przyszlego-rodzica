/**
 * Rate stage (digest 02 §3.3).
 * - 81,5% for maternity + parental when the averaged option is chosen and the application is filed no later than
 *   21 days after the birth / taking into care (UZ 30a); otherwise 100% maternity, 70% parental.
 * - The other parent's 9 reserved weeks are always 70% (UZ 31 ust. 3f).
 * - Supplementary, paternity, stillbirth / loss, Art. 30 pre-birth: 100%.
 * - No parental day in the child's first year under the averaged option → parental 70%, and the maternity part
 *   may be topped up to 100% on request (UZ 31 ust. 3g, 4) — reported as an informational entitlement.
 * - Sickness: 100% in pregnancy (code B), else 80%. Combining parental with work: rate × (1 − f) via workReductionBps.
 */
import { C } from "../cite";
import { addTrace, type Ctx, type Segment } from "../context";
import { addDays, addMonths, diffDays } from "../dates";
import type { Bps, Citation } from "../types";

export function averagedEligible(ctx: Ctx): { eligible: boolean; deadline?: string; assumed: boolean } {
  const plan = ctx.plan;
  if (plan.rateOption !== "averaged81_5") return { eligible: false, assumed: false };
  const ref = ctx.ev.date ?? ctx.ev.refDate;
  const deadlineDays = ctx.ev.kind === "birth" ? ctx.params.averagedOption.deadlineDaysAfterEvent : ctx.params.adoption.averagedOptionDeadlineDays;
  const deadline = ref ? addDays(ref, deadlineDays) : undefined;
  if (!plan.applicationDate || !deadline) return { eligible: true, deadline, assumed: true };
  return { eligible: plan.applicationDate <= deadline, deadline, assumed: false };
}

function sickCode(ctx: Ctx, s: Segment): string | undefined {
  const note = ctx.facts.claimant.sickNotes.find((n) => n.from <= s.from && n.to >= s.from && (!s.titleId || n.titleId === s.titleId))
    ?? ctx.facts.claimant.sickNotes.find((n) => n.from <= s.from && n.to >= s.from);
  return note?.code;
}

export function run(ctx: Ctx): Ctx {
  const r = ctx.params.rates;
  const avg = averagedEligible(ctx);
  const firstYearEnd = ctx.ev.childBirthDate && ctx.ev.kind === "birth" ? addDays(addMonths(ctx.ev.childBirthDate, 12), -1) : ctx.ev.date ? addDays(addMonths(ctx.ev.date, 12), -1) : undefined;
  // UZ 31 ust. 3g: under the averaged option, at least one parental day must fall in the child's first year.
  const parentalSegs = ctx.segments.filter((s) => s.type === "parental" && s.parent === "claimant" && s.status !== "refused");
  const noParentalInFirstYear = avg.eligible && !!firstYearEnd && parentalSegs.length > 0 && parentalSegs.every((s) => s.from > firstYearEnd);

  for (const s of ctx.segments) {
    let rate: Bps;
    let rule: string;
    let cites: Citation[];
    let keys: string[];
    const loss = ctx.ev.loss === "total";
    switch (s.type) {
      case "maternity":
      case "maternityOnAdoption":
        if (loss) { rate = r.maternity; rule = "R-AMT-MAT100-LOSS"; cites = [...C.rate100, ...C.loss]; keys = ["rates.maternity"]; }
        else if (avg.eligible) { rate = r.averaged; rule = "R-AMT-815"; cites = C.rate815; keys = ["rates.averaged", "averagedOption.deadlineDaysAfterEvent"]; }
        else { rate = r.maternity; rule = "R-AMT-MAT100"; cites = C.rate100; keys = ["rates.maternity"]; }
        break;
      case "parental": {
        const ownNine = s.block.pool === "ownNineWeeks";
        const sharedByOther = s.parent === "other" && !ctx.params.interpretation.fatherSharedPartAtAveragedRate;
        if (ownNine) { rate = r.otherParentReserved; rule = "R-AMT-9W"; cites = C.rateNineWeeks; keys = ["rates.otherParentReserved"]; }
        else if (avg.eligible && !noParentalInFirstYear && !sharedByOther) { rate = r.averaged; rule = "R-AMT-815"; cites = C.rate815; keys = ["rates.averaged", "interpretation.fatherSharedPartAtAveragedRate"]; }
        else if (avg.eligible && noParentalInFirstYear) { rate = r.parental; rule = "R-AMT-815-1Y"; cites = C.rateFirstYear; keys = ["rates.parental"]; }
        else { rate = r.parental; rule = "R-AMT-PAR70"; cites = C.rate70; keys = ["rates.parental"]; }
        break;
      }
      case "supplementary": rate = r.supplementary; rule = "R-AMT-MAT100-SUPP"; cites = C.rate100; keys = ["rates.supplementary"]; break;
      case "paternity": rate = r.paternity; rule = "R-AMT-MAT100-PAT"; cites = C.rate100; keys = ["rates.paternity"]; break;
      case "art30PreBirth": rate = r.maternity; rule = "R-AMT-ART30"; cites = C.art30PreBirth; keys = ["rates.maternity"]; break;
      case "rehabilitation": rate = r.rehabPregnancy; rule = "R-AMT-REHAB"; cites = C.rateSickness; keys = ["rates.rehabPregnancy"]; break;
      default: {
        // Sickness / sick pay: code B → 100%; no note but a pregnant mother before the birth → 100% (assumed).
        const code = sickCode(ctx, s);
        s.sickCode = code;
        const pregnant = code === "B" || (code === undefined && ctx.facts.claimant.role === "mother" && ctx.ev.kind === "birth" && !!ctx.ev.refDate && s.to < ctx.ev.refDate);
        rate = pregnant ? r.sicknessPregnancy : r.sicknessStandard;
        rule = "R-AMT-SICK";
        cites = s.type === "sickPay" ? C.sickPay : C.rateSickness;
        keys = [pregnant ? "rates.sicknessPregnancy" : "rates.sicknessStandard"];
      }
    }
    s.rateBps = rate;
    addTrace(ctx, "rate", rule, {
      factPaths: [`plan.blocks[${s.blockIndex}]`, "plan.rateOption", "plan.applicationDate"],
      paramKeys: s.workReductionBps ? [...keys, "parental.workMaxFraction"] : keys,
      inputs: { blockId: s.block.id, segment: s.key, rateOption: ctx.plan.rateOption, applicationDate: ctx.plan.applicationDate, deadline: avg.deadline, assumedOnTime: avg.assumed },
      output: { rateBps: rate, workReductionBps: s.workReductionBps ?? 0 },
      citations: s.workReductionBps ? [...cites, ...C.parentalWork] : cites,
    });
  }

  if (noParentalInFirstYear) {
    ctx.entitlements.push({ benefit: "maternity", status: "informational", rateBps: r.maternity, citations: C.rateFirstYear });
    addTrace(ctx, "rate", "R-AMT-815-1Y-TOPUP", {
      factPaths: ["plan.blocks"],
      paramKeys: ["rates.parental", "rates.maternity"],
      inputs: { firstYearEnd },
      output: { parentalRate: r.parental, maternityTopUpTo: r.maternity, daysAfterFirstYear: firstYearEnd && parentalSegs[0] ? diffDays(firstYearEnd, parentalSegs[0].from) : 0 },
      citations: C.rateFirstYear,
    });
  }
  return ctx;
}
