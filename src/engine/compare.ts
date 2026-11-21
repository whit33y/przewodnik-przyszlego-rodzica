/**
 * Golden comparison (plan 02 §6 assertion rules, §8). Pure; used by tests/golden and by /sprawy.
 * - Outcome tier: outcome value equal; expected reason codes ⊆ engine codes; each benefit status equal.
 * - Duration tier: days / from / to per (type, parent).
 * - Amount tier: base, daily, rate, payments (gross / net), paidBy, toppedUp — to the grosz.
 * `printed` values are asserted (match / mismatch); `claimed` and `inferred` values are compared and reported,
 * never failed; fields listed in `knownDivergence` turn a mismatch into `knownDivergence`; `pending` benefits are skipped.
 */
import type { CaseExpected, CaseInput, CaseVariant, ExpectedBenefit, Stated } from "./case-types";
import type { Facts, Period, Plan, Result } from "./types";

export type Tier = "outcome" | "duration" | "amount";
export type FieldStatus = "match" | "mismatch" | "reported" | "knownDivergence";
export interface FieldResult { path: string; tier: Tier; status: FieldStatus; expected: unknown; actual: unknown }

const STATUS_MAP: Record<string, Period["status"]> = { granted: "payable", refused: "refused", withheld: "withheld" };

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function overlap(aFrom: string, aTo: string, bFrom: string, bTo: string): number {
  const from = aFrom > bFrom ? aFrom : bFrom;
  const to = aTo < bTo ? aTo : bTo;
  if (to < from) return 0;
  const d = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / 86_400_000;
  return Math.round(d(to) - d(from)) + 1;
}

export function compare(result: Result, expected: CaseExpected): FieldResult[] {
  const out: FieldResult[] = [];
  const diverging = expected.knownDivergence?.fields ?? [];
  const push = (path: string, tier: Tier, exp: unknown, act: unknown, evidence: Stated<unknown>["evidence"] | "always" = "always") => {
    let status: FieldStatus = eq(exp, act) ? "match" : evidence === "printed" || evidence === "always" ? "mismatch" : "reported";
    if (status === "mismatch" && diverging.some((f) => path === f || path.startsWith(f + ".") || path.startsWith(f + "["))) status = "knownDivergence";
    out.push({ path, tier, status, expected: exp, actual: act });
  };
  const stated = <T>(path: string, tier: Tier, s: Stated<T> | undefined, actual: unknown) => {
    if (s) push(path, tier, s.value, actual, s.evidence);
  };

  push("outcome.value", "outcome", expected.outcome.value, result.outcome.value);
  expected.outcome.reasonCodes.forEach((code, i) => {
    push(`outcome.reasonCodes[${i}]`, "outcome", code, result.outcome.reasonCodes.includes(code) ? code : result.outcome.reasonCodes);
  });

  expected.benefits.forEach((b: ExpectedBenefit, i) => {
    if (b.status === "pending") return;
    const path = `benefits[${i}]`;
    const all = result.periods.filter((p) => p.type === b.type && p.parent === b.parent);
    const matched = all.filter((p) => p.status === STATUS_MAP[b.status]);
    push(`${path}.status`, "outcome", b.status, matched.length ? b.status : all.length ? [...new Set(all.map((p) => p.status))].join("+") : "missing");
    if (!matched.length) return;
    const from = matched.map((p) => p.from).sort()[0];
    const to = matched.map((p) => p.to).sort().at(-1);
    stated(`${path}.days`, "duration", b.days, matched.reduce((a, p) => a + p.days, 0));
    stated(`${path}.from`, "duration", b.from, from);
    stated(`${path}.to`, "duration", b.to, to);
    const uniq = <T>(xs: T[]) => { const u = [...new Set(xs)]; return u.length === 1 ? u[0] : u; };
    stated(`${path}.rateBps`, "amount", b.rateBps, uniq(matched.map((p) => p.rateBps)));
    stated(`${path}.base`, "amount", b.base, uniq(matched.map((p) => p.base)));
    stated(`${path}.daily`, "amount", b.daily, uniq(matched.map((p) => p.daily)));
    stated(`${path}.paidBy`, "amount", b.paidBy, uniq(matched.map((p) => p.paidBy)));
    stated(`${path}.toppedUp`, "amount", b.toppedUp, matched.some((p) => p.months.some((m) => m.topUp > 0)));
    (b.payments ?? []).forEach((row, j) => {
      let gross = 0;
      let days = 0;
      let net: number | undefined = 0;
      for (const p of matched) {
        const d = overlap(row.from, row.to, p.from, p.to);
        if (!d) continue;
        days += d;
        gross += p.daily * d;
        const m = p.months.find((x) => x.month === row.from.slice(0, 7));
        // Net is known per (period, month); it is comparable when the row is exactly that slice.
        if (m && m.days === d && net !== undefined) net += m.net + m.topUp;
        else net = undefined;
      }
      stated(`${path}.payments[${j}].gross`, "amount", row.gross, days === row.days ? gross : { gross, days });
      if (row.net) stated(`${path}.payments[${j}].net`, "amount", row.net, net ?? "notComparable");
    });
  });
  return out;
}

// ───────── variants (RFC 6902 JSON Patch subset: add / remove / replace) ─────────

type PatchOp = { op: "add" | "remove" | "replace"; path: string; value?: unknown };

export function applyJsonPatch<T>(doc: T, ops: unknown): T {
  const copy = JSON.parse(JSON.stringify(doc)) as T;
  if (!Array.isArray(ops)) return copy;
  for (const raw of ops as PatchOp[]) {
    const keys = raw.path.split("/").slice(1).map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~"));
    const last = keys.pop()!;
    let parent: Record<string, unknown> | unknown[] = copy as unknown as Record<string, unknown>;
    for (const k of keys) parent = (parent as Record<string, unknown>)[k] as Record<string, unknown>;
    if (Array.isArray(parent)) {
      const idx = last === "-" ? parent.length : Number(last);
      if (raw.op === "add") parent.splice(idx, 0, raw.value);
      else if (raw.op === "remove") parent.splice(idx, 1);
      else parent[idx] = raw.value;
    } else {
      if (raw.op === "remove") delete parent[last];
      else parent[last] = raw.value;
    }
  }
  return copy;
}

/** Facts, plan and the expected values of a variant: only the expected fields the variant states are asserted. */
export function applyVariant(input: Pick<CaseInput, "facts" | "plan">, base: CaseExpected, v: CaseVariant): { facts: Facts; plan: Plan; expected: CaseExpected } {
  return {
    facts: applyJsonPatch(input.facts, v.factsPatch),
    plan: v.planPatch ? applyJsonPatch(input.plan, v.planPatch) : input.plan,
    expected: {
      ...base,
      outcome: v.expected.outcome ?? base.outcome,
      benefits: v.expected.benefits ?? [],
      expectedAlerts: v.expected.expectedAlerts ?? [],
      knownDivergence: v.expected.knownDivergence,
      variants: undefined,
    },
  };
}
