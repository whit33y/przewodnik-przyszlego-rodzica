/**
 * Facts assembler — pure, no I/O. Registry payloads + user answers + user overrides → engine Facts,
 * plus a provenance map (fact path → source) the UI joins to source badges, plus the questions
 * that no available source could answer. Spec: docs/plan/03-phase-2-data-layer.md §2.
 */
import type { BirthEvent, CareEvent, Child, Facts, FamilyEvent, InsuranceTitle, ISODate, OtherParent, Person, Role } from "@/engine/types";
import type { Answers, SourceId, SystemPayloads } from "@/integrations/types";

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

export type QuestionId = "expectedDate" | "childrenCount" | "zaZyciem" | "plannedEnd" | "otherParent" | "eventKind" | "careDetails" | "manual";

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
}

export interface Assembled {
  facts: Facts;
  provenance: Provenance;
  missing: Question[];
}

/** Paths a user may correct (each validated by a zod schema at the API boundary). */
export const OVERRIDABLE = [
  /^facts\.event\.expectedDate$/,
  /^facts\.event\.date$/,
  /^facts\.claimant\.titles\[\d+\]\.(from|to|registeredOn)$/,
  /^facts\.claimant\.titles\[\d+\]\.statedBenefitBase$/,
  /^facts\.claimant\.titles\[\d+\]\.payer\.over20Insured$/,
  /^facts\.claimant\.titles\[\d+\]\.months\[\d+\]\.contributionBase$/,
  /^facts\.claimant\.titles\[\d+\]\.sickness\.mode$/,
  /^facts\.claimant\.arrears\[\d+\]\.(amount|repaidOn)$/,
];

export function isOverridable(path: string): boolean {
  return OVERRIDABLE.some((re) => re.test(path));
}

export function assemble(input: AssembleInput): Assembled {
  const { payloads: p, answers, asOf } = input;
  const provenance: Provenance = {};
  const at = (source: SourceId): ISODate => input.meta[source]?.asOf ?? asOf;
  const mark = (path: FactPath, source: SourceId) => {
    provenance[path] = { source, asOf: at(source) };
  };
  const extras = answers.caseExtras;
  const userSrc: SourceId = "user";

  // ── Claimant ──────────────────────────────────────────────────────────────
  const manual = answers.manual;
  let titles: InsuranceTitle[] = (p["zus-konto"]?.titles ?? []).map((t) => ({ ...t, payer: { ...t.payer } }) as InsuranceTitle);
  if (p["zus-konto"]) mark("facts.claimant.titles", "zus-konto");

  // Payer size and status from the payer registry and KRS.
  for (const t of titles) {
    const payer = p["zus-platnik"]?.payers.find((x) => x.ref === t.payer.ref);
    if (payer) {
      Object.assign(t.payer, stripUndef(payer));
      mark(`facts.claimant.titles[${titles.indexOf(t)}].payer`, "zus-platnik");
    }
    const krs = p.krs?.payerStatus.find((x) => x.ref === t.payer.ref);
    if (krs) {
      t.payer.status = krs.status;
      mark(`facts.claimant.titles[${titles.indexOf(t)}].payer.status`, "krs");
    }
  }
  // Business suspensions from CEIDG.
  for (const s of p.ceidg?.suspensions ?? []) {
    const i = titles.findIndex((t) => t.id === s.titleId);
    if (i >= 0) {
      titles[i].suspensions = [...(titles[i].suspensions ?? []), stripUndef({ from: s.from, to: s.to })];
      mark(`facts.claimant.titles[${i}].suspensions`, "ceidg");
    }
  }
  if (!p["zus-konto"] && manual) titles = manualTitles(manual);
  // User-declared future change (contract ending, business closing).
  if (answers.plannedEnd) {
    const i = titles.findIndex((t) => t.id === answers.plannedEnd!.titleId);
    if (i >= 0) {
      titles[i].plannedEnd = { date: answers.plannedEnd.date, reason: answers.plannedEnd.reason };
      mark(`facts.claimant.titles[${i}].plannedEnd`, "user");
    }
  }

  const sex = p.mobywatel?.sex ?? manual?.sex ?? "F";
  if (p.mobywatel) mark("facts.claimant.sex", "mobywatel");
  const eventKind = extras?.event?.kind ?? (p.rsc?.event?.kind as FamilyEvent["kind"] | undefined) ?? answers.eventKind ?? "birth";
  const role: Role = extras?.claimantRole ?? p["zus-konto"]?.role ?? manual?.role ?? (eventKind === "adoption" ? "adoptive" : eventKind === "foster" ? "foster" : sex === "F" ? "mother" : "father");

  const claimant: Person = stripUndef({
    sex,
    birthYear: p.mobywatel?.birthYear,
    role,
    titles,
    sickNotes: p["zus-ezla"]?.sickNotes ?? [],
    paidBenefits: p["zus-swiadczenia"]?.paidBenefits ?? [],
    arrears: p["zus-saldo"]?.arrears ?? (manual?.arrears ? [{ account: "own", onDate: asOf, aboveThreshold: true }] : []),
    insuranceDecisions: p["zus-postepowania"]?.insuranceDecisions ?? [],
    flags: p["zus-konto"]?.flags,
  }) as Person;
  if (p["zus-ezla"]) mark("facts.claimant.sickNotes", "zus-ezla");
  if (p["zus-swiadczenia"]) mark("facts.claimant.paidBenefits", "zus-swiadczenia");
  if (p["zus-saldo"]) mark("facts.claimant.arrears", "zus-saldo");
  if (p["zus-postepowania"]) mark("facts.claimant.insuranceDecisions", "zus-postepowania");
  if (manual) {
    mark("facts.claimant.titles", "user");
    if (manual.arrears !== undefined) mark("facts.claimant.arrears", "user");
  }

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
      return stripUndef({ ref, ...fromEz, ...fromRsc, ...(answers.zaZyciem !== undefined ? { zaZyciem: answers.zaZyciem } : {}) }) as Child;
    });
    event = stripUndef({
      kind: "birth",
      expectedDate: answers.expectedDate ?? ez?.expectedDate,
      date: rsc?.date,
      occurred: rsc?.occurred,
      children,
    }) as BirthEvent;
    if (rsc) mark("facts.event.date", "rsc");
    if (rsc) mark("facts.event.children", "rsc");
    if (answers.expectedDate) mark("facts.event.expectedDate", "user");
    else if (ez?.expectedDate) mark("facts.event.expectedDate", "ezdrowie");
    if (answers.zaZyciem !== undefined) mark("facts.event.children.zaZyciem", "user");
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
  }
  // Case extras carry everything no registry owns; they win so a case round-trips exactly.
  if (extras?.event) event = { ...event, ...extras.event } as FamilyEvent;

  // ── Other parent ──────────────────────────────────────────────────────────
  let otherParent: OtherParent | undefined = extras?.otherParent;
  if (!otherParent && answers.otherParent && answers.otherParent.mode !== "none") {
    otherParent = stripUndef({
      role: answers.otherParent.role ?? (role === "father" ? "mother" : "father"),
      insured: answers.otherParent.insured ?? (input.otherParentPerson ? "yes" : "unknown"),
      person: answers.otherParent.mode === "consent" ? input.otherParentPerson : undefined,
      estimatedBase: answers.otherParent.mode === "estimate" ? answers.otherParent.estimatedBase : undefined,
      used: p["zus-swiadczenia"]?.otherParentUsed ?? [],
    }) as OtherParent;
    mark("facts.otherParent", answers.otherParent.mode === "consent" ? "zus-konto" : "user");
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

  return { facts, provenance, missing: questions(facts, answers, input) };
}

function questions(facts: Facts, answers: Answers, input: AssembleInput): Question[] {
  if (input.mode === "case") return [];
  const q: Question[] = [];
  if (input.mode === "manual" && !answers.manual) q.push({ id: "manual", group: "you", required: true });
  const ev = facts.event;
  if (ev.kind === "birth" && !ev.date && !ev.occurred) {
    if (!ev.expectedDate) q.push({ id: "expectedDate", group: "event", required: true });
    if (answers.childrenCount === undefined && !input.payloads.ezdrowie?.children?.length) q.push({ id: "childrenCount", group: "event", required: false });
  }
  if (ev.kind === "birth" && answers.zaZyciem === undefined && !ev.children.some((c) => c.zaZyciem !== undefined)) q.push({ id: "zaZyciem", group: "event", required: false });
  const ongoing = facts.claimant.titles.some((t) => !t.to && t.kind !== "maternityBenefit");
  if (ongoing && answers.plannedEnd === undefined && !(ev.kind === "birth" && ev.date)) q.push({ id: "plannedEnd", group: "insurance", required: false });
  if (!facts.otherParent && answers.otherParent === undefined) q.push({ id: "otherParent", group: "otherParent", required: false });
  return q;
}

function manualTitles(m: NonNullable<Answers["manual"]>): InsuranceTitle[] {
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
      statedBenefitBase: m.monthlyGross !== undefined ? Math.round((m.monthlyGross * 8629) / 10000) : undefined,
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
