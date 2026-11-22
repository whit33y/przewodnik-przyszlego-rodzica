/**
 * Facts assembler — pure, no I/O. Registry payloads + user answers + user overrides → engine Facts,
 * plus a provenance map (fact path → source) the UI joins to source badges, plus the questions
 * that no available source could answer. Spec: docs/plan/03-phase-2-data-layer.md §2.
 */
import { netOfDeduction } from "@/engine/money";
import type { BirthEvent, Bps, CareEvent, Child, Facts, FamilyEvent, InsuranceTitle, ISODate, OtherParent, Person, Role } from "@/engine/types";
import { SOURCES } from "@/integrations/sources";
import type { Answers, SourceId, SystemId, SystemPayloads } from "@/integrations/types";

export type FactPath = string;
export interface ProvenanceEntry {
  source: SourceId;
  asOf: ISODate;
  overridden?: { original: unknown; at: string; note?: string };
}
export type Provenance = Record<FactPath, ProvenanceEntry>;

export interface Override {
  path: FactPath;
  value: unknown;
  at: string;
  note?: string;
}

export type QuestionId = "expectedDate" | "childrenCount" | "zaZyciem" | "hospital" | "plannedEnd" | "otherParent" | "eventKind" | "careDetails" | "manual" | "arrears";

export interface Question {
  id: QuestionId;
  group: "event" | "insurance" | "otherParent" | "you";
  required: boolean;
}

export interface AssembleInput {
  payloads: Partial<SystemPayloads>;
  meta: Partial<Record<SourceId, { asOf: ISODate }>>;
  answers: Answers;
  overrides: Override[];
  asOf: ISODate;
  mode: "mobywatel" | "manual" | "case";
  otherParentPerson?: Person;
  /** Registries that answered (state `ok`), even with an empty payload. Default: the keys of `payloads`. */
  checked?: SystemId[];
  /** Employee social-insurance deduction of the parameter set in force (gross pay → benefit base). */
  deductionBps: Bps;
}

export interface Assembled {
  facts: Facts;
  provenance: Provenance;
  missing: Question[];
  /**
   * Registries we did not read (declined, skipped, unavailable or still pending) whose facts the user has not
   * supplied either. Their facts are absent from `facts`, and absence must never be shown as "nothing there".
   */
  unverified: SystemId[];
}

/** Paths a user may correct live in ./override-rules.ts (whitelist + a zod schema per path). */

export function assemble(input: AssembleInput): Assembled {
  const { payloads: p, answers, asOf } = input;
  const provenance: Provenance = {};
  const at = (source: SourceId): ISODate => input.meta[source]?.asOf ?? asOf;
  const mark = (path: FactPath, source: SourceId) => {
    provenance[path] = { source, asOf: at(source) };
  };
  const extras = answers.caseExtras;

  // ── Claimant ──────────────────────────────────────────────────────────────
  const manual = answers.manual;
  let titles: InsuranceTitle[] = (p["zus-konto"]?.titles ?? []).map((t) => ({ ...t, payer: { ...t.payer } }) as InsuranceTitle);
  if (p["zus-konto"]) mark("facts.claimant.titles", "zus-konto");

  // Payer size and status from the payer registry and KRS.
  titles.forEach((t, i) => {
    const payer = p["zus-platnik"]?.payers.find((x) => x.ref === t.payer.ref);
    if (payer) {
      Object.assign(t.payer, stripUndef(payer));
      mark(`facts.claimant.titles[${i}].payer`, "zus-platnik");
    }
    const krs = p.krs?.payerStatus.find((x) => x.ref === t.payer.ref);
    if (krs) {
      t.payer.status = krs.status;
      mark(`facts.claimant.titles[${i}].payer.status`, "krs");
    }
  });
  // Business suspensions from CEIDG.
  for (const s of p.ceidg?.suspensions ?? []) {
    const i = titles.findIndex((t) => t.id === s.titleId);
    if (i >= 0) {
      titles[i].suspensions = [...(titles[i].suspensions ?? []), stripUndef({ from: s.from, to: s.to })];
      mark(`facts.claimant.titles[${i}].suspensions`, "ceidg");
    }
  }
  if (!p["zus-konto"] && manual) {
    titles = manualTitles(manual, input.deductionBps);
    mark("facts.claimant.titles", "user");
  }
  // User-declared future change (contract ending, business closing).
  if (answers.plannedEnd) {
    const i = titles.findIndex((t) => t.id === answers.plannedEnd!.titleId);
    if (i >= 0) {
      titles[i].plannedEnd = { date: answers.plannedEnd.date, reason: answers.plannedEnd.reason };
      mark(`facts.claimant.titles[${i}].plannedEnd`, "user");
    }
  }

  const sex = p.mobywatel?.sex ?? manual?.sex ?? "F";
  if (p.mobywatel) {
    mark("facts.claimant.sex", "mobywatel");
    if (p.mobywatel.birthYear) mark("facts.claimant.birthYear", "mobywatel");
  } else if (manual) mark("facts.claimant.sex", "user");
  const rscKind = p.rsc?.event?.kind as FamilyEvent["kind"] | undefined;
  const eventKind = extras?.event?.kind ?? rscKind ?? answers.eventKind ?? "birth";
  const { role, roleSource } = claimantRole();
  if (roleSource) mark("facts.claimant.role", roleSource);

  function claimantRole(): { role: Role; roleSource?: SourceId } {
    if (extras?.claimantRole) return { role: extras.claimantRole, roleSource: "zus-konto" };
    if (p["zus-konto"]?.role) return { role: p["zus-konto"].role, roleSource: "zus-konto" };
    if (manual?.role) return { role: manual.role, roleSource: "user" };
    if (eventKind !== "birth") return { role: eventKind === "adoption" ? "adoptive" : "foster", roleSource: rscKind ? "rsc" : "user" };
    return { role: sex === "F" ? "mother" : "father", roleSource: p.mobywatel ? "mobywatel" : undefined };
  }

  const declaredArrears = manual?.arrears ?? answers.arrears;
  const claimant: Person = stripUndef({
    sex,
    birthYear: p.mobywatel?.birthYear,
    role,
    titles,
    sickNotes: p["zus-ezla"]?.sickNotes ?? [],
    paidBenefits: p["zus-swiadczenia"]?.paidBenefits ?? [],
    arrears: p["zus-saldo"]?.arrears ?? (declaredArrears ? [{ account: "own", onDate: asOf, aboveThreshold: true }] : []),
    insuranceDecisions: p["zus-postepowania"]?.insuranceDecisions ?? [],
    flags: p["zus-konto"]?.flags,
  }) as Person;
  if (p["zus-ezla"]) mark("facts.claimant.sickNotes", "zus-ezla");
  if (p["zus-swiadczenia"]) mark("facts.claimant.paidBenefits", "zus-swiadczenia");
  if (p["zus-saldo"]) mark("facts.claimant.arrears", "zus-saldo");
  else if (declaredArrears !== undefined) mark("facts.claimant.arrears", "user");
  if (p["zus-postepowania"]) mark("facts.claimant.insuranceDecisions", "zus-postepowania");

  // ── Event ─────────────────────────────────────────────────────────────────
  let event: FamilyEvent;
  if (eventKind === "birth") {
    const rsc = p.rsc?.event?.kind === "birth" ? p.rsc.event : undefined;
    const ez = p.ezdrowie;
    const count = Math.max(1, answers.childrenCount ?? rsc?.children.length ?? ez?.children?.length ?? 1);
    const children: Child[] = Array.from({ length: count }, (_, i) => {
      const ref = rsc?.children[i]?.ref ?? ez?.children?.[i]?.ref ?? `child-${i + 1}`;
      const fromRsc = rsc?.children.find((c) => c.ref === ref) ?? {};
      const fromEz = ez?.children?.find((c) => c.ref === ref) ?? {};
      const known = "gestationalWeek" in fromEz || "hospitalStays" in fromEz;
      return stripUndef({ ref, ...(known ? {} : whatIfChild(answers, rsc?.date ?? answers.expectedDate ?? ez?.expectedDate)), ...fromEz, ...fromRsc, ...(answers.zaZyciem !== undefined ? { zaZyciem: answers.zaZyciem } : {}) }) as Child;
    });
    event = stripUndef({
      kind: "birth",
      expectedDate: answers.expectedDate ?? ez?.expectedDate,
      date: rsc?.date,
      occurred: rsc?.occurred,
      children,
    }) as BirthEvent;
    if (rsc) mark("facts.event.date", "rsc");
    // Coarse first, then per child field: the longest-prefix lookup picks the most specific source.
    if (answers.childrenCount !== undefined) mark("facts.event.children", "user");
    else if (rsc) mark("facts.event.children", "rsc");
    else if (ez?.children?.length) mark("facts.event.children", "ezdrowie");
    children.forEach((ch, i) => {
      const fields = (o: object | undefined) => Object.entries(o ?? {}).filter(([k, v]) => k !== "ref" && v !== undefined).map(([k]) => k);
      for (const k of fields(ez?.children?.find((c) => c.ref === ch.ref))) mark(`facts.event.children[${i}].${k}`, "ezdrowie");
      for (const k of fields(rsc?.children.find((c) => c.ref === ch.ref))) mark(`facts.event.children[${i}].${k}`, "rsc");
      const ezChild = ez?.children?.find((c) => c.ref === ch.ref) ?? {};
      if (!("gestationalWeek" in ezChild || "hospitalStays" in ezChild)) for (const k of Object.keys(whatIfChild(answers, rsc?.date ?? answers.expectedDate ?? ez?.expectedDate))) mark(`facts.event.children[${i}].${k}`, "user");
      if (answers.zaZyciem !== undefined) mark(`facts.event.children[${i}].zaZyciem`, "user");
    });
    if (answers.expectedDate) mark("facts.event.expectedDate", "user");
    else if (ez?.expectedDate) mark("facts.event.expectedDate", "ezdrowie");
  } else {
    const rsc = p.rsc?.event && p.rsc.event.kind !== "birth" ? p.rsc.event : undefined;
    event = stripUndef({
      kind: eventKind,
      takenIntoCareOn: rsc?.takenIntoCareOn ?? answers.care?.takenIntoCareOn ?? asOf,
      finalOrderOn: rsc?.finalOrderOn,
      interimOrderOn: rsc?.interimOrderOn,
      petitionFiledOn: answers.care?.petitionFiledOn,
      fosterType: answers.care?.fosterType,
      children: rsc?.children ?? [{ ref: "child-1", birthDate: answers.care?.childBirthDate, schoolDeferred: answers.care?.schoolDeferred }],
    }) as CareEvent;
    mark("facts.event", rsc ? "rsc" : "user");
    if (answers.care?.petitionFiledOn) mark("facts.event.petitionFiledOn", "user");
    if (answers.care?.fosterType) mark("facts.event.fosterType", "user");
  }
  // Case extras carry everything no registry owns; they win so a case round-trips exactly.
  if (extras?.event) event = { ...event, ...extras.event } as FamilyEvent;

  // ── Other parent ──────────────────────────────────────────────────────────
  let otherParent: OtherParent | undefined = extras?.otherParent;
  if (!otherParent && answers.otherParent && answers.otherParent.mode !== "none" && answers.otherParent.mode !== "invited") {
    const op = answers.otherParent;
    otherParent = stripUndef({
      role: op.role ?? (role === "father" ? "mother" : "father"),
      insured: op.insured ?? (input.otherParentPerson ? "yes" : "unknown"),
      person: op.mode === "consent" ? input.otherParentPerson : undefined,
      // Estimated gross pay → base with the parameter set's deduction (never a hard-coded rate).
      estimatedBase: op.mode === "estimate" && op.estimatedGross !== undefined ? netOfDeduction(op.estimatedGross, input.deductionBps) : undefined,
      // What the other parent already used is that parent's data: only after he or she joined (case files carry it as extras).
      used: op.mode === "consent" ? (input.otherParentPerson?.paidBenefits ?? []) : [],
    }) as OtherParent;
    mark("facts.otherParent", op.mode === "consent" ? "zus-konto" : "user");
    if (op.mode === "consent") mark("facts.otherParent.used", "zus-swiadczenia");
  }

  let facts: Facts = stripUndef({
    asOf,
    parameterDate: extras?.parameterDate,
    mode: extras?.mode,
    claimant,
    otherParent,
    event,
  }) as Facts;

  // ── Overrides (never delete the original: kept in provenance) ────────────
  for (const o of input.overrides) {
    const original = getPath(facts, o.path);
    facts = setPath(facts, o.path, o.value);
    provenance[o.path] = { source: "user", asOf: o.at.slice(0, 10), overridden: { original, at: o.at, note: o.note } };
  }

  const unverified = unverifiedSystems(input);
  return { facts, provenance, missing: questions(facts, answers, input, unverified), unverified };
}

/** Systems neither read nor replaced by the user's own statements (case mode: the file stands in for every registry). */
function unverifiedSystems(input: AssembleInput): SystemId[] {
  if (input.mode === "case") return [];
  const { answers } = input;
  const checked = new Set<string>(input.checked ?? Object.keys(input.payloads));
  const coveredByUser: Partial<Record<SystemId, boolean>> = {
    mobywatel: Boolean(answers.manual),
    "zus-konto": Boolean(answers.manual),
    "zus-saldo": answers.manual?.arrears !== undefined || answers.arrears !== undefined,
  };
  return SOURCES.map((s) => s.id).filter((id) => !checked.has(id) && !coveredByUser[id]);
}

function questions(facts: Facts, answers: Answers, input: AssembleInput, unverified: SystemId[]): Question[] {
  if (input.mode === "case") return [];
  const q: Question[] = [];
  // Without the insurance account (declined, unavailable, or manual mode) the user describes their work themselves.
  if (!answers.manual && (input.mode === "manual" || unverified.includes("zus-konto"))) q.push({ id: "manual", group: "you", required: true });
  const selfEmployed = facts.claimant.titles.some((t) => t.kind === "selfEmployed" || t.kind === "collaborator");
  if (selfEmployed && unverified.includes("zus-saldo")) q.push({ id: "arrears", group: "insurance", required: false });
  const ev = facts.event;
  if (ev.kind === "birth" && !ev.date && !ev.occurred) {
    if (!ev.expectedDate) q.push({ id: "expectedDate", group: "event", required: true });
    if (answers.childrenCount === undefined && !input.payloads.ezdrowie?.children?.length) q.push({ id: "childrenCount", group: "event", required: false });
  }
  // Never asked after a loss: the "Za życiem" certificate concerns a living child.
  const loss = ev.kind === "birth" && ev.children.some((c) => c.bornAlive === false);
  if (ev.kind === "birth" && !loss && answers.zaZyciem === undefined && !ev.children.some((c) => c.zaZyciem !== undefined)) q.push({ id: "zaZyciem", group: "event", required: false });
  // Adoption / foster care: court and PCPR dates are in no registry we can read — the parent gives them.
  if (ev.kind !== "birth" && !input.payloads.rsc?.event && answers.care?.takenIntoCareOn === undefined) q.push({ id: "careDetails", group: "event", required: true });
  const liveBirth = ev.kind === "birth" && (ev.date || ev.occurred) && ev.children.some((c) => c.bornAlive !== false);
  const childDetailsKnown = ev.kind === "birth" && ev.children.some((c) => c.gestationalWeek !== undefined || c.hospitalStays?.length);
  if (liveBirth && !childDetailsKnown && answers.whatIf?.hospital === undefined) q.push({ id: "hospital", group: "event", required: false });
  const ongoing = facts.claimant.titles.some((t) => !t.to && t.kind !== "maternityBenefit");
  if (ongoing && answers.plannedEnd === undefined && !(ev.kind === "birth" && ev.date)) q.push({ id: "plannedEnd", group: "insurance", required: false });
  if (!facts.otherParent && answers.otherParent === undefined) q.push({ id: "otherParent", group: "otherParent", required: false });
  return q;
}

/** Maps the planner's hospital category to the statutory cases (no weight/week inputs needed). */
function whatIfChild(answers: Answers, birth?: ISODate): Partial<Child> {
  const h = answers.whatIf?.hospital;
  if (!h || h.category === "none" || !birth || h.days <= 0) return {};
  const shape = { preterm: { gestationalWeek: 32, birthWeightG: 1800 }, extreme: { gestationalWeek: 26, birthWeightG: 900 }, term: { gestationalWeek: 39, birthWeightG: 3300 } }[h.category];
  const [y, m, d] = birth.split("-").map(Number);
  const iso = (n: number) => new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  const startOffset = h.category === "term" ? 4 : 0; // term babies: stay counted from day 5 of life
  return { ...shape, hospitalStays: [{ from: iso(startOffset), to: iso(startOffset + h.days - 1) }] };
}

function manualTitles(m: NonNullable<Answers["manual"]>, deductionBps: Bps): InsuranceTitle[] {
  if (m.work === "none") return [];
  const kind = m.work === "employment" ? "employment" : m.work === "mandate" ? "mandate" : "selfEmployed";
  const mode = m.sicknessInsurance;
  return [
    stripUndef({
      id: "t1",
      kind,
      from: m.since,
      sickness: { mode, periods: mode === "none" ? [] : [{ from: m.since }] },
      registeredOn: m.since,
      workTime: kind === "employment" && m.fraction ? [{ from: m.since, fraction: m.fraction }] : undefined,
      payer: { ref: "payer-1", kind: kind === "employment" ? "employer" : kind === "mandate" ? "client" : "self", over20Insured: m.over20Insured },
      months: [],
      // Gross pay → benefit base with the employee social-insurance deduction of the parameter set in force.
      statedBenefitBase: m.monthlyGross !== undefined ? netOfDeduction(m.monthlyGross, deductionBps) : undefined,
    }) as InsuranceTitle,
  ];
}

// ── Path helpers: "facts.claimant.titles[0].from" ─────────────────────────────
function tokens(path: string): (string | number)[] {
  return path
    .replace(/^facts\.?/, "")
    .split(/\.|\[(\d+)\]/)
    .filter((t) => t !== undefined && t !== "")
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const t of tokens(path)) {
    if (cur == null) return undefined;
    cur = (cur as Record<string | number, unknown>)[t];
  }
  return cur;
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const ts = tokens(path);
  const root = structuredClone(obj) as Record<string | number, unknown>;
  let cur = root;
  ts.forEach((t, i) => {
    if (i === ts.length - 1) cur[t] = value;
    else {
      if (cur[t] == null) cur[t] = typeof ts[i + 1] === "number" ? [] : {};
      cur = cur[t] as Record<string | number, unknown>;
    }
  });
  return root as T;
}

/** Longest-prefix lookup: provenance is recorded at the coarsest path sharing a source. */
export function lookupProvenance(prov: Provenance, path: string): ProvenanceEntry | undefined {
  let p = path;
  while (p) {
    if (prov[p]) return prov[p];
    const cut = Math.max(p.lastIndexOf("."), p.lastIndexOf("["));
    if (cut <= 0) break;
    p = p.slice(0, cut);
  }
  return undefined;
}

function stripUndef<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripUndef) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined)
        .map(([k, x]) => [k, stripUndef(x)]),
    ) as T;
  }
  return v;
}
