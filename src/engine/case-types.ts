/**
 * Case-file interfaces (fixture schema v1, plan 02 §6 + pilot decisions). Pure types shared by the golden harness,
 * `compare` and the zod schemas in src/integrations/case-schema.ts.
 */
import type { AlertCode, Bps, Facts, Grosze, ISODate, LeaveType, Plan, ReasonCode } from "./types";

export type Evidence = "printed" | "handwritten" | "inferred";

export interface CaseInput {
  schemaVersion: 1;
  id: string;
  title: string;
  scenario: string;
  tags: string[];
  source: { pdfSha256: string[]; fileNameSha256: string[]; pages: number };
  facts: Facts;
  plan: Plan;
  provenance: Record<string, { doc: string; page?: number; evidence: Evidence }>;
  extractionNotes?: string;
}

/**
 * printed  = shown by ZUS (decision, notice, benefit screen, payment row) → asserted;
 * claimed  = as filed by the claimant (ZAM / Z-3), the grant evidenced only globally → reported;
 * inferred = derived by the extractor → reported.
 * Days count as `printed` when both printed endpoints determine them.
 */
export type StatedEvidence = "printed" | "claimed" | "inferred";
export interface Stated<T> { value: T; evidence: StatedEvidence }

export type ExpectedBenefitStatus = "granted" | "refused" | "withheld" | "pending";

export interface ExpectedBenefit {
  type: LeaveType;
  parent: "claimant" | "other";
  /** `pending`: filed but not decided in the file — excluded from assertions. */
  status: ExpectedBenefitStatus;
  days?: Stated<number>;
  from?: Stated<ISODate>;
  to?: Stated<ISODate>;
  rateBps?: Stated<Bps>;
  base?: Stated<Grosze>;
  daily?: Stated<Grosze>;
  payments?: { from: ISODate; to: ISODate; days: number; gross: Stated<Grosze>; net?: Stated<Grosze> }[];
  toppedUp?: Stated<boolean>;
  paidBy?: Stated<"payer" | "zus">;
}

export interface CaseExpected {
  schemaVersion: 1;
  id: string;
  outcome: {
    value: "granted" | "refused" | "partial";
    reasonCodes: ReasonCode[];
    evidence: "decision" | "internalNote" | "accountTitle1240" | "payments" | "notice" | "fileLabel";
    reversedOnAppeal?: boolean;
  };
  benefits: ExpectedBenefit[];
  legalBasisCited: string[];
  /** Alerts that must fire from pre-event data (plan 02 §8 replay). */
  expectedAlerts: AlertCode[];
  /** Alerts that must fire on the full facts, with the plan as filed or with plan = null (post-event checks the replay cannot see). */
  expectedAlertsPostEvent?: AlertCode[];
  tiers: { outcome: true; duration: boolean; amount: boolean };
  knownDivergence?: { fields: string[]; explanation: string };
  /** factsPatch / planPatch: RFC 6902 JSON Patch, paths relative to `facts` / `plan`. */
  variants?: CaseVariant[];
}

export interface CaseVariant {
  name: string;
  factsPatch: unknown;
  planPatch?: unknown;
  expected: Partial<CaseExpected>;
}

