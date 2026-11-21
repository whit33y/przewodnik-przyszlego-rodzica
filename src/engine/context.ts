/**
 * Internal evaluation state threaded through the stages (plan 02 §4). Each stage reads what earlier stages
 * produced and pushes trace steps. Nothing here leaves the engine except through `Result`.
 */
import { selectParameterSet } from "./params";
import type {
  Alert, BaseCalculation, Bps, Citation, Deadline, DocumentRequirement, Entitlement, Facts, Grosze, InsuranceCheck,
  InsuranceTitle, ISODate, LeaveType, ParameterSet, Period, Plan, PlanBlock, PoolState, ReasonCode, Result, Routing, Stage,
  TraceStep, Violation,
} from "./types";

export type Mode = "prospective" | "adjudication";

export interface EventInfo {
  kind: "birth" | "adoption" | "foster";
  /** Actual event date (birth / taken into care), when known. */
  date?: ISODate;
  /** Expected date of birth, falling back to the actual date. */
  dueDate?: ISODate;
  /** date ?? dueDate: the date plans and checks are anchored to. */
  refDate?: ISODate;
  happened: boolean;
  childrenCount: number;
  liveCount: number;
  /** 'total': no child survived (stillbirth / death before 8 weeks); 'partial': mixed multiples. */
  loss: "none" | "total" | "partial";
  /** Earliest allowed end of post-loss maternity (7 days from the latest death, KP 180¹). */
  lossMinEnd?: ISODate;
  /** Late death (after 8 weeks): every benefit ends 7 days after the death. */
  lateDeathEnd?: ISODate;
  zaZyciem: boolean;
  multiple: boolean;
  /** Birth date of the child (care events: the youngest child's birth date). */
  childBirthDate?: ISODate;
  /** Care events: last day of the age limit (day before the 7th/10th/14th birthday). */
  ageLimitEnd?: ISODate;
  careRefusal?: ReasonCode;
}

export interface Lengths {
  maternityDays: number;
  motherMandatoryDays: number;
  motherMandatorySpecialDays: number;
  preBirthMaxDays: number;
  supplementaryWeeks: number;
  supplementaryCap: 0 | 8 | 15;
  supplementaryRefusal?: ReasonCode;
  parentalTotal: number;
  reservedPerParent: number;
  /** Max parental days per parent (the other parent's reserved 9 weeks excluded unless released by the flag). */
  parentalMaxClaimant: number;
  parentalMaxOther: number;
  parentalCalendarCap: number;
  paternityDays: number;
  paternityExpiresOn?: ISODate;
  parentalDeadline?: ISODate;
  reducedAdoptionCase: boolean;
}

/** A plan block after allocation; a block may be split into several segments (payable + refused surplus). */
export interface Segment {
  key: string;                       // stable id: `${blockId}#${n}`
  block: PlanBlock;
  blockIndex: number;                // index in the original plan (for fact paths)
  parent: "claimant" | "other";
  type: LeaveType;
  from: ISODate;
  to: ISODate;
  days: number;
  status: "payable" | "withheld" | "refused";
  reasonCode?: ReasonCode;
  /** Chain key: blocks under one right-arising date share insurance check and base. */
  chain: string;
  rightArisesOn: ISODate;
  /** Insurance purpose of the chain's check. */
  checkPurpose: "event" | "partStart" | "sickness";
  titleId?: string;
  afterTitle: boolean;
  base: Grosze;
  rateBps: Bps;
  workReductionBps?: Bps;
  daily: Grosze;
  gross: Grosze;
  months: Period["months"];
  paidBy: "payer" | "zus";
  sickCode?: string;
}

export interface Ctx {
  facts: Facts;
  inputPlan: Plan | null;
  plan: Plan;                        // the plan actually evaluated (input or default)
  sets: ParameterSet[];
  params: ParameterSet;              // primary set (parameterDate ?? right-arising date)
  mode: Mode;
  ev: EventInfo;
  lengths: Lengths;
  insurance: InsuranceCheck[];
  entitlements: Entitlement[];
  segments: Segment[];
  bases: BaseCalculation[];
  pools: PoolState;
  routing: Routing;
  documents: DocumentRequirement[];
  deadlines: Deadline[];
  alerts: Alert[];
  violations: Violation[];
  trace: TraceStep[];
  outcome?: Result["outcome"];
  /** Base results keyed by `${titleId}@${date}` (memo for carry-over chains). */
  baseMemo: Map<string, BaseCalculation>;
}

export function paramsAt(ctx: Pick<Ctx, "sets" | "facts">, date: ISODate): ParameterSet {
  return selectParameterSet(ctx.sets, ctx.facts.parameterDate ?? date);
}

export function addTrace(
  ctx: Pick<Ctx, "trace">,
  stage: Stage,
  ruleId: string,
  step: { factPaths?: string[]; paramKeys?: string[]; inputs?: Record<string, unknown>; output?: unknown; citations?: Citation[] },
): void {
  ctx.trace.push({
    stage,
    ruleId,
    factPaths: step.factPaths ?? [],
    paramKeys: step.paramKeys ?? [],
    inputs: step.inputs ?? {},
    output: step.output ?? null,
    citations: step.citations ?? [],
  });
}

export function titleIndex(ctx: Pick<Ctx, "facts">, titleId: string | undefined): number {
  return ctx.facts.claimant.titles.findIndex((t) => t.id === titleId);
}

export function titlePath(ctx: Pick<Ctx, "facts">, titleId: string | undefined, field = ""): string {
  const i = titleIndex(ctx, titleId);
  return i < 0 ? "facts.claimant.titles" : `facts.claimant.titles[${i}]${field ? "." + field : ""}`;
}

export function findTitle(ctx: Pick<Ctx, "facts">, titleId: string | undefined): InsuranceTitle | undefined {
  return ctx.facts.claimant.titles.find((t) => t.id === titleId);
}

export function isNonEmployeeTitle(t: InsuranceTitle): boolean {
  return t.kind === "mandate" || t.kind === "selfEmployed" || t.kind === "collaborator";
}

export function isDeclaredBaseTitle(t: InsuranceTitle): boolean {
  return t.kind === "selfEmployed" || t.kind === "collaborator";
}

/** Maternity-type benefits (zasiłek macierzyński in its forms). */
export const MATERNITY_TYPES: ReadonlySet<LeaveType> = new Set(["maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"]);
export const SICKNESS_TYPES: ReadonlySet<LeaveType> = new Set(["sickPay", "sickness", "rehabilitation"]);

/** Deterministic order of leave types on the same start day. */
export const TYPE_ORDER: Record<LeaveType, number> = {
  sickPay: 0, sickness: 1, rehabilitation: 2, art30PreBirth: 3, maternity: 4, maternityOnAdoption: 4,
  supplementary: 5, paternity: 6, parental: 7,
};
