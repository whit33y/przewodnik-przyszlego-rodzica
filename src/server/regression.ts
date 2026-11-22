/**
 * "Sprawdź na 86 sprawach" (plan 06 §5) — pure: no I/O, no framework, so it is unit-tested directly.
 *
 * Every fixture is evaluated with the published list and with the candidate list (the draft inserted at its
 * validFrom, replacing a published set with the same date) and compared with ZUS's decision. Because the cases
 * are dated 2024–2026, a draft effective in the future governs none of them; a second, "what-if" run therefore
 * applies the draft's changes to every published set — the answer to "what would this rule have done to the
 * decisions we know". The demo personas (due dates in 2027) show the forward-looking effect.
 */
import { compare, evaluate, selectParameterSet, type CaseExpected, type Facts, type ParameterSet, type Plan, type Result } from "@/engine";
import { diffSets, getPath, setPath } from "./params-schema";

export interface RegressionCase {
  id: string;
  title: string;
  scenario: string;
  facts: Facts;
  plan: Plan;
  expected: CaseExpected;
}

export interface RegressionPersona {
  id: string;
  label: string;
  facts: Facts;
}

export interface Snapshot {
  setId: string;
  outcome: string;
  gross: number;
  days: number;
  golden: "match" | "mismatch" | "error";
  mismatches: number;
}

export interface CaseRow {
  id: string;
  title: string;
  scenario: string;
  /** The draft is the set selected for this case in the candidate list. */
  inWindow: boolean;
  before: Snapshot;
  after: Snapshot;
  whatIf: Snapshot;
}

export interface PersonaVariant {
  setId: string;
  gross: number;
  /** Monthly gross for the first parental period of the claimant (what the planner shows). */
  parentalMonthly: number | null;
  parentalRateBps: number | null;
}

export interface PersonaRow {
  id: string;
  label: string;
  eventDate: string | null;
  inWindow: boolean;
  defaultOption: Plan["rateOption"] | null;
  before: { default: PersonaVariant | null; split: PersonaVariant | null };
  after: { default: PersonaVariant | null; split: PersonaVariant | null };
  error?: string;
}

export interface RegressionSummary {
  version: 1;
  draftId: string;
  payloadHash: string;
  ranAt: string;
  durationMs: number;
  baseId: string;
  window: { from: string; to: string | null };
  changedPaths: string[];
  totals: {
    cases: number;
    inWindow: { governed: number; affected: number; goldenBefore: number; goldenAfter: number };
    whatIf: { affected: number; goldenAfter: number };
    personas: { inWindow: number; affected: number };
  };
  cases: CaseRow[];
  personas: PersonaRow[];
}

/** The published set a draft would replace (same validFrom) or follow (latest earlier), else the earliest. */
export function baseSetFor(draft: Pick<ParameterSet, "id" | "validFrom">, published: ParameterSet[]): ParameterSet | null {
  const others = published.filter((s) => s.id !== draft.id);
  if (others.length === 0) return null;
  return selectParameterSet(others, draft.validFrom);
}

/** Date window the draft would govern: from its validFrom to the next published set (exclusive). */
export function draftWindow(draft: Pick<ParameterSet, "id" | "validFrom">, published: ParameterSet[]): { from: string; to: string | null } {
  const next = published
    .filter((s) => s.id !== draft.id && s.validFrom > draft.validFrom)
    .map((s) => s.validFrom)
    .sort()[0];
  return { from: draft.validFrom, to: next ?? null };
}

/** Published list with the draft inserted, replacing a published set with the same validFrom. */
export function candidateList(draft: ParameterSet, published: ParameterSet[]): ParameterSet[] {
  return [...published.filter((s) => s.validFrom !== draft.validFrom && s.id !== draft.id), draft];
}

/** Every published set with the draft's changed parameters applied on top (ids and dates kept). */
export function whatIfList(draft: ParameterSet, published: ParameterSet[], changedPaths: string[]): ParameterSet[] {
  return published.map((s) => changedPaths.reduce((acc, p) => setPath(acc, p, structuredClone(getPath(draft, p))), s));
}

function snapshot(c: RegressionCase, sets: ParameterSet[]): Snapshot {
  try {
    const r = evaluate(c.facts, c.plan, sets);
    const fields = compare(r, c.expected);
    const mismatches = fields.filter((f) => f.status === "mismatch").length;
    return { setId: r.parameterSetId, outcome: r.outcome.value, gross: r.totals.gross, days: r.totals.days, golden: mismatches ? "mismatch" : "match", mismatches };
  } catch {
    return { setId: "", outcome: "error", gross: 0, days: 0, golden: "error", mismatches: 0 };
  }
}

const differs = (a: Snapshot, b: Snapshot) => a.outcome !== b.outcome || a.gross !== b.gross || a.days !== b.days || a.golden !== b.golden;

function personaVariant(r: Result): PersonaVariant {
  const par = r.periods.filter((p) => p.parent === "claimant" && p.type === "parental").sort((a, b) => a.from.localeCompare(b.from))[0];
  return { setId: r.parameterSetId, gross: r.totals.gross, parentalMonthly: par ? par.daily * 30 : null, parentalRateBps: par ? par.rateBps : null };
}

function personaRun(facts: Facts, sets: ParameterSet[]): { default: PersonaVariant | null; split: PersonaVariant | null; option: Plan["rateOption"] | null } {
  const base = evaluate(facts, null, sets);
  const plan = base.defaultPlan;
  if (!plan) return { default: personaVariant(base), split: null, option: null };
  const split = plan.rateOption === "split100_70" ? base : evaluate(facts, { ...plan, rateOption: "split100_70" }, sets);
  return { default: personaVariant(base), split: personaVariant(split), option: plan.rateOption };
}

const sameVariant = (a: PersonaVariant | null, b: PersonaVariant | null) => JSON.stringify(a && { ...a, setId: "" }) === JSON.stringify(b && { ...b, setId: "" });

export function runRegression(input: {
  draft: ParameterSet;
  published: ParameterSet[];
  cases: RegressionCase[];
  personas: RegressionPersona[];
  payloadHash: string;
  now: Date;
}): RegressionSummary {
  const t0 = performance.now();
  const { draft, published } = input;
  const base = baseSetFor(draft, published) ?? draft;
  const changedPaths = diffSets(base, draft).map((d) => d.path);
  const candidate = candidateList(draft, published);
  const whatIf = whatIfList(draft, published, changedPaths);

  const cases: CaseRow[] = input.cases.map((c) => {
    const before = snapshot(c, published);
    const after = snapshot(c, candidate);
    return { id: c.id, title: c.title, scenario: c.scenario, inWindow: after.setId === draft.id, before, after, whatIf: snapshot(c, whatIf) };
  });

  const personas: PersonaRow[] = input.personas.map((p) => {
    const e = p.facts.event;
    const eventDate = e.kind === "birth" ? e.date ?? e.expectedDate ?? null : e.takenIntoCareOn;
    try {
      const b = personaRun(p.facts, published);
      const a = personaRun(p.facts, candidate);
      return { id: p.id, label: p.label, eventDate, inWindow: a.default?.setId === draft.id, defaultOption: b.option, before: { default: b.default, split: b.split }, after: { default: a.default, split: a.split } };
    } catch (err) {
      return { id: p.id, label: p.label, eventDate, inWindow: false, defaultOption: null, before: { default: null, split: null }, after: { default: null, split: null }, error: (err as Error).message };
    }
  });

  const governed = cases.filter((c) => c.inWindow);
  return {
    version: 1,
    draftId: draft.id,
    payloadHash: input.payloadHash,
    ranAt: input.now.toISOString(),
    durationMs: Math.round(performance.now() - t0),
    baseId: base.id,
    window: draftWindow(draft, published),
    changedPaths,
    totals: {
      cases: cases.length,
      inWindow: {
        governed: governed.length,
        affected: cases.filter((c) => differs(c.before, c.after)).length,
        goldenBefore: cases.filter((c) => c.before.golden === "match").length,
        goldenAfter: cases.filter((c) => c.after.golden === "match").length,
      },
      whatIf: { affected: cases.filter((c) => differs(c.before, c.whatIf)).length, goldenAfter: cases.filter((c) => c.whatIf.golden === "match").length },
      personas: {
        inWindow: personas.filter((p) => p.inWindow).length,
        affected: personas.filter((p) => !sameVariant(p.before.default, p.after.default) || !sameVariant(p.before.split, p.after.split)).length,
      },
    },
    cases,
    personas,
  };
}

export function caseChanged(row: CaseRow, mode: "after" | "whatIf"): boolean {
  return differs(row.before, row[mode]);
}
