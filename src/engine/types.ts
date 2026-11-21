/**
 * Rules engine types — the contract between the engine, the data layer, fixtures and the UI.
 * Spec: docs/plan/02-phase-1-engine.md §2 and §5. Money in grosze, rates in basis points, dates as ISO days.
 */
export type ISODate = string;      // 'YYYY-MM-DD'
export type YearMonth = string;    // 'YYYY-MM'
export type Grosze = number;       // integer
export type Bps = number;          // 10000 = 100%
export interface Fraction { num: number; den: number }

// ───────── Facts ─────────
export interface Facts {
  asOf: ISODate;                   // evaluation date ("today"); in case mode = application date
  parameterDate?: ISODate;         // overrides parameter-set selection (anonymised, shifted case dates)
  mode?: 'prospective' | 'adjudication';   // explicit override; otherwise derived (see engine/index.ts)
  claimant: Person;
  otherParent?: OtherParent;
  event: FamilyEvent;
}

export type Role = 'mother' | 'father' | 'adoptive' | 'foster' | 'otherFamily';

export interface Person {
  sex: 'F' | 'M';
  birthYear?: number;              // enough for the 50+ sick-pay rule; absent → assumed under 50 (traced)
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
  over20Insured?: boolean;                        // Z-3 checkbox (>20 sickness-insured); preferred over the count
  insuredOn30NovPrevYear?: number;
  status?: 'active' | 'liquidation' | 'bankruptcy' | 'closed' | 'deceased';
  relatedToClaimant?: boolean;                    // family firm (risk signal only)
  sameFirmPriorContract?: boolean;                // zlecenie → employment at the same firm (risk signal)
}

export interface MonthRecord {
  month: YearMonth;
  contributionBase: Grosze;                       // sickness-insurance base (gross) or declared base
  employeeContributions?: Grosze;                 // actual deduction; absent → base × deduction rate
  deductionBps?: Bps;                             // Z-3 deduction % column (e.g. 245 above the annual cap)
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
  account: 'own' | 'payer'; onDate: ISODate;
  amount?: Grosze;                                // when printed
  aboveThreshold?: boolean;                       // memo "zadłużenie TAK/NIE"; required when amount is absent
  repaidOn?: ISODate; instalmentAgreement?: boolean;
}

export interface InsuranceDecision {
  titleId: string; kind: 'nonCoverage' | 'baseReduced';
  from: ISODate; reducedBase?: Grosze;
}

export type FamilyEvent = BirthEvent | CareEvent;

/** Proof documents present in the file / held by the user (drive CERTIFICATE_TYPE and the document list). */
export type DocumentCode =
  | 'birthAct' | 'stillbirthCert' | 'zaZyciemCert' | 'hospitalStayCert'
  | 'courtOrder' | 'interimCareOrder' | 'fosterCert' | 'pregnancyCert';

export interface BirthEvent {
  kind: 'birth';
  expectedDate?: ISODate;
  date?: ISODate;                                 // absent (and not `occurred`) → prospective
  occurred?: boolean;                             // event happened, date unknown / not in the file
  children: Child[];
  pregnancyDuringEmploymentCertified?: boolean;   // Art. 30 evidence
  mother?: MotherCircumstances;                   // when the claimant is not the mother
  documents?: DocumentCode[];
}

export interface CareEvent {
  kind: 'adoption' | 'foster';
  takenIntoCareOn: ISODate;
  petitionFiledOn?: ISODate;
  interimOrderOn?: ISODate;                       // interim order entrusting care for the proceedings
  finalOrderOn?: ISODate;
  fosterType?: 'nonProfessional' | 'professional';
  children: Child[];
  previouslyUsedAsFoster?: { leaveDays: number; parentalDays: number };
  documents?: DocumentCode[];
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
  dataMissing?: boolean;                          // no months and no stated base: amounts are a floor/placeholder
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
