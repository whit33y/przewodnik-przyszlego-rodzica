/**
 * Alert recall (plan 02 §8): every expected alert fires in the pre-event replay (severity ≥ high for refusals);
 * post-event alerts fire on the full facts with plan = null; and no granted case raises a blocking alert pre-event.
 */
import { describe, expect, it } from "vitest";
import { evaluate } from "@/engine";
import { loadCases, loadParams } from "./load";
import { preEventFacts } from "./pre-event";
import { postEventAlertCodes, SEVERITY_RANK } from "./report";

const sets = loadParams();
const cases = loadCases();

describe("alert recall (pre-event replay)", () => {
  for (const c of cases.filter((x) => x.expected.expectedAlerts.length)) {
    it(`${c.id}: ${c.expected.expectedAlerts.join(", ")}`, () => {
      const r = evaluate(preEventFacts(c.input), null, sets);
      for (const code of c.expected.expectedAlerts) {
        const a = r.alerts.find((x) => x.code === code);
        expect(a, `${code} not raised; got ${r.alerts.map((x) => x.code).join(", ")}`).toBeDefined();
        if (c.expected.outcome.value === "refused") expect(SEVERITY_RANK[a!.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK.high);
      }
    });
  }
  it("every refusal has at least one expected alert", () => {
    expect(cases.filter((c) => c.expected.outcome.value === "refused" && c.expected.expectedAlerts.length === 0).map((c) => c.id)).toEqual([]);
  });
});

describe("post-event alerts (full facts; plan as filed or plan = null)", () => {
  for (const c of cases.filter((x) => x.expected.expectedAlertsPostEvent?.length)) {
    it(`${c.id}: ${c.expected.expectedAlertsPostEvent!.join(", ")}`, () => {
      const codes = postEventAlertCodes(c.input, sets);
      for (const code of c.expected.expectedAlertsPostEvent!) {
        expect(codes, `${code} not raised`).toContain(code);
      }
    });
  }
});

describe("no blocking alert on granted cases (pre-event replay)", () => {
  for (const c of cases.filter((x) => x.expected.outcome.value === "granted")) {
    it(c.id, () => {
      // Alerts the fixture itself expects (e.g. arrears repaid later, B6-06) are allowed to block.
      const r = evaluate(preEventFacts(c.input), null, sets);
      const allowed = new Set<string>(c.expected.expectedAlerts);
      expect(r.alerts.filter((a) => a.severity === "blocking" && !allowed.has(a.code)).map((a) => `${a.code}@${a.onDate}`)).toEqual([]);
    });
  }
});
