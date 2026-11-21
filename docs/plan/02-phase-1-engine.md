# 02 — Phase 1: rules engine, fixtures, golden tests

Goal: a pure, parameter-driven, explainable engine that reproduces the outcomes of the 86 sample cases and raises the alerts that would have prevented the refusals. Deliverables: `src/engine/**`, `data/params/*.json`, `data/cases/**`, `tests/unit/**`, `tests/golden/**`, `scripts/validate-fixtures.ts`.

Rule sources: digest 02 (rule IDs `R-*`), digest 03 §6 (rules confirmed by cases) and §2 (alert causes).

## 1. Design constraints

- `src/engine` imports nothing outside itself. No clock, no randomness, no I/O. "Today" is `facts.asOf`.
- Money is integer **grosze**. Rates are **basis points** (10000 = 100%). Fractions are `{ num, den }`.
- Dates are `ISODate` strings; all arithmetic goes through `engine/dates.ts` (UTC day numbers). Periods are inclusive: `to = from + days − 1`.
- The engine consumes plain `Facts`. Provenance (`Sourced<T>`, badges) lives in the data layer, keyed by fact path; trace steps reference fact paths so the UI can join them.
- The engine returns codes and values, never Polish prose. Text lives in `src/content/pl.ts`.
- The engine **never judges whether a contract is genuine**. A ZUS non-coverage decision is an input fact; the risk of one is an alert.

## 2. Types (`src/engine/types.ts`)

```ts
export type ISODate = string;      // 'YYYY-MM-DD'
export type YearMonth = string;    // 'YYYY-MM'
export type Grosze = number;       // integer
export type Bps = number;          // 10000 = 100%
export interface Fraction { num: number; den: number }

// ───────── Facts ─────────
export interface Facts {
  asOf: ISODate;                   // evaluation date ("today"); in case mode = application date
  parameterDate?: ISODate;         // overrides parameter-set selection (anonymised, shifted case dates)
  claimant: Person;
  otherParent?: OtherParent;
  event: FamilyEvent;
}

export type Role = 'mother' | 'father' | 'adoptive' | 'foster' | 'otherFamily';

export interface Person {
  sex: 'F' | 'M';
  birthYear: number;               // enough for the 50+ sick-pay rule
  role: Role;
  titles: InsuranceTitle[];
  sickNotes: SickNote[];
  paidBenefits: PaidBenefit[];     // already paid, incl. earlier parts of this entitlement
  arrears: ArrearsSnapshot[];
  insuranceDecisions: InsuranceDecision[];
  flags?: { krus?: boolean; pension?: boolean; unemploymentBenefit?: boolean; studentUnder26?: boolean };
}

export type TitleKind =
  | 'employment' | 'mandate' | 'selfEmployed' | 'collaborator'
  | 'childcareLeave' | 'maternityBenefit' | 'unemployed' | 'none';

export type TitleEndReason =
  | 'fixedTermExpired' | 'extendedToBirth' | 'resignation' | 'mutualAgreement'
  | 'employerLiquidation' | 'employerBankruptcy' | 'employerDeath'
  | 'unlawfulTerminationJudgment' | 'businessClosed' | 'businessSuspended'
  | 'deregisteredBenefitConcurrence' | 'deregisteredOnRequest' | 'contractEnded' | 'other';

export interface InsuranceTitle {
  id: string;
  kind: TitleKind;
  zusCode?: string;                               // '0110', '0411', '0510', '0570', '0590', '0540', '1240'…
  from: ISODate;
  to?: ISODate;
  endReason?: TitleEndReason;
  plannedEnd?: { date: ISODate; reason: TitleEndReason };   // user-declared future change
  sickness: { mode: 'mandatory' | 'voluntary' | 'none'; periods: { from: ISODate; to?: ISODate }[] };
  registeredOn?: ISODate;                         // date the ZUA reached ZUS
  scheme?: 'standard' | 'preferential' | 'malyZusPlus' | 'ulgaNaStart';
  workTime?: { from: ISODate; fraction: Fraction }[];       // employment only
  suspensions?: { from: ISODate; to?: ISODate }[];          // CEIDG
  payer: Payer;
  months: MonthRecord[];
  annualBonuses?: { year: number; amount: Grosze }[];
  quarterlyBonuses?: { quarter: string; amount: Grosze }[]; // '2026-Q1'
  statedBenefitBase?: Grosze;                     // when the file prints only the final base
  priorMandatoryYears?: number;                   // 10-year waiting-period exemption
  graduateWithin90Days?: boolean;
}

export interface Payer {
  ref: string;                                    // 'payer-1' — never a name or NIP
  kind: 'employer' | 'client' | 'self' | 'businessOwner';
  insuredOn30NovPrevYear?: number;
  status?: 'active' | 'liquidation' | 'bankruptcy' | 'closed' | 'deceased';
  relatedToClaimant?: boolean;                    // family firm (risk signal only)
  sameFirmPriorContract?: boolean;                // zlecenie → employment at the same firm (risk signal)
}

export interface MonthRecord {
  month: YearMonth;
  contributionBase: Grosze;                       // sickness-insurance base (gross) or declared base
  employeeContributions?: Grosze;                 // actual deduction; absent → base × deduction rate
  daysDue?: number;
  daysWorked?: number;
  fixedPay?: Grosze;                              // for top-up of months with ≥ half worked
  variablePay?: Grosze;
  minimumBase?: Grosze;                           // individual minimum declared base (non-employees)
  contributionHoliday?: boolean;
  fullMonthInsured?: boolean;                     // default true
}

export interface SickNote {
  titleId: string; from: ISODate; to: ISODate;
  code?: 'A' | 'B' | 'C' | 'D' | 'E'; hospital?: boolean;
}

export type LeaveType =
  | 'sickPay' | 'sickness' | 'rehabilitation' | 'art30PreBirth'
  | 'maternity' | 'maternityOnAdoption' | 'supplementary' | 'parental' | 'paternity';

export interface PaidBenefit {
  type: LeaveType; titleId?: string; from: ISODate; to: ISODate;
  rateBps?: Bps; base?: Grosze; part?: number; childRef?: string;
}

export interface ArrearsSnapshot {
  account: 'own' | 'payer'; onDate: ISODate; amount: Grosze;
  repaidOn?: ISODate; instalmentAgreement?: boolean;
}

export interface InsuranceDecision {
  titleId: string; kind: 'nonCoverage' | 'baseReduced';
  from: ISODate; reducedBase?: Grosze;
}

export type FamilyEvent = BirthEvent | CareEvent;

export interface BirthEvent {
  kind: 'birth';
  expectedDate?: ISODate;
  date?: ISODate;                                 // absent → prospective
  children: Child[];
  pregnancyDuringEmploymentCertified?: boolean;   // Art. 30 evidence
  mother?: MotherCircumstances;                   // when the claimant is not the mother
}

export interface CareEvent {
  kind: 'adoption' | 'foster';
  takenIntoCareOn: ISODate;
  petitionFiledOn?: ISODate;
  finalOrderOn?: ISODate;
  fosterType?: 'nonProfessional' | 'professional';
  children: Child[];
  previouslyUsedAsFoster?: { leaveDays: number; parentalDays: number };
}

export interface Child {
  ref: string;
  bornAlive?: boolean;                            // birth events
  deathDate?: ISODate;
  birthDate?: ISODate;                            // care events
  schoolDeferred?: boolean;
  gestationalWeek?: number;                       // completed weeks
  birthWeightG?: number;
  hospitalStays?: { from: ISODate; to: ISODate }[];
  zaZyciem?: boolean;
}

export interface MotherCircumstances {
  insuredAtBirth: boolean | 'krus' | 'unknown';
  maternityUsed?: { from: ISODate; to: ISODate; rateBps: Bps };
  resignedAfter?: ISODate;
  hospitalStays?: { from: ISODate; to?: ISODate }[];
  incapableOfIndependentExistenceFrom?: ISODate;
  diedOn?: ISODate;
  abandonedOn?: ISODate;
  employedHalfTimeFrom?: ISODate;
}

export interface OtherParent {
  role: Role;
  insured: 'yes' | 'no' | 'krus' | 'abroad' | 'unknown';
  person?: Person;                                // only with consent
  estimatedBase?: Grosze;                         // user estimate when no consent
  used: PaidBenefit[];                            // from ZUS by PESEL, or declared
  declaresNonUse?: { from: ISODate; to: ISODate };
}

// ───────── Plan (planner state and, in case mode, the claim as filed) ─────────
export interface Plan {
  rateOption: 'split100_70' | 'averaged81_5';
  applicationDate?: ISODate;                      // for the 21-day rule
  singleTitleStatement?: boolean;                 // top-up statement
  blocks: PlanBlock[];
}

export interface PlanBlock {
  id: string;
  parent: 'claimant' | 'other';
  type: LeaveType;
  titleId?: string;
  from: ISODate;
  days: number;
  workFraction?: Fraction;                        // parental combined with work
  pool?: 'shared' | 'ownNineWeeks';
  claimedSeparatelyOn?: ISODate;                  // a later, separate application → new part, re-check insurance
  takeover?: 'afterResignation' | 'motherHospital' | 'motherIncapacity' | 'motherDeath' | 'motherAbandonment';
}

// ───────── Result ─────────
export interface Result {
  parameterSetId: string;
  mode: 'prospective' | 'adjudication';
  outcome: { value: 'granted' | 'refused' | 'partial' | 'withheld'; reasonCodes: ReasonCode[] };
  insurance: InsuranceCheck[];
  entitlements: Entitlement[];
  pools: PoolState;
  periods: Period[];
  bases: BaseCalculation[];
  totals: { gross: Grosze; netEstimate: Grosze; days: number; byParent: Record<'claimant' | 'other', Grosze> };
  routing: Routing;
  documents: DocumentRequirement[];
  deadlines: Deadline[];
  alerts: Alert[];
  violations: Violation[];
  defaultPlan?: Plan;                             // when plan === null: maximum entitlement
  trace: TraceStep[];
}

export interface InsuranceCheck {
  onDate: ISODate; purpose: 'event' | 'partStart' | 'sickness' | 'dueDate';
  insured: boolean; titleId?: string; mode?: 'mandatory' | 'voluntary';
  reasonCode?: ReasonCode;
}

export interface Entitlement {
  benefit: LeaveType | 'funeralGrant' | 'careAllowance' | 'parentalBenefitMunicipal';
  status: 'granted' | 'refused' | 'withheld' | 'partial' | 'notApplicable' | 'informational';
  reasonCode?: ReasonCode;
  maxDays?: number;
  rateBps?: Bps;
  citations: Citation[];
}

export interface PoolState {
  maternityDays: { total: number; used: number; motherMandatory: number };
  supplementaryDays: { total: number; capWeeks: 0 | 8 | 15 };
  parentalDays: { total: number; used: number; reservedPerParent: number;
                  usedByClaimant: number; usedByOther: number; extensionDays: number };
  parentalParts: { used: number; max: number };   // both parents together
  paternityDays: { total: number; used: number; parts: number; expiresOn?: ISODate };
  parentalDeadline?: ISODate;
}

export interface Period {
  blockId: string; parent: 'claimant' | 'other'; type: LeaveType;
  from: ISODate; to: ISODate; days: number;
  status: 'payable' | 'withheld' | 'refused';
  reasonCode?: ReasonCode;
  base: Grosze; rateBps: Bps; workReductionBps?: Bps;
  daily: Grosze; gross: Grosze;
  months: { month: YearMonth; days: number; gross: Grosze; pitAdvance: Grosze; net: Grosze; topUp: Grosze }[];
  paidBy: 'payer' | 'zus';
}

export interface BaseCalculation {
  titleId: string; method: BaseMethod; base: Grosze;
  monthsUsed: { month: YearMonth; income: Grosze; adjusted?: 'toppedUp' | 'excluded'; reason?: string }[];
  floorApplied?: boolean; capApplied?: boolean; carriedOverFrom?: LeaveType;
}
export type BaseMethod =
  | 'employee12m' | 'employeeShort' | 'employeeFirstMonth' | 'employeeNewWorkTime'
  | 'nonEmployee12m' | 'nonEmployeeArt48a' | 'nonEmployeeFirstMonth'
  | 'carriedOver' | 'stated';

export interface Routing {
  benefitPayer: 'payer' | 'zus';
  fileWith: 'employer' | 'zus';
  channel: ('paper' | 'pue' | 'employerAny')[];
  payerForwardsWithinDays?: number;
  citations: Citation[];
}

export interface DocumentRequirement {
  code: string;                                   // 'ZAM', 'Z-3', 'LEAVE_APP_PARENTAL', 'CERT_STILLBIRTH', …
  providedBy: 'claimant' | 'employer' | 'otherParent' | 'doctor' | 'court' | 'system';
  to: 'employer' | 'zus';
  obtainableFromRegistry?: boolean;               // "we will not ask you for this"
  dueBy?: ISODate; citations: Citation[];
}

export interface Deadline { code: string; date: ISODate; blockId?: string; hard: boolean; citations: Citation[] }

export interface Alert {
  code: AlertCode;
  severity: 'info' | 'warning' | 'high' | 'blocking';
  onDate?: ISODate;                               // the day the problem bites
  deadline?: ISODate;                             // last day to fix
  fix?: { action: FixAction; byDate?: ISODate };
  values: Record<string, string | number>;
  citations: Citation[];
  factPaths: string[];
}

export interface Violation { code: ReasonCode; blockId?: string; values: Record<string, string | number>; citations: Citation[] }
export interface Citation { act: 'UZ' | 'KP' | 'RD' | 'RW' | 'USUS' | 'KC'; article: string }
export interface TraceStep {
  stage: Stage; ruleId: string; factPaths: string[]; paramKeys: string[];
  inputs: Record<string, unknown>; output: unknown; citations: Citation[];
}
export type Stage = 'params' | 'insurance' | 'event' | 'lengths' | 'allocation' | 'rate'
  | 'base' | 'amount' | 'gating' | 'routing' | 'alerts' | 'outcome';

export type ReasonCode =
  | 'NOT_INSURED_AT_EVENT' | 'NOT_INSURED_AT_PART_START' | 'NO_SICKNESS_INSURANCE_ON_TITLE'
  | 'TITLE_INVALIDATED' | 'TITLE_END_NOT_QUALIFYING' | 'NO_INSURANCE_SCHEME'
  | 'ARREARS_UNPAID' | 'ARREARS_RIGHT_EXPIRED' | 'WAITING_PERIOD' | 'BENEFIT_PERIOD_EXHAUSTED'
  | 'PARTS_LIMIT' | 'POOL_EXCEEDED' | 'EXCESS_DAYS' | 'MOTHER_MINIMUM_WEEKS' | 'RESERVED_WEEKS'
  | 'DEADLINE_PASSED' | 'CHILD_AGE_LIMIT' | 'FOSTER_PROFESSIONAL' | 'NO_LIVING_CHILD'
  | 'CERTIFICATE_MISSING' | 'TRANSITIONAL_RULE_NOT_MET' | 'WORK_FRACTION_TOO_HIGH' | 'NOT_CONTIGUOUS';

export type AlertCode =
  | 'TITLE_LIKELY_VERIFIED' | 'NOT_INSURED_ON_DUE_DATE' | 'INSURANCE_GAP_BEFORE_PART'
  | 'VOLUNTARY_SICKNESS_NOT_JOINED' | 'BUSINESS_SUSPENDED_NEAR_DUE_DATE' | 'REREGISTER_AFTER_MATERNITY'
  | 'NO_SCHEME_ULGA_NA_START' | 'CONTRACT_ENDS_BEFORE_BIRTH' | 'ARREARS_OWN' | 'ARREARS_PAYER'
  | 'WAITING_PERIOD_NOT_MET' | 'RATE_DEADLINE_21_DAYS' | 'DAY_COUNT_MISMATCH' | 'PARTS_LIMIT_NEAR'
  | 'TOP_UP_STATEMENT_NEEDED' | 'LOW_BASE' | 'BASE_DILUTED_ART48A' | 'BASE_CHANGE_SCRUTINY'
  | 'PATERNITY_EXPIRES' | 'NO_PARENTAL_IN_FIRST_YEAR' | 'OTHER_PARENT_INFO_MISSING'
  | 'CERTIFICATE_TYPE' | 'EMPLOYER_CERTIFICATE_PENDING' | 'CLAIM_LIMITATION' | 'PARENTAL_HORIZON';

export type FixAction =
  | 'PAY_ARREARS' | 'FILE_ZUA' | 'KEEP_BUSINESS_ACTIVE' | 'COLLECT_PROOF_OF_WORK' | 'FILE_WITHIN_21_DAYS'
  | 'CORRECT_DAYS' | 'MERGE_PARTS' | 'ADD_SINGLE_TITLE_STATEMENT' | 'ASK_DOCTOR_FOR_CERTIFICATE'
  | 'ADD_OTHER_PARENT_STATEMENT' | 'USE_PATERNITY_BEFORE' | 'ASK_EMPLOYER_Z3' | 'APPLY_MUNICIPAL_BENEFIT';
```

`ParameterSet` is in §5.

## 3. Public API (`src/engine/index.ts`)

```ts
export function evaluate(facts: Facts, plan: Plan | null, params: ParameterSet[]): Result;
export function insuredOn(person: Person, date: ISODate, params: ParameterSet): InsuranceCheck;
export function computeBase(title: InsuranceTitle, rightArisesOn: ISODate, ctx: BaseContext, params: ParameterSet): BaseCalculation;
export function selectParameterSet(sets: ParameterSet[], date: ISODate): ParameterSet;
export function supplementaryWeeks(children: Child[], birth: ISODate, params: ParameterSet): { weeks: number; cap: 0 | 8 | 15 };
```

Mode: `adjudication` when the event has happened and a plan is given (case mode); otherwise `prospective`. In prospective mode refusals become alerts with dates, and `defaultPlan` is produced when `plan === null`.

## 4. Stage pipeline and rule catalogue

Folder per stage: `src/engine/stages/<stage>.ts`; each exports `run(ctx): ctx` and pushes trace steps.

| Stage | Rule IDs (digest 02) | What it does | Confirmed by (digest 03 §6) |
|---|---|---|---|
| **params** | — | Choose the set for `parameterDate ?? rightArisesOn`. | floor 3 660,42 in a 2024-wage case |
| **insurance** | R-ELIG-INSURED-AT-EVENT, §2.1 table, R-ELIG-SHAM (as input), R-ELIG-AFTER-TITLE-MAT | Build a sickness-insurance timeline per title: voluntary start = `registeredOn`; suspension or deregistration ends it; `ulgaNaStart` and student-under-26 mandate give none; a `nonCoverage` decision voids the title. Check on the event date and on each separately claimed part start. Art. 30 / extended-to-birth exceptions. | insured on birth date and on each separate part; no waiting period for maternity |
| **event** | B5, B6, B10, R-ELIG-ADOPTION-MALE | Classify: birth (live / stillbirth / death <8 weeks / death later / mixed multiples), adoption, foster (reject professional), child-age limits. | stillbirth 56 days, twins do not multiply; stillborn sibling counts for maternity length |
| **lengths** | §1.2 tables, B7 algorithm, KP 180¹, KP 183 | Maternity by children at one birth; parental 41/43, 65/67 with Za życiem; reserved 9 weeks; supplementary: `ceil(hospitalDays/7)` capped 15/8/8, lowest weight and longest stay for multiples, in force from `supplementaryLeave.validFrom`; paternity 14 days until 12 months; adoption caps and 9-week minimum. | durations table; supplementary cases |
| **allocation** | KP 180 §4–14, 182¹a–182¹f, 182³ | Normalise plan or build `defaultPlan`. Validate: pre-birth ≤6 weeks; mother ≥14 weeks (8 in special cases); takeover conditions; order maternity → supplementary → parental; pool and reserved weeks; **≤5 parental parts counted across both parents**; horizon (end of the year the child turns 6); paternity ≤2 parts ≥7 days; work fraction ≤½ with extension `days × f` and caps. Excess days → `EXCESS_DAYS` on the surplus only. | 5-part limit shared; 1 excess day refused; simultaneous use allowed |
| **rate** | R-AMT-MAT100, -PAR70, -815, -815-1Y, -9W, -WORK, -SICK | 81.5% if `averaged81_5` and `applicationDate ≤ event + 21 days`; otherwise 100/70. Other parent's 9 weeks always 70%. Supplementary, paternity, stillbirth, Art. 30: 100%. Sickness in pregnancy 100% (code B), else 80%. Work reduction `× (1 − f)`. | printed rates in ~8 files |
| **base** | R-BASE-EMP-1…10, R-BASE-NE-1…6, R-BASE-DAY | Employee: 12 full months before the month the right arose; only months of the current title; exclude months with <½ worked, top up ≥½; only full months after a work-time change; bonuses; full-time floor; no cap. Deduction per month = `employeeContributions` if given, else `base × deductionBps`. Non-employee: declared bases over insured months; Art. 48a dilution under 12 months; first-month rule; 250% cap. **No recalculation** when the previous benefit ended less than one calendar month earlier. `statedBenefitBase` → method `stated`. | floor; no cap (2.45% deduction case); carried-over base after sickness; full months after etat change |
| **amount** | §3.4, R-AMT-MIN | `daily = round½up(base × rateBps / 10000 / 30)`; `gross = daily × days`, split per calendar month. PIT advance = `round(gross × pitBps)` to full złoty. If monthly net < `minimumMaternityNet` and the single-title statement is present → top-up to the floor (prorated per `topUpProration`). | daily 152,37 / 132,49 / 101,36 and the monthly sums printed; 11 top-ups |
| **gating** | R-ELIG-ARREARS, R-ELIG-WAIT-SICK, R-ELIG-SALARY-OVERLAP | Arrears > `arrearsThresholdBps × minimumWage` on the day the right arises (own account; payer's for collaborators): periods `withheld`; repaid → payable; not repaid within 6 months → `ARREARS_RIGHT_EXPIRED`. An instalment agreement is not repayment. Waiting period for sickness only (30/90, bridging rules). 33/14 sick-pay days; 270-day benefit period with the code-B restart. | debt cases; waiting period day 103/140 |
| **routing** | R-PAY-1, §4.2–4.4, §5 timeline | Benefit payer (>20 insured on 30 Nov; self-employed and after-title always ZUS); where to file; document list per scenario with `obtainableFromRegistry`; deadlines (21 days after birth, 21 days before parental, 7/14 days for handover, 21 days before maternity end for supplementary, 12 months for paternity, 6-month claim limitation). | Z-3 / ZAM / ZAS-55 patterns |
| **alerts** | digest 03 §2 causes 1–12 | See §4.1. | all 12 refusals |
| **outcome** | — | Roll up to `granted` / `refused` / `partial` / `withheld` with reason codes. | — |

### 4.1 Alert rules

| Alert | Trigger | Severity | Deadline / fix |
|---|---|---|---|
| `TITLE_LIKELY_VERIFIED` | Score ≥ `titleRisk.threshold` from signals: title started < N months before due date; first sick note < M days after start; work fraction ≤ ¼; pay out of proportion to fraction; `registeredOn` > 7 days after start; `relatedToClaimant`; `sameFirmPriorContract`; second full-time title elsewhere. Thresholds are parameters. | high | `COLLECT_PROOF_OF_WORK` now; note 2–4 months without income. |
| `NOT_INSURED_ON_DUE_DATE` | Insurance timeline has no sickness cover on the due date. | blocking | `FILE_ZUA` before due date; else `APPLY_MUNICIPAL_BENEFIT`. |
| `VOLUNTARY_SICKNESS_NOT_JOINED` | Mandate or business title with `sickness.mode = 'none'` or `'voluntary'` with no period. | blocking | `FILE_ZUA`; cover starts on receipt date. |
| `NO_SCHEME_ULGA_NA_START` | `scheme = 'ulgaNaStart'`. | blocking | Opt out and register. |
| `BUSINESS_SUSPENDED_NEAR_DUE_DATE` | Suspension overlapping or planned within `±dueDateWindowDays`. | blocking | `KEEP_BUSINESS_ACTIVE`. |
| `CONTRACT_ENDS_BEFORE_BIRTH` | `to` or `plannedEnd` before due date and reason not qualifying (after applying the 3rd-month extension rule). | blocking | Explain Art. 30 / extension; no fix if resignation. |
| `REREGISTER_AFTER_MATERNITY` / `INSURANCE_GAP_BEFORE_PART` | Non-employee with a separately claimed parental part: cover ends with the maternity benefit; part starts later. | high | `FILE_ZUA` by the last day of the preceding benefit. |
| `ARREARS_OWN` / `ARREARS_PAYER` | Latest snapshot above threshold. | blocking | `PAY_ARREARS`; `deadline = rightArisesOn + 6 months`. |
| `WAITING_PERIOD_NOT_MET` | Sick note inside the waiting period. | warning | Date from which sickness benefit is payable; maternity unaffected. |
| `RATE_DEADLINE_21_DAYS` | Birth known or expected, no application yet. | warning | `FILE_WITHIN_21_DAYS`, `deadline = birth + 21`. |
| `DAY_COUNT_MISMATCH` | Block length not equal to the statutory or remaining count (e.g. 8 weeks + 3 days, 225 days). | warning | `CORRECT_DAYS` with the exact number. |
| `PARTS_LIMIT_NEAR` | Parts used + planned ≥ 4 across both parents. | warning | `MERGE_PARTS`. |
| `TOP_UP_STATEMENT_NEEDED` | Monthly net below the floor. | info | `ADD_SINGLE_TITLE_STATEMENT`. |
| `LOW_BASE`, `BASE_DILUTED_ART48A`, `BASE_CHANGE_SCRUTINY` | Preferential / Mały ZUS / small fraction; <12 months with declared base above minimum; base raised within N months of due date. | info / warning | Explanation with the base breakdown. |
| `PATERNITY_EXPIRES`, `NO_PARENTAL_IN_FIRST_YEAR`, `PARENTAL_HORIZON`, `CLAIM_LIMITATION` | Date-driven. | info / warning | Dated. |
| `OTHER_PARENT_INFO_MISSING`, `CERTIFICATE_TYPE`, `EMPLOYER_CERTIFICATE_PENDING` | Missing statement / KRUS or abroad status; Za życiem or preterm or stillbirth without registry act; employer certificate not received (flag from data layer). | warning | Named document. |

## 5. Parameter sets

```ts
export interface ParameterSet {
  id: string;                    // '2026-01-01'
  validFrom: ISODate;
  label: string;
  sources: string[];             // legal references, shown in admin
  wage: { minimumWage: Grosze; forecastAverageWage: Grosze };
  deductions: { employeeSocialBps: Bps };                       // 1371
  base: {
    employeeFloorFullTime: boolean;
    nonEmployeeMinBasePctOfForecastBps: Bps;                    // 6000
    preferentialBasePctOfMinWageBps: Bps;                       // 3000
    voluntaryCapPctOfForecastBps: Bps;                          // 25000
    afterTitleCapPctOfForecastBps: Bps;                         // 10000
    monthDays: 30;
    noRecalcGapMonths: 1;
  };
  rates: { maternity: Bps; parental: Bps; averaged: Bps; otherParentReserved: Bps; paternity: Bps;
           supplementary: Bps; sicknessPregnancy: Bps; sicknessStandard: Bps; careAllowance: Bps;
           rehabPregnancy: Bps };
  maternity: { weeksByChildren: Record<'1' | '2' | '3' | '4' | '5plus', number>;
               preBirthMaxWeeks: number; motherMandatoryWeeks: number; motherMandatoryWeeksSpecial: number };
  parental: { weeks: { single: number; multiple: number };
              weeksZaZyciem: { single: number; multiple: number };
              reservedWeeksPerParent: number; maxParts: number; partsSharedBetweenParents: boolean;
              untilEndOfYearChildTurns: number;
              workMaxFraction: Fraction;
              combinedCapWeeks: { single: number; multiple: number };
              combinedCapWeeksZaZyciem: { single: number; multiple: number };
              applicationLeadDays: number };
  paternity: { days: number; maxParts: number; minPartDays: number; untilChildMonths: number;
               adoptionMaxChildAgeYears: number; applicationLeadDays: number };
  supplementary: { validFrom: ISODate | null; extremePretermBeforeWeek: number; extremeMaxWeightG: number;
                   pretermBeforeWeek: number; capWeeksExtreme: number; capWeeksPreterm: number;
                   capWeeksTerm: number; termMinConsecutiveDays: number; termFirstDayFrom: number;
                   termFirstDayTo: number; applicationLeadDays: number };
  loss: { weeksAfterStillbirthOrEarlyDeath: number; earlyDeathBeforeWeeks: number; minDaysFromDeath: number;
          funeralGrant: Grosze };
  adoption: { fosterMaxAgeYears: number; fosterMaxAgeDeferredYears: number; adoptionMaxAgeYears: number;
              minLeaveWeeks: number; parentalWeeksReduced: number; parentalWeeksReducedZaZyciem: number;
              averagedOptionDeadlineDays: number };
  averagedOption: { deadlineDaysAfterEvent: number };
  sickness: { waitingDaysMandatory: number; waitingDaysVoluntary: number; bridgingGapDays: number;
              sickPayDays: number; sickPayDaysAge50: number; benefitPeriodDays: number;
              benefitPeriodPregnancyDays: number; afterTitleStartWithinDays: number; afterTitleMinDays: number };
  arrears: { thresholdPctOfMinWageBps: Bps; expiryMonths: number };
  payer: { ownPaymentAboveInsured: number; forwardWithinDays: number };
  minimumBenefit: { netMonthly: Grosze; proration: 'calendarDays' | 'thirtieths' };
  tax: { pitAdvanceBps: Bps; roundToFullZloty: boolean };
  claims: { limitationMonths: number };
  titleRisk: { threshold: number; newTitleMonthsBeforeDue: number; sickWithinDaysOfStart: number;
               smallFraction: Fraction; lateRegistrationDays: number; dueDateWindowDays: number;
               baseRaiseMonthsBeforeDue: number };
  interpretation: {
    nineWeeksLostIfOtherParentUninsured: boolean;
    art30CoversParental: boolean;
    art30PreBirthIncludesUnlawfulTermination: boolean;
    fatherSharedPartAtAveragedRate: boolean;
    supplementaryForNonEmployees: boolean;
    stillbornCountsForMaternityLength: boolean;
  };
}
```

### `data/params/2026-01-01.json` (values)

```json
{
  "id": "2026-01-01", "validFrom": "2026-01-01", "label": "Stan prawny 2026",
  "sources": ["UZ (Dz.U. 2026 poz. 854)", "KP (Dz.U. 2026 poz. 1245)", "RD (Dz.U. 2026 poz. 1316)"],
  "wage": { "minimumWage": 480600, "forecastAverageWage": 942000 },
  "deductions": { "employeeSocialBps": 1371 },
  "base": { "employeeFloorFullTime": true, "nonEmployeeMinBasePctOfForecastBps": 6000,
            "preferentialBasePctOfMinWageBps": 3000, "voluntaryCapPctOfForecastBps": 25000,
            "afterTitleCapPctOfForecastBps": 10000, "monthDays": 30, "noRecalcGapMonths": 1 },
  "rates": { "maternity": 10000, "parental": 7000, "averaged": 8150, "otherParentReserved": 7000,
             "paternity": 10000, "supplementary": 10000, "sicknessPregnancy": 10000,
             "sicknessStandard": 8000, "careAllowance": 8000, "rehabPregnancy": 10000 },
  "maternity": { "weeksByChildren": { "1": 20, "2": 31, "3": 33, "4": 35, "5plus": 37 },
                 "preBirthMaxWeeks": 6, "motherMandatoryWeeks": 14, "motherMandatoryWeeksSpecial": 8 },
  "parental": { "weeks": { "single": 41, "multiple": 43 }, "weeksZaZyciem": { "single": 65, "multiple": 67 },
                "reservedWeeksPerParent": 9, "maxParts": 5, "partsSharedBetweenParents": true,
                "untilEndOfYearChildTurns": 6, "workMaxFraction": { "num": 1, "den": 2 },
                "combinedCapWeeks": { "single": 82, "multiple": 86 },
                "combinedCapWeeksZaZyciem": { "single": 130, "multiple": 134 }, "applicationLeadDays": 21 },
  "paternity": { "days": 14, "maxParts": 2, "minPartDays": 7, "untilChildMonths": 12,
                 "adoptionMaxChildAgeYears": 14, "applicationLeadDays": 7 },
  "supplementary": { "validFrom": "2025-03-19", "extremePretermBeforeWeek": 28, "extremeMaxWeightG": 1000,
                     "pretermBeforeWeek": 37, "capWeeksExtreme": 15, "capWeeksPreterm": 8, "capWeeksTerm": 8,
                     "termMinConsecutiveDays": 2, "termFirstDayFrom": 5, "termFirstDayTo": 28,
                     "applicationLeadDays": 21 },
  "loss": { "weeksAfterStillbirthOrEarlyDeath": 8, "earlyDeathBeforeWeeks": 8, "minDaysFromDeath": 7,
            "funeralGrant": 700000 },
  "adoption": { "fosterMaxAgeYears": 7, "fosterMaxAgeDeferredYears": 10, "adoptionMaxAgeYears": 14,
                "minLeaveWeeks": 9, "parentalWeeksReduced": 38, "parentalWeeksReducedZaZyciem": 62,
                "averagedOptionDeadlineDays": 21 },
  "averagedOption": { "deadlineDaysAfterEvent": 21 },
  "sickness": { "waitingDaysMandatory": 30, "waitingDaysVoluntary": 90, "bridgingGapDays": 30,
                "sickPayDays": 33, "sickPayDaysAge50": 14, "benefitPeriodDays": 182,
                "benefitPeriodPregnancyDays": 270, "afterTitleStartWithinDays": 14, "afterTitleMinDays": 30 },
  "arrears": { "thresholdPctOfMinWageBps": 100, "expiryMonths": 6 },
  "payer": { "ownPaymentAboveInsured": 20, "forwardWithinDays": 7 },
  "minimumBenefit": { "netMonthly": 100000, "proration": "calendarDays" },
  "tax": { "pitAdvanceBps": 1200, "roundToFullZloty": true },
  "claims": { "limitationMonths": 6 },
  "titleRisk": { "threshold": 3, "newTitleMonthsBeforeDue": 6, "sickWithinDaysOfStart": 60,
                 "smallFraction": { "num": 1, "den": 4 }, "lateRegistrationDays": 7,
                 "dueDateWindowDays": 30, "baseRaiseMonthsBeforeDue": 12 },
  "interpretation": { "nineWeeksLostIfOtherParentUninsured": true, "art30CoversParental": true,
                      "art30PreBirthIncludesUnlawfulTermination": false,
                      "fatherSharedPartAtAveragedRate": true, "supplementaryForNonEmployees": true,
                      "stillbornCountsForMaternityLength": true }
}
```

Derived checks (unit-tested): floor 4 806,00 × 0,8629 = **4 147,10**; minimum declared base 60% × 9 420 = **5 652,00** → **4 877,11**; preferential 30% × 4 806 = **1 441,80** → **1 244,13**; cap 250% × 9 420 = 23 550,00 → **20 321,30**; arrears threshold **48,06**.

### Historic sets

Stored as full files generated from the 2026 file plus overrides (a `scripts/` helper keeps them in sync). Needed because case files show 2024 and 2025 values.

| File | Overrides | Evidence |
|---|---|---|
| `2024-01-01.json` | `minimumWage` 424200; `forecastAverageWage` 782400 `[verify]`; `supplementary.validFrom` null | floor 3 660,42 = 4 242 × 0,8629 |
| `2024-07-01.json` | `minimumWage` 430000 `[verify]` | general knowledge |
| `2025-01-01.json` | `minimumWage` 466600; `forecastAverageWage` 867300 `[verify]`; `supplementary.validFrom` null | debt threshold 46,66; preferential base 1 399,80 |
| `2025-03-19.json` | `supplementary.validFrom` "2025-03-19" | act of 6.12.2024 |
| `2026-01-01.json` | base file | materials |

Values marked `[verify]` come from general knowledge, not the provided materials; they only matter for the non-employee minimum base in pre-2026 cases and are confirmed or corrected during fixture extraction. Interpretation flags are finalised against the cases (`art30CoversParental`, `stillbornCountsForMaternityLength` and `fatherSharedPartAtAveragedRate` already follow digest 03).

Rounding conventions (in `engine/money.ts`, all integer maths): net income = `round½up(base × (10000 − deductionBps) / 10000)`; monthly average rounded half-up to the grosz; daily as in §4; PIT advance rounded half-up to full złoty.

## 6. Fixture schema

One folder per case: `data/cases/<id>/input.json` and `expected.json`. `<id>` is the digest working ID (`B1-01` … `B6-15`). Zod schemas in `src/integrations/case-schema.ts` (`satisfies z.ZodType<…>` against the engine types).

```ts
// input.json
interface CaseInput {
  schemaVersion: 1;
  id: string;                                  // 'B4-07'
  title: string;                               // scenario title, Polish, no names
  scenario: string;                            // taxonomy key from digest 03 §1, e.g. '1.3'
  tags: string[];                              // 'self-employed', 'twins', 'top-up', …
  source: { pdfSha256: string[]; fileNameSha256: string[]; pages: number };  // arrays: one case has a duplicate file
  facts: Facts;
  plan: Plan;                                  // the claim as filed
  provenance: Record<string, { doc: string; page?: number; evidence: Evidence }>;  // key = fact path
  extractionNotes?: string;                    // our words only; no quotes from documents
}

type Evidence = 'printed' | 'handwritten' | 'inferred';

// expected.json
interface CaseExpected {
  schemaVersion: 1;
  id: string;
  outcome: {
    value: 'granted' | 'refused' | 'partial';
    reasonCodes: ReasonCode[];
    evidence: 'decision' | 'internalNote' | 'accountTitle1240' | 'payments';
    reversedOnAppeal?: boolean;
  };
  benefits: {
    type: LeaveType;
    parent: 'claimant' | 'other';
    status: 'granted' | 'refused' | 'withheld';
    days?: Stated<number>;
    from?: Stated<ISODate>;
    to?: Stated<ISODate>;
    rateBps?: Stated<Bps>;
    base?: Stated<Grosze>;
    daily?: Stated<Grosze>;
    payments?: { from: ISODate; to: ISODate; days: number; gross: Stated<Grosze>; net?: Stated<Grosze> }[];
    toppedUp?: Stated<boolean>;
    paidBy?: Stated<'payer' | 'zus'>;
  }[];
  legalBasisCited: string[];                   // e.g. 'UZ art. 2a'
  expectedAlerts: AlertCode[];                 // alerts that must fire from pre-event data (refusals and problem cases)
  tiers: { outcome: true; duration: boolean; amount: boolean };   // derived by the validator, not hand-set
  knownDivergence?: { fields: string[]; explanation: string };
  variants?: { name: string; factsPatch: unknown; planPatch?: unknown; expected: Partial<CaseExpected> }[];
}

interface Stated<T> { value: T; evidence: 'printed' | 'inferred' }
```

**Assertion rules**

| Tier | Asserted when | Comparison |
|---|---|---|
| Outcome | always | `outcome.value` equal; `reasonCodes` ⊆ engine reason codes; each benefit `status` equal |
| Duration | `days.evidence === 'printed'` | exact days per `(type, parent)`; `from`/`to` exact when printed |
| Amount | `base`, `daily`, `rateBps` or a payment is `printed` | exact to the grosz; `rateBps` exact |
| Alerts | `expectedAlerts` non-empty | each code present when the case is replayed in prospective mode (see §8) |

`inferred` values are compared and **reported**, never failed. `tiers.duration` / `tiers.amount` are true when at least one printed field of that kind exists. `knownDivergence` exempts the listed fields only, is capped at 5 cases, and is printed on the scoreboard.

Modelling notes:
- **Non-recognised title** (4 cases): `facts.claimant.insuranceDecisions` carries the ZUS non-coverage decision as system data → `TITLE_INVALIDATED`. `expectedAlerts: ['TITLE_LIKELY_VERIFIED']` must fire with the decision stripped.
- **Refused then reversed**: base expectation = final (granted); a `variant` without the correct certificate expects `refused` / `CERTIFICATE_MISSING`.
- **Shifted dates**: when the file's wage values belong to another year than its calendar dates, set `facts.parameterDate` and record why in `provenance`.
- **Base not derivable** from monthly data: set `statedBenefitBase` (evidence required) and leave `months` empty; amount tier then checks rate and daily only.
- **Same-person pairs** stay separate cases.

## 7. Extraction procedure (86 cases)

Inputs, all local and gitignored: `.work/clean/*.txt` (OCR per case), `.work/summaries/batch1–6.md` (structured summaries), page images when a number is doubtful. **Nothing from `.work/` is copied verbatim into the repo.**

1. **Pilot (Phase 0, one agent).** Ten cases chosen for diversity: employee 52 weeks with printed amounts; self-employed with printed amounts; father's 9 weeks at 70%; paternity in two parts; stillbirth without registry act; extreme preterm with 15 weeks; twins + Za życiem; adoption; Art. 30 liquidation; debt refusal. Freeze `schemaVersion: 1` afterwards.
2. **Fan-out (6 extractor agents, one per batch, 12–15 cases each).** Each agent gets: this document's §2 and §6, its `batchN.md`, the matching OCR files, and the pilot fixtures as examples. Output: `data/cases/<id>/{input,expected}.json` only.
3. **Cross-verification (6 verifier agents, batches rotated by one).** Each re-derives `expected.json` from the OCR independently of the extractor's file, then diffs. Disagreements go to a short list resolved against the page image by the orchestrator.
4. **Hashing (local script, no agent).** `scripts/hash-cases.mjs` reads `docs/Sprawy `, computes SHA-256 of each PDF and of each normalised file name, and writes them into `source` using the private ID↔file map kept in `.work/`.
5. **Engine feedback loop.** Golden failures are triaged as fixture error / engine bug / parameter flag / genuine divergence, in that order.

**Per-fixture validation checklist** (automated in `fixtures:validate` unless marked manual):

- [ ] Parses against the zod schema; `id` matches the folder.
- [ ] PII scan passes: no 11-digit or 10-digit number sequences, no 26-digit account numbers, no token from the private name list (`.work/names.txt`, read at validation time, never committed), no street / postcode patterns, no e-mail or phone patterns.
- [ ] `title`, `tags`, `extractionNotes` contain no personal or employer names (manual).
- [ ] Every `printed` expected field has a provenance entry or a payment source page.
- [ ] Date sanity: `to = from + days − 1` for every period; periods in order maternity → supplementary → parental; birth within the maternity window.
- [ ] Title timeline covers or deliberately does not cover the event date, consistent with `outcome`.
- [ ] Months: ≤12 records in the reference window, no duplicates, bases > 0 unless flagged.
- [ ] `refused` outcomes have ≥1 reason code and ≥1 expected alert.
- [ ] If `daily`, `base` and `rateBps` are all printed: `daily === round(base × rate / 30)` — a mismatch means an OCR error; re-check the image (manual).
- [ ] Values the OCR marked uncertain are omitted, not guessed.

**Anonymisation rules**

| Never in a fixture | Use instead |
|---|---|
| Names (claimant, child, other parent, doctor, clerk), even abbreviated | roles: `claimant`, `otherParent`, `child-1` |
| PESEL, NIP, REGON, ID numbers, case / decision / document numbers | omitted |
| Addresses, towns, ZUS branch, hospital and court names | omitted |
| Employer / payer names | `payer-1`, `payer-2` |
| Bank accounts, phone, e-mail | omitted |
| Claimant's full birth date | `birthYear` |
| Original file names | SHA-256 of the normalised name |
| Verbatim text of decisions or letters | reason codes + article references |

Kept as in the file: event and benefit dates (already shifted by ZUS), amounts, working-time fractions, title codes.

## 8. Golden test harness (`tests/golden`)

- `load.ts` — reads every `data/cases/*/` pair; exposes `{ input, expected }`.
- `compare.ts` — `compare(result, expected): FieldResult[]` where `FieldResult = { path, tier, status: 'match' | 'mismatch' | 'reported' | 'knownDivergence', expected, actual }`. Pure, reused by `/sprawy` in Phase 2.
- `cases.test.ts` — `describe.each(cases)`: `evaluate(input.facts, input.plan, sets)`; fails on any `mismatch`. Variants run the same way with patches applied.
- `alerts.test.ts` — for every case with `expectedAlerts`: derive **pre-event facts** (`asOf = event date − 60 days`; drop `insuranceDecisions`, post-event benefits and the actual birth date, keep the due date), evaluate with `plan = null`, assert each alert code is present with severity ≥ `high` for refusals.
- `report.ts` — after the run writes `data/cases/_report.json`: per case `{ id, title, tiers, counts, divergences }` and totals. Committed; rendered as the scoreboard.
- `guards.test.ts` — `knownDivergence` count ≤ 5; no fixture uses `statedBenefitBase` without evidence; every reason code and alert code used in fixtures exists in the engine unions.

Targets for Phase 1 sign-off: outcome tier **86/86** minus documented divergences; duration and amount tiers **100% of asserted fields**; alert recall **100% of refusals**.

## 9. Unit tests (`tests/unit`)

**Primitives:** `dates` (inclusive ranges, add months, end of year, leap years, week ↔ day); `money` (half-up rounding, net factor: 5 652,00 → 4 877,11; 23 550,00 → 20 321,30; 4 806,00 → 4 147,10); `selectParameterSet` (boundaries, `parameterDate` override).

**Insurance:** employee covered start to end; voluntary cover starts on `registeredOn`, not on the contract date; suspension ends cover; `ulgaNaStart` none; mandate + student under 26 none; non-coverage decision voids the title; deregistration on benefit concurrence; Art. 30 qualifying vs non-qualifying end reasons; fixed-term extended to birth; childcare leave counts for maternity.

**Lengths:** maternity 20/31/33/35/37; parental 41/43, 65/67, minus 9; stillbirth 56 days, twins not multiplied, min 7 days from death, death after 8 weeks; mixed multiples; supplementary — extreme (≤1 000 g boundary, week 27 vs 28), preterm, term with the day-5–28 rule and 2 consecutive days, multiples (lowest weight, longest stay), rounding up, caps, not available before `validFrom`; adoption age limits 7/10/14, 9-week minimum, professional foster refused.

**Allocation:** mother's 14 weeks; resignation handover the next day; 8-week special cases; ≤6 weeks pre-birth; 5 parts shared between parents; 6th part refused; 225 days → 1 day `EXCESS_DAYS`; reserved 9 weeks not transferable; simultaneous use; horizon; paternity 14 or 7+7, third part, after 12 months; work fraction > ½ rejected; extension and caps.

**Rates:** 81.5 on day 21 vs day 22; other parent's 9 weeks 70%; supplementary 100% inside an 81.5 plan; no parental day in year 1 → 70% + top-up entitlement flag; work reduction.

**Base:** 12-month average; <12 months; first month; month with <½ worked excluded, ≥½ topped up; all months <½; work-time change → full months after; full-time floor, no floor for part-time; no cap with actual contributions (2,45% case); bonuses; carried-over base after sickness with <1 month gap; Art. 48a dilution; non-employee cap; preferential base.

**Amount and gating:** daily rounding; month split 30/31 days; PIT advance; top-up trigger and statement requirement; arrears just below / above threshold, payer's account for collaborators, repaid later → paid, not repaid in 6 months → expired, instalment agreement ignored; waiting period 30/90 with bridging; sick pay 33 vs 14 days; 270-day period and code-B restart.

**Routing:** payer >20 vs ≤20 on 30 Nov; self-employed always ZUS; after-title always ZUS; document sets per scenario; deadline dates.

**Worked examples (digest 02 §3.5)** — one test each, values asserted to the grosz:

| ID | Assertion |
|---|---|
| E1 | base 6 903,20; option A daily 230,11 / 161,07, total 68 295,08; option B daily 187,54, total 68 264,56 |
| E2 | floor 4 147,10 → 3 379,89 (81.5%) / 2 902,97 (70%); no top-up |
| E3 | 33 days sick pay then sickness at 100%; maternity base carried over; without code B → 80% and 182 days |
| E4 | base 1 294,35; 70% → 906,05; net below floor → top-up; student under 26 → not insured |
| E5 | Art. 48a base 8 910,31; 81.5% → 7 261,90; 60 zł arrears → withheld, expiry date |
| E6 | twins 31 + 34 weeks at 81.5%; supplementary uses lowest weight and longest stay |
| E7 | half-time: 2 416,12 / month; extension 16 weeks; extension at half-time → 32 weeks |
| E8 | week 30, 1 400 g, 25 days → 4 weeks; week 26 with 12 weeks → 12; week 39, days 10–13 → 1 |
| E9 | 56 days at 100% + funeral grant entitlement |
| E10 | foster child aged 6,5 → leave to the 7th birthday, minimum 9 weeks; parental 38 weeks (flagged interpretation) |

**Personas (digest 03 §4)** — P1–P12 with their variants as tests (P1 daily 186,96 and 152,37, total 55 462,68; P2 161,07 and 112,75; P3 132,49 with debt and late variants; P4 top-up; P5 waiting-period and no-insurance variants; P6 56 days; P7 31 + 5 + 34 weeks; P8 Art. 30 chain and resignation twin; P9 alert, not refusal; P10 three variants; P11 age and foster variants; P12 top-up, parts limit, 225th day). `[E]`-marked values in the digest are asserted as rates and day counts only.

**Property tests:** total days never exceed statutory pools; `gross = Σ months.gross`; adding a block never increases another block's daily amount; evaluation is deterministic and independent of block order; every `Period` has ≥1 trace step.

## 10. Build order (review checkpoints)

| Slice | Content | Exit |
|---|---|---|
| 1 | types, money, dates, parameter sets + selection | primitives tests green |
| 2 | insurance stage + event stage | all refused-for-insurance fixtures match on outcome |
| 3 | lengths + allocation | duration tier green |
| 4 | base + rate + amount | E1–E8, amount tier green |
| 5 | gating (arrears, sickness waiting, 270 days), Art. 30 | debt and sickness fixtures green |
| 6 | routing, documents, deadlines | persona tests green |
| 7 | alerts + alert-recall test | 100% recall on refusals |
| 8 | trace completeness, report, property tests | `npm run verify` green; `_report.json` committed |

## 11. Risks

| Risk | Mitigation |
|---|---|
| OCR errors in amounts | Printed-triple consistency check; doubtful values omitted rather than asserted. |
| Benefit base not derivable from the file | `statedBenefitBase` with evidence; amount tier checks rate and daily. |
| Sickness-in-pregnancy tracker (270 days, restart, sick-pay days) is large | Slice 5 is timeboxed; most sickness cases only need 100% + payer + waiting period. |
| Uncertain interpretations | Parameter flags; changing one is a data change with a visible golden diff. |
| Cases that do not reproduce | `knownDivergence` (≤5) with explanation, shown on the scoreboard. |
| Top-up proration for partial months | Parameter `proration`; assert only where a payment is printed. |
| Alert rules overfitted to the 12 refusals | Negative test: no `blocking` alert on any of the 72 granted cases in pre-event replay (warnings allowed). |
