/**
 * Simulated state-registry integrations. Payloads are typed slices of the engine's Facts:
 * the assembler merges them, and a sample case can be split back into "systems" mechanically.
 * Spec: docs/plan/03-phase-2-data-layer.md §1.
 */
import type {
  ArrearsSnapshot,
  BirthEvent,
  CareEvent,
  Child,
  Grosze,
  InsuranceDecision,
  InsuranceTitle,
  ISODate,
  OtherParent,
  PaidBenefit,
  Payer,
  Person,
  Plan,
  Role,
  SickNote,
  TitleEndReason,
} from "@/engine/types";

export type SourceId =
  | "mobywatel"
  | "zus-konto"
  | "zus-platnik"
  | "zus-saldo"
  | "zus-ezla"
  | "zus-swiadczenia"
  | "zus-postepowania"
  | "ceidg"
  | "krs"
  | "rsc"
  | "ezdrowie"
  | "user"
  | "sprawa";

export type SystemId = Exclude<SourceId, "user" | "sprawa">;

export interface Sourced<T> {
  value: T;
  source: SourceId;
  asOf: ISODate;
  fetchedAt: string;
}

export interface SystemPayloads {
  mobywatel: { displayName: string; sex: "F" | "M"; birthYear?: number };
  "zus-konto": { role?: Role; titles: Omit<InsuranceTitle, "suspensions">[]; flags?: Person["flags"] };
  "zus-platnik": { payers: Pick<Payer, "ref" | "insuredOn30NovPrevYear" | "over20Insured" | "relatedToClaimant" | "sameFirmPriorContract">[] };
  "zus-saldo": { arrears: ArrearsSnapshot[] };
  "zus-ezla": { sickNotes: SickNote[] };
  "zus-swiadczenia": { paidBenefits: PaidBenefit[]; otherParentUsed?: PaidBenefit[] };
  "zus-postepowania": { insuranceDecisions: InsuranceDecision[] };
  ceidg: { suspensions: { titleId: string; from: ISODate; to?: ISODate }[] };
  krs: { payerStatus: { ref: string; status: NonNullable<Payer["status"]> }[] };
  rsc: {
    event?: { kind: "birth"; date?: ISODate; occurred?: boolean; children: Pick<Child, "ref" | "bornAlive" | "deathDate">[] } | ({ kind: "adoption" | "foster" } & Pick<CareEvent, "takenIntoCareOn" | "finalOrderOn" | "interimOrderOn"> & { children: Pick<Child, "ref" | "birthDate">[] });
    otherParentKnown: boolean;
  };
  /** e-zdrowie (P1). `pregnancy` = the pregnancy card before the birth: number of babies expected, "Za życiem" certificate. */
  ezdrowie: { expectedDate?: ISODate; pregnancy?: { expectedChildren: number; zaZyciem: boolean }; children?: Pick<Child, "ref" | "gestationalWeek" | "birthWeightG" | "hospitalStays" | "zaZyciem">[] };
}

export type Answers = {
  expectedDate?: ISODate;
  childrenCount?: number;
  zaZyciem?: boolean;
  eventKind?: "birth" | "adoption" | "foster";
  care?: Partial<Pick<CareEvent, "takenIntoCareOn" | "fosterType" | "petitionFiledOn">> & { childBirthDate?: ISODate; schoolDeferred?: boolean };
  plannedEnd?: { titleId: string; date: ISODate; reason: TitleEndReason } | null;
  /** Self-declared arrears when the contribution-settlement registry (ZUS – saldo) was not read. */
  arrears?: boolean;
  /** `estimatedGross`: the other parent's monthly gross pay; the assembler applies the parameter set's deduction. */
  otherParent?: { mode: "consent" | "estimate" | "none"; insured?: OtherParent["insured"]; estimatedGross?: Grosze; role?: Role };
  /** Planner what-if: hospital stay after birth, applied only while no registry knows the child's details. */
  whatIf?: { hospital?: { category: "none" | "preterm" | "extreme" | "term"; days: number } };
  /** Manual mode only: facts a logged-out user types in. */
  manual?: ManualFacts;
  /** The claim as filed (case mode) or the user's saved plan. */
  plan?: Plan;
  /** Case mode: preserved non-system parts of the fixture so the case round-trips exactly. */
  caseExtras?: CaseExtras;
};

export interface ManualFacts {
  role: Role;
  sex: "F" | "M";
  work: "employment" | "mandate" | "selfEmployed" | "none";
  since: ISODate;
  fraction?: { num: number; den: number };
  monthlyGross?: Grosze;
  sicknessInsurance: "mandatory" | "voluntary" | "none";
  arrears?: boolean;
  over20Insured?: boolean;
}

/** Fixture fields no registry owns (event circumstances, mother's situation, other parent's statements). */
export interface CaseExtras {
  parameterDate?: ISODate;
  mode?: "prospective" | "adjudication";
  event?: Partial<BirthEvent> | Partial<CareEvent>;
  otherParent?: OtherParent;
  claimantRole?: Role;
}

export interface PersonaFile {
  id: string;
  label: string;
  oneLiner: string;
  journey: "pregnant" | "planning" | "father" | "selfEmployed" | "adoption" | "loss";
  asOf: ISODate;
  systems: Partial<SystemPayloads>;
  unavailable?: SystemId[];
  presetAnswers?: Partial<Answers>;
  otherParent?: { consented: boolean; insured: OtherParent["insured"]; role: Role; systems: Partial<SystemPayloads> };
}
