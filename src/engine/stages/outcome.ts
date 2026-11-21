/**
 * Outcome stage: roll the claimant's periods up to granted / refused / partial / withheld with reason codes, and
 * list the entitlements (maternity-type benefits, funeral grant, municipal parental benefit).
 */
import { C } from "../cite";
import { addTrace, MATERNITY_TYPES, type Ctx } from "../context";
import type { Entitlement, LeaveType, ReasonCode, Result } from "../types";

export function run(ctx: Ctx): Ctx {
  const segs = ctx.segments.filter((s) => s.parent === "claimant");
  const payable = segs.filter((s) => s.status === "payable");
  const withheld = segs.filter((s) => s.status === "withheld");
  const refused = segs.filter((s) => s.status === "refused");
  const codes = new Set<ReasonCode>();
  for (const s of [...refused, ...withheld]) if (s.reasonCode) codes.add(s.reasonCode);
  // An expired right (art. 2a ust. 2) is also an unpaid debt.
  if (codes.has("ARREARS_RIGHT_EXPIRED")) codes.add("ARREARS_UNPAID");
  // Insurance failures carry both the specific and the general code (e.g. TITLE_INVALIDATED + NOT_INSURED_AT_EVENT).
  for (const c of ctx.insurance) {
    if (c.insured || !c.reasonCode) continue;
    if (!segs.some((s) => s.rightArisesOn === c.onDate && s.status === "refused")) continue;
    codes.add(c.reasonCode);
    codes.add(c.purpose === "partStart" ? "NOT_INSURED_AT_PART_START" : "NOT_INSURED_AT_EVENT");
  }
  let value: Result["outcome"]["value"];
  if (segs.length === 0) {
    value = "refused";
    if (ctx.ev.careRefusal) codes.add(ctx.ev.careRefusal);
    else if (ctx.insurance.some((c) => !c.insured && c.reasonCode)) for (const c of ctx.insurance) if (c.reasonCode) codes.add(c.reasonCode);
    else codes.add("NOT_INSURED_AT_EVENT");
  } else if (payable.length === segs.length) value = "granted";
  else if (payable.length === 0 && withheld.length > 0 && refused.length === 0) value = "withheld";
  else if (payable.length === 0) value = "refused";
  else value = "partial";
  const reasonCodes = [...codes].sort();

  // Entitlements per benefit type.
  const ents: Entitlement[] = [...ctx.entitlements];
  const byType = new Map<LeaveType, typeof segs>();
  for (const s of segs) byType.set(s.type, [...(byType.get(s.type) ?? []), s]);
  const maxDays: Partial<Record<LeaveType, number>> = {
    maternity: ctx.lengths.maternityDays, maternityOnAdoption: ctx.lengths.maternityDays,
    supplementary: ctx.lengths.supplementaryWeeks * 7, parental: ctx.lengths.parentalMaxClaimant, paternity: ctx.lengths.paternityDays,
  };
  for (const [type, list] of [...byType.entries()].sort()) {
    const pay = list.filter((s) => s.status === "payable").length;
    const wh = list.filter((s) => s.status === "withheld").length;
    const status: Entitlement["status"] = pay === list.length ? "granted" : pay > 0 ? "partial" : wh > 0 ? "withheld" : "refused";
    ents.push({ benefit: type, status, reasonCode: list.find((s) => s.reasonCode)?.reasonCode, maxDays: maxDays[type], rateBps: list[0].rateBps, citations: MATERNITY_TYPES.has(type) ? C.maternityLength : C.rateSickness });
  }
  if (ctx.ev.loss === "total") {
    ents.push({ benefit: "funeralGrant", status: "informational", citations: [{ act: "RD", article: "§ 13 ust. 1 pkt 2" }] });
    ents.push({ benefit: "parental", status: "notApplicable", reasonCode: "NO_LIVING_CHILD", citations: C.loss });
  }
  const noMaternityRight = segs.length > 0 && segs.filter((s) => MATERNITY_TYPES.has(s.type)).every((s) => s.status === "refused" && (s.reasonCode?.startsWith("NOT_INSURED") || s.reasonCode === "NO_SICKNESS_INSURANCE_ON_TITLE" || s.reasonCode === "NO_INSURANCE_SCHEME" || s.reasonCode === "TITLE_INVALIDATED"));
  if (noMaternityRight && segs.some((s) => MATERNITY_TYPES.has(s.type))) {
    ents.push({ benefit: "parentalBenefitMunicipal", status: "informational", citations: [{ act: "UZ", article: "31 ust. 3a" }] });
  }
  ctx.entitlements = ents;

  addTrace(ctx, "outcome", "OUTCOME", {
    factPaths: ["plan.blocks"],
    inputs: { payable: payable.length, withheld: withheld.length, refused: refused.length },
    output: { value, reasonCodes },
  });
  ctx.outcome = { value, reasonCodes };
  return ctx;
}
