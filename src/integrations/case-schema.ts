/**
 * Fixture schema (schemaVersion 1) for data/cases/<id>/{input,expected}.json.
 * Spec: docs/plan/02-phase-1-engine.md §6, amended by the pilot decisions (docs/plan/fixture-pilot-notes.md).
 * Every schema `satisfies z.ZodType<…>` against the engine types, so a drift in src/engine/types.ts fails typecheck.
 */
import { z } from "zod";
import type {
  AlertCode,
  ArrearsSnapshot,
  BirthEvent,
  Bps,
  CareEvent,
  Child,
  DocumentCode,
  Facts,
  FamilyEvent,
  Fraction,
  Grosze,
  InsuranceDecision,
  InsuranceTitle,
  ISODate,
  LeaveType,
  MonthRecord,
  MotherCircumstances,
  OtherParent,
  PaidBenefit,
  Payer,
  Person,
  Plan,
  PlanBlock,
  ReasonCode,
  SickNote,
  TitleEndReason,
} from "@/engine/types";

// ───────── value lists (kept in sync with the engine unions by `satisfies`) ─────────
export const REASON_CODES = [
  "NOT_INSURED_AT_EVENT", "NOT_INSURED_AT_PART_START", "NO_SICKNESS_INSURANCE_ON_TITLE",
  "TITLE_INVALIDATED", "TITLE_END_NOT_QUALIFYING", "NO_INSURANCE_SCHEME",
  "ARREARS_UNPAID", "ARREARS_RIGHT_EXPIRED", "WAITING_PERIOD", "BENEFIT_PERIOD_EXHAUSTED",
  "PARTS_LIMIT", "POOL_EXCEEDED", "EXCESS_DAYS", "MOTHER_MINIMUM_WEEKS", "RESERVED_WEEKS",
  "DEADLINE_PASSED", "CHILD_AGE_LIMIT", "FOSTER_PROFESSIONAL", "NO_LIVING_CHILD",
  "CERTIFICATE_MISSING", "TRANSITIONAL_RULE_NOT_MET", "WORK_FRACTION_TOO_HIGH", "NOT_CONTIGUOUS",
] as const satisfies readonly ReasonCode[];

export const ALERT_CODES = [
  "TITLE_LIKELY_VERIFIED", "NOT_INSURED_ON_DUE_DATE", "INSURANCE_GAP_BEFORE_PART",
  "VOLUNTARY_SICKNESS_NOT_JOINED", "BUSINESS_SUSPENDED_NEAR_DUE_DATE", "REREGISTER_AFTER_MATERNITY",
  "NO_SCHEME_ULGA_NA_START", "CONTRACT_ENDS_BEFORE_BIRTH", "ARREARS_OWN", "ARREARS_PAYER",
  "WAITING_PERIOD_NOT_MET", "RATE_DEADLINE_21_DAYS", "DAY_COUNT_MISMATCH", "PARTS_LIMIT_NEAR",
  "TOP_UP_STATEMENT_NEEDED", "LOW_BASE", "BASE_DILUTED_ART48A", "BASE_CHANGE_SCRUTINY",
  "PATERNITY_EXPIRES", "NO_PARENTAL_IN_FIRST_YEAR", "OTHER_PARENT_INFO_MISSING",
  "CERTIFICATE_TYPE", "EMPLOYER_CERTIFICATE_PENDING", "CLAIM_LIMITATION", "PARENTAL_HORIZON",
] as const satisfies readonly AlertCode[];

export const LEAVE_TYPES = [
  "sickPay", "sickness", "rehabilitation", "art30PreBirth",
  "maternity", "maternityOnAdoption", "supplementary", "parental", "paternity",
] as const satisfies readonly LeaveType[];

const TITLE_END_REASONS = [
  "fixedTermExpired", "extendedToBirth", "resignation", "mutualAgreement",
  "employerLiquidation", "employerBankruptcy", "employerDeath",
  "unlawfulTerminationJudgment", "businessClosed", "businessSuspended",
  "deregisteredBenefitConcurrence", "deregisteredOnRequest", "contractEnded", "other",
] as const satisfies readonly TitleEndReason[];

const DOCUMENT_CODES = [
  "birthAct", "stillbirthCert", "zaZyciemCert", "hospitalStayCert",
  "courtOrder", "interimCareOrder", "fosterCert", "pregnancyCert",
] as const satisfies readonly DocumentCode[];

const ROLES = ["mother", "father", "adoptive", "foster", "otherFamily"] as const;

// ───────── primitives ─────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD") satisfies z.ZodType<ISODate>;
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, "expected YYYY-MM");
const grosze = z.number().int() satisfies z.ZodType<Grosze>;
const bps = z.number().int().min(0).max(10000) satisfies z.ZodType<Bps>;
const fraction = z.object({ num: z.number().int().min(0), den: z.number().int().positive() }) satisfies z.ZodType<Fraction>;
const dateRange = z.object({ from: isoDate, to: isoDate });
const openRange = z.object({ from: isoDate, to: isoDate.optional() });

// ───────── facts ─────────
const payer = z.object({
  ref: z.string(),
  kind: z.enum(["employer", "client", "self", "businessOwner"]),
  over20Insured: z.boolean().optional(),
  insuredOn30NovPrevYear: z.number().int().min(0).optional(),
  status: z.enum(["active", "liquidation", "bankruptcy", "closed", "deceased"]).optional(),
  relatedToClaimant: z.boolean().optional(),
  sameFirmPriorContract: z.boolean().optional(),
}) satisfies z.ZodType<Payer>;

const monthRecord = z.object({
  month: yearMonth,
  contributionBase: grosze,
  employeeContributions: grosze.optional(),
  deductionBps: bps.optional(),
  daysDue: z.number().int().min(0).optional(),
  daysWorked: z.number().int().min(0).optional(),
  fixedPay: grosze.optional(),
  variablePay: grosze.optional(),
  minimumBase: grosze.optional(),
  contributionHoliday: z.boolean().optional(),
  fullMonthInsured: z.boolean().optional(),
}) satisfies z.ZodType<MonthRecord>;

const insuranceTitle = z.object({
  id: z.string(),
  kind: z.enum(["employment", "mandate", "selfEmployed", "collaborator", "childcareLeave", "maternityBenefit", "unemployed", "none"]),
  zusCode: z.string().optional(),
  from: isoDate,
  to: isoDate.optional(),
  endReason: z.enum(TITLE_END_REASONS).optional(),
  plannedEnd: z.object({ date: isoDate, reason: z.enum(TITLE_END_REASONS) }).optional(),
  sickness: z.object({ mode: z.enum(["mandatory", "voluntary", "none"]), periods: z.array(openRange) }),
  registeredOn: isoDate.optional(),
  scheme: z.enum(["standard", "preferential", "malyZusPlus", "ulgaNaStart"]).optional(),
  workTime: z.array(z.object({ from: isoDate, fraction })).optional(),
  suspensions: z.array(openRange).optional(),
  payer,
  months: z.array(monthRecord),
  annualBonuses: z.array(z.object({ year: z.number().int(), amount: grosze })).optional(),
  quarterlyBonuses: z.array(z.object({ quarter: z.string().regex(/^\d{4}-Q[1-4]$/), amount: grosze })).optional(),
  statedBenefitBase: grosze.optional(),
  priorMandatoryYears: z.number().min(0).optional(),
  graduateWithin90Days: z.boolean().optional(),
}) satisfies z.ZodType<InsuranceTitle>;

const sickNote = z.object({
  titleId: z.string(), from: isoDate, to: isoDate,
  code: z.enum(["A", "B", "C", "D", "E"]).optional(), hospital: z.boolean().optional(),
}) satisfies z.ZodType<SickNote>;

const paidBenefit = z.object({
  type: z.enum(LEAVE_TYPES), titleId: z.string().optional(), from: isoDate, to: isoDate,
  rateBps: bps.optional(), base: grosze.optional(), part: z.number().int().positive().optional(), childRef: z.string().optional(),
}) satisfies z.ZodType<PaidBenefit>;

const arrears = z
  .object({
    account: z.enum(["own", "payer"]), onDate: isoDate,
    amount: grosze.optional(), aboveThreshold: z.boolean().optional(),
    repaidOn: isoDate.optional(), instalmentAgreement: z.boolean().optional(),
  })
  .refine((a) => a.amount !== undefined || a.aboveThreshold !== undefined, "arrears: amount or aboveThreshold is required") satisfies z.ZodType<ArrearsSnapshot>;

const insuranceDecision = z.object({
  titleId: z.string(), kind: z.enum(["nonCoverage", "baseReduced"]), from: isoDate, reducedBase: grosze.optional(),
}) satisfies z.ZodType<InsuranceDecision>;

const person = z.object({
  sex: z.enum(["F", "M"]),
  birthYear: z.number().int().min(1900).max(2100).optional(),
  role: z.enum(ROLES),
  titles: z.array(insuranceTitle),
  sickNotes: z.array(sickNote),
  paidBenefits: z.array(paidBenefit),
  arrears: z.array(arrears),
  insuranceDecisions: z.array(insuranceDecision),
  flags: z.object({
    krus: z.boolean().optional(), pension: z.boolean().optional(),
    unemploymentBenefit: z.boolean().optional(), studentUnder26: z.boolean().optional(),
  }).optional(),
}) satisfies z.ZodType<Person>;

const child = z.object({
  ref: z.string(),
  bornAlive: z.boolean().optional(),
  deathDate: isoDate.optional(),
  birthDate: isoDate.optional(),
  schoolDeferred: z.boolean().optional(),
  gestationalWeek: z.number().int().min(10).max(45).optional(),
  birthWeightG: z.number().int().min(100).max(7000).optional(),
  hospitalStays: z.array(dateRange).optional(),
  zaZyciem: z.boolean().optional(),
}) satisfies z.ZodType<Child>;

const motherCircumstances = z.object({
  insuredAtBirth: z.union([z.boolean(), z.literal("krus"), z.literal("unknown")]),
  maternityUsed: z.object({ from: isoDate, to: isoDate, rateBps: bps }).optional(),
  resignedAfter: isoDate.optional(),
  hospitalStays: z.array(openRange).optional(),
  incapableOfIndependentExistenceFrom: isoDate.optional(),
  diedOn: isoDate.optional(),
  abandonedOn: isoDate.optional(),
  employedHalfTimeFrom: isoDate.optional(),
}) satisfies z.ZodType<MotherCircumstances>;

const birthEvent = z.object({
  kind: z.literal("birth"),
  expectedDate: isoDate.optional(),
  date: isoDate.optional(),
  occurred: z.boolean().optional(),
  children: z.array(child),
  pregnancyDuringEmploymentCertified: z.boolean().optional(),
  mother: motherCircumstances.optional(),
  documents: z.array(z.enum(DOCUMENT_CODES)).optional(),
}) satisfies z.ZodType<BirthEvent>;

const careEvent = z.object({
  kind: z.enum(["adoption", "foster"]),
  takenIntoCareOn: isoDate,
  petitionFiledOn: isoDate.optional(),
  interimOrderOn: isoDate.optional(),
  finalOrderOn: isoDate.optional(),
  fosterType: z.enum(["nonProfessional", "professional"]).optional(),
  children: z.array(child),
  previouslyUsedAsFoster: z.object({ leaveDays: z.number().int().min(0), parentalDays: z.number().int().min(0) }).optional(),
  documents: z.array(z.enum(DOCUMENT_CODES)).optional(),
}) satisfies z.ZodType<CareEvent>;

const familyEvent = z.union([birthEvent, careEvent]) satisfies z.ZodType<FamilyEvent>;

const otherParent = z.object({
  role: z.enum(ROLES),
  insured: z.enum(["yes", "no", "krus", "abroad", "unknown"]),
  person: person.optional(),
  estimatedBase: grosze.optional(),
  used: z.array(paidBenefit),
  declaresNonUse: dateRange.optional(),
}) satisfies z.ZodType<OtherParent>;

export const factsSchema = z.object({
  asOf: isoDate,
  parameterDate: isoDate.optional(),
  mode: z.enum(["prospective", "adjudication"]).optional(),
  claimant: person,
  otherParent: otherParent.optional(),
  event: familyEvent,
}) satisfies z.ZodType<Facts>;

const planBlock = z.object({
  id: z.string(),
  parent: z.enum(["claimant", "other"]),
  type: z.enum(LEAVE_TYPES),
  titleId: z.string().optional(),
  from: isoDate,
  days: z.number().int().positive(),
  workFraction: fraction.optional(),
  pool: z.enum(["shared", "ownNineWeeks"]).optional(),
  claimedSeparatelyOn: isoDate.optional(),
  takeover: z.enum(["afterResignation", "motherHospital", "motherIncapacity", "motherDeath", "motherAbandonment"]).optional(),
}) satisfies z.ZodType<PlanBlock>;

export const planSchema = z.object({
  rateOption: z.enum(["split100_70", "averaged81_5"]),
  applicationDate: isoDate.optional(),
  singleTitleStatement: z.boolean().optional(),
  blocks: z.array(planBlock),
}) satisfies z.ZodType<Plan>;

// ───────── case files ─────────
// The case-file interfaces live in the engine (pure, shared with compare); re-exported here for convenience.
export type { CaseExpected, CaseInput, CaseVariant, Evidence, ExpectedBenefit, ExpectedBenefitStatus, Stated, StatedEvidence } from "@/engine/case-types";
import type { CaseExpected, CaseInput, CaseVariant, ExpectedBenefit } from "@/engine/case-types";

const evidence = z.enum(["printed", "handwritten", "inferred"]);
const stated = <T extends z.ZodTypeAny>(v: T) => z.object({ value: v, evidence: z.enum(["printed", "claimed", "inferred"]) });

export const caseInputSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^B[1-6]-\d{2}$/),
  title: z.string().min(5),
  scenario: z.string().regex(/^\d+\.\d+$/),
  tags: z.array(z.string()),
  source: z.object({ pdfSha256: z.array(z.string().regex(/^[a-f0-9]{64}$/)), fileNameSha256: z.array(z.string().regex(/^[a-f0-9]{64}$/)), pages: z.number().int().min(0) }),
  facts: factsSchema,
  plan: planSchema,
  provenance: z.record(z.string(), z.object({ doc: z.string(), page: z.number().int().optional(), evidence })),
  extractionNotes: z.string().optional(),
}) satisfies z.ZodType<CaseInput>;

const expectedBenefit = z.object({
  type: z.enum(LEAVE_TYPES),
  parent: z.enum(["claimant", "other"]),
  status: z.enum(["granted", "refused", "withheld", "pending"]),
  days: stated(z.number().int().min(0)).optional(),
  from: stated(isoDate).optional(),
  to: stated(isoDate).optional(),
  rateBps: stated(bps).optional(),
  base: stated(grosze).optional(),
  daily: stated(grosze).optional(),
  payments: z.array(z.object({
    from: isoDate, to: isoDate, days: z.number().int().positive(),
    gross: stated(grosze), net: stated(grosze).optional(),
  })).optional(),
  toppedUp: stated(z.boolean()).optional(),
  paidBy: stated(z.enum(["payer", "zus"])).optional(),
}) satisfies z.ZodType<ExpectedBenefit>;

const jsonPatchOp = z.object({
  op: z.enum(["add", "remove", "replace"]),
  path: z.string().regex(/^(\/[^/]*)+$/),
  value: z.unknown().optional(),
});

const outcomeSchema = z.object({
  value: z.enum(["granted", "refused", "partial"]),
  reasonCodes: z.array(z.enum(REASON_CODES)),
  evidence: z.enum(["decision", "internalNote", "accountTitle1240", "payments", "notice", "fileLabel"]),
  reversedOnAppeal: z.boolean().optional(),
});

const expectedBase = {
  schemaVersion: z.literal(1),
  id: z.string(),
  outcome: outcomeSchema,
  benefits: z.array(expectedBenefit),
  legalBasisCited: z.array(z.string()),
  expectedAlerts: z.array(z.enum(ALERT_CODES)),
  expectedAlertsPostEvent: z.array(z.enum(ALERT_CODES)).optional(),
  tiers: z.object({ outcome: z.literal(true), duration: z.boolean(), amount: z.boolean() }),
  knownDivergence: z.object({ fields: z.array(z.string()).min(1), explanation: z.string().min(10) }).optional(),
};

const variant = z.object({
  name: z.string(),
  factsPatch: z.array(jsonPatchOp),
  planPatch: z.array(jsonPatchOp).optional(),
  expected: z.object(expectedBase).partial(),
}) satisfies z.ZodType<CaseVariant>;

export const caseExpectedSchema = z.object({ ...expectedBase, variants: z.array(variant).optional() }) satisfies z.ZodType<CaseExpected>;

/** Tiers are derived, never hand-set: true when at least one `printed` field of that kind exists. */
export function deriveTiers(expected: Pick<CaseExpected, "benefits">): CaseExpected["tiers"] {
  const relevant = expected.benefits.filter((b) => b.status !== "pending");
  // Plan 02 §6: the duration tier is asserted when `days` is printed.
  const duration = relevant.some((b) => b.days?.evidence === "printed");
  const amount = relevant.some(
    (b) =>
      [b.base, b.daily, b.rateBps].some((s) => s?.evidence === "printed") ||
      (b.payments ?? []).some((p) => p.gross.evidence === "printed" || p.net?.evidence === "printed"),
  );
  return { outcome: true, duration, amount };
}
