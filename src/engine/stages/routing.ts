/**
 * Routing stage (R-PAY-1, digest 02 §4.1–4.4, §5).
 * Benefit payer: the contribution payer when it reported more than 20 sickness-insured persons (Z-3 checkbox or the
 * count on 30 November of the previous year); ZUS otherwise, and always for the self-employed, collaborators and
 * benefits after the title ended. Employer sick pay is always paid by the employer.
 * Also the document list (RD/RW) and dated deadlines.
 */
import { C, KP, RD, RW, UZ } from "../cite";
import { addTrace, findTitle, isDeclaredBaseTitle, MATERNITY_TYPES, type Ctx, type Segment } from "../context";
import { addDays, addMonths } from "../dates";
import type { Citation, DocumentRequirement, InsuranceTitle, ISODate } from "../types";

/** Z-3b was abolished on 24.10.2026 (TASK fn. 5). */
const Z3B_ABOLISHED_FROM = "2026-10-24";

export function payerPays(t: InsuranceTitle | undefined, ownPaymentAbove: number): boolean {
  if (!t || isDeclaredBaseTitle(t)) return false;
  if (t.payer.kind === "self" || t.payer.kind === "businessOwner") return false;
  if (t.payer.over20Insured !== undefined) return t.payer.over20Insured;
  return (t.payer.insuredOn30NovPrevYear ?? 0) > ownPaymentAbove;
}

function paidByFor(ctx: Ctx, s: Segment): "payer" | "zus" {
  if (s.parent === "other") return "zus";
  const t = findTitle(ctx, s.titleId);
  if (s.type === "sickPay") return "payer";
  if (s.afterTitle || s.type === "art30PreBirth") return "zus";
  return payerPays(t, ctx.params.payer.ownPaymentAboveInsured) ? "payer" : "zus";
}

export function run(ctx: Ctx): Ctx {
  const person = ctx.facts.claimant;
  const { ev } = ctx;
  for (const s of ctx.segments) s.paidBy = paidByFor(ctx, s);

  const claimantSegs = ctx.segments.filter((s) => s.parent === "claimant");
  const mainSeg = claimantSegs.find((s) => MATERNITY_TYPES.has(s.type) || s.type === "art30PreBirth") ?? claimantSegs[0];
  const mainTitle = findTitle(ctx, mainSeg?.titleId) ?? person.titles[0];
  const benefitPayer: "payer" | "zus" = mainSeg ? (mainSeg.type === "sickPay" ? "payer" : mainSeg.paidBy) : payerPays(mainTitle, ctx.params.payer.ownPaymentAboveInsured) ? "payer" : "zus";
  const isEmployee = mainTitle?.kind === "employment" && !(mainSeg?.afterTitle);
  const isMandate = mainTitle?.kind === "mandate";
  const fileWith: "employer" | "zus" = isEmployee || (isMandate && mainTitle.payer.kind !== "self") ? "employer" : "zus";
  ctx.routing = {
    benefitPayer,
    fileWith,
    channel: fileWith === "employer" ? ["employerAny"] : ["pue", "paper"],
    payerForwardsWithinDays: fileWith === "employer" && benefitPayer === "zus" ? ctx.params.payer.forwardWithinDays : undefined,
    citations: [...C.payer, ...(fileWith === "employer" && benefitPayer === "zus" ? C.forwarding : [])],
  };
  addTrace(ctx, "routing", "R-PAY-1", {
    factPaths: [mainTitle ? `facts.claimant.titles[${person.titles.indexOf(mainTitle)}].payer` : "facts.claimant.titles"],
    paramKeys: ["payer.ownPaymentAboveInsured", "payer.forwardWithinDays"],
    inputs: { titleKind: mainTitle?.kind, over20Insured: mainTitle?.payer.over20Insured, insuredOn30Nov: mainTitle?.payer.insuredOn30NovPrevYear, afterTitle: mainSeg?.afterTitle ?? false },
    output: ctx.routing,
    citations: ctx.routing.citations,
  });

  // ── documents ──
  const docs: DocumentRequirement[] = [];
  const to = fileWith;
  const add = (code: string, providedBy: DocumentRequirement["providedBy"], citations: Citation[], extra: Partial<DocumentRequirement> = {}) => {
    if (!docs.some((d) => d.code === code)) docs.push({ code, providedBy, to: extra.to ?? to, citations, ...extra });
  };
  const types = new Set(claimantSegs.map((s) => s.type));
  const hasMaternityType = [...types].some((t) => MATERNITY_TYPES.has(t));
  const zusPays = benefitPayer === "zus";
  const employeeLeave = mainTitle?.kind === "employment" && !mainSeg?.afterTitle;
  const birthEvent = ctx.facts.event.kind === "birth" ? ctx.facts.event : undefined;
  if (hasMaternityType) add("ZAM", "claimant", [RD("§ 13"), UZ("61b")]);
  if (types.has("art30PreBirth")) {
    add("ZAS-55", "claimant", C.art30PreBirth, { to: "zus" });
    add("WORK_CERTIFICATE", "employer", [RD("§ 15")], { to: "zus" });
    add("CERT_PREGNANCY_DURING_EMPLOYMENT", "doctor", [RD("§ 15")], { to: "zus" });
  }
  if (claimantSegs.some((s) => s.afterTitle && MATERNITY_TYPES.has(s.type))) add("CERT_PREGNANCY_DURING_EMPLOYMENT", "doctor", [RD("§ 15")], { to: "zus" });
  if (zusPays && mainTitle?.kind === "employment") add("Z-3", "employer", [RD("§ 3")], { to: "zus" });
  if (zusPays && mainTitle?.kind === "mandate") add("Z-3a", "employer", [RD("§ 3")], { to: "zus" });
  if (mainTitle && isDeclaredBaseTitle(mainTitle) && ctx.facts.asOf < Z3B_ABOLISHED_FROM) add("Z-3b", "claimant", [RD("§ 3")], { to: "zus" });
  if (types.has("sickness") && mainTitle && isDeclaredBaseTitle(mainTitle)) add("ZAS-53", "claimant", [RD("§ 2")], { to: "zus" });
  if (types.has("sickness") || types.has("sickPay")) add("E-ZLA", "system", C.rateSickness, { obtainableFromRegistry: true });
  if (birthEvent && ev.loss === "total") {
    const act = birthEvent.documents?.includes("birthAct");
    add(act ? "BIRTH_ACT_STILLBORN" : "CERT_STILLBIRTH", act ? "system" : "doctor", [RD("§ 13 ust. 1 pkt 2")], { obtainableFromRegistry: act && zusPays });
    add("Z-12", "claimant", [UZ("pogrzebowy")], { to: "zus" });
  } else if (birthEvent && hasMaternityType) {
    // RD §13 ust. 2–4: ZUS fetches the birth certificate itself; an employer paying the benefit needs a copy.
    add("BIRTH_ACT", zusPays ? "system" : "claimant", [RD("§ 13 ust. 2–4")], { obtainableFromRegistry: zusPays });
  }
  if (claimantSegs.some((s) => s.type === "maternity" && ev.date && s.from < ev.date) || (ev.dueDate && !ev.date && types.has("maternity"))) {
    add("CERT_DUE_DATE", "doctor", [RD("§ 13 ust. 1 pkt 1")]);
  }
  if (types.has("supplementary")) {
    add("CERT_HOSPITAL_STAY", "doctor", [KP("180² § 5"), RD("§ 26–27")]);
    add("OTHER_PARENT_STATEMENT_SUPPLEMENTARY", "otherParent", [RW("§ 14"), RD("§ 26")]);
  }
  if (types.has("parental")) {
    add("OTHER_PARENT_STATEMENT_PARENTAL", "otherParent", [RD("§ 29–30"), RW("§ 15")]);
    if (ev.zaZyciem) add("ZA_ZYCIEM_STATEMENT", "claimant", [RD("§ 29"), UZ("61b ust. 4a")]);
    if (claimantSegs.some((s) => s.block.workFraction)) add("EMPLOYER_CERT_WORK_COMBINATION", "employer", [RD("§ 30"), RW("§ 16")], { to: "zus" });
  }
  if (types.has("paternity")) add("PATERNITY_STATEMENT", "claimant", [RD("§ 33"), RW("§ 17")]);
  if (ctx.facts.event.kind === "adoption") { add("ZAS-26", "claimant", [RD("§ 16 ust. 1")]); add("COURT_PETITION_CERT", "court", [RD("§ 16 ust. 1"), RW("§ 18")]); }
  if (ctx.facts.event.kind === "foster") add("FOSTER_PLACEMENT_ORDER", "court", [RD("§ 16 ust. 2"), RW("§ 18")]);
  if (claimantSegs.some((s) => s.block.takeover)) add("MOTHER_STATEMENT_TAKEOVER", "otherParent", [RD("§ 18–25"), RW("§ 3–13")]);
  if (ctx.plan.singleTitleStatement || claimantSegs.some((s) => s.months.some((m) => m.topUp > 0))) add("SINGLE_TITLE_STATEMENT", "claimant", [RD("§ 28"), ...C.topUp]);
  if (employeeLeave) {
    if (types.has("maternity") || types.has("maternityOnAdoption")) add("LEAVE_APP_MATERNITY", "claimant", [RW("§ 2")], { to: "employer" });
    if (types.has("supplementary")) add("LEAVE_APP_SUPPLEMENTARY", "claimant", [RW("§ 14")], { to: "employer" });
    if (types.has("parental")) add("LEAVE_APP_PARENTAL", "claimant", [RW("§ 15")], { to: "employer" });
    if (types.has("paternity")) add("LEAVE_APP_PATERNITY", "claimant", [RW("§ 17")], { to: "employer" });
  }
  ctx.documents = docs;

  // ── deadlines ──
  const dl = ctx.deadlines;
  const pushDl = (code: string, date: ISODate | undefined, hard: boolean, citations: Citation[], blockId?: string) => {
    if (date && !dl.some((d) => d.code === code && d.blockId === blockId)) dl.push({ code, date, hard, citations, blockId });
  };
  const ref = ev.date ?? ev.dueDate;
  const isMotherLike = person.role !== "father";
  if (ref && hasMaternityType && isMotherLike) pushDl("RATE_OPTION_21_DAYS", addDays(ref, ev.kind === "birth" ? ctx.params.averagedOption.deadlineDaysAfterEvent : ctx.params.adoption.averagedOptionDeadlineDays), true, C.rate815);
  const firstBlock = new Map<string, Segment>();
  for (const s of claimantSegs) if (!firstBlock.has(s.block.id)) firstBlock.set(s.block.id, s);
  for (const s of firstBlock.values()) {
    if (s.type === "parental" && employeeLeave) pushDl("PARENTAL_APPLICATION", addDays(s.block.from, -ctx.params.parental.applicationLeadDays), false, [KP("182¹d § 1")], s.block.id);
    if (s.type === "paternity" && employeeLeave) pushDl("PATERNITY_APPLICATION", addDays(s.block.from, -ctx.params.paternity.applicationLeadDays), false, [KP("182³ § 2")], s.block.id);
    if (s.type === "supplementary") {
      const matEnd = claimantSegs.filter((x) => x.type === "maternity").map((x) => x.to).sort().at(-1);
      pushDl("SUPPLEMENTARY_APPLICATION", matEnd ? addDays(matEnd, -ctx.params.supplementary.applicationLeadDays) : undefined, false, [KP("180² § 4")], s.block.id);
    }
    const last = claimantSegs.filter((x) => x.block.id === s.block.id).map((x) => x.to).sort().at(-1);
    if (last && s.type !== "sickPay") pushDl("CLAIM_LIMITATION", addMonths(last, ctx.params.claims.limitationMonths), true, C.limitation, s.block.id);
  }
  if (types.has("paternity") || person.role === "father") pushDl("PATERNITY_EXPIRY", ctx.lengths.paternityExpiresOn, true, C.paternity);
  if (ctx.lengths.parentalDeadline && ctx.lengths.parentalTotal > 0) pushDl("PARENTAL_HORIZON", ctx.lengths.parentalDeadline, true, C.parentalParts);
  dl.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.code.localeCompare(b.code)));
  return ctx;
}
