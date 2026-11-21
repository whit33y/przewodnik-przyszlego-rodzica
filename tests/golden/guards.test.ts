/** Fixture guards (plan 02 §8). */
import { describe, expect, it } from "vitest";
import { ALERT_CODES, REASON_CODES } from "@/integrations/case-schema";
import { loadCases } from "./load";

const cases = loadCases();

describe("fixture guards", () => {
  it("knownDivergence is used by at most 5 cases", () => {
    expect(cases.filter((c) => c.expected.knownDivergence).length).toBeLessThanOrEqual(5);
  });
  it("statedBenefitBase always has provenance", () => {
    const bad = cases.filter((c) =>
      c.input.facts.claimant.titles.some((t, i) => t.statedBenefitBase !== undefined && !c.input.provenance[`facts.claimant.titles[${i}].statedBenefitBase`]),
    );
    expect(bad.map((c) => c.id)).toEqual([]);
  });
  it("every reason and alert code used in fixtures exists in the engine unions", () => {
    const reasons = new Set<string>(REASON_CODES);
    const alerts = new Set<string>(ALERT_CODES);
    for (const c of cases) {
      for (const r of c.expected.outcome.reasonCodes) expect(reasons.has(r), `${c.id}: ${r}`).toBe(true);
      for (const a of [...c.expected.expectedAlerts, ...(c.expected.expectedAlertsPostEvent ?? [])]) expect(alerts.has(a), `${c.id}: ${a}`).toBe(true);
    }
  });
  it("case ids match folders and are unique", () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of cases) expect(c.input.id).toBe(c.expected.id);
  });
});
