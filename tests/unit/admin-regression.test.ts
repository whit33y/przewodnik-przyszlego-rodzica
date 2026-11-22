/** Regression run for a draft (plan 06 §5): the demo story "parental rate 70% → 75% from 2027-01-01". */
import { describe, expect, it } from "vitest";
import { evaluate, type ParameterSet } from "@/engine";
import { setPath } from "@/server/params-schema";
import { baseSetFor, candidateList, draftWindow, runRegression, whatIfList } from "@/server/regression";
import { loadCases, loadParams } from "../golden/load";

const published = loadParams();
const cases = loadCases().map((c) => ({ id: c.id, title: c.input.title, scenario: c.input.scenario, facts: c.input.facts, plan: c.input.plan, expected: c.expected }));
const current = published.at(-1)!;
const draft: ParameterSet = { ...setPath(current, "rates.parental", 7500), id: "ps-test", validFrom: "2027-01-01", label: "Projekt 2027" };

describe("regression helpers", () => {
  it("base, window and candidate list", () => {
    expect(baseSetFor(draft, published)?.id).toBe("2026-01-01");
    expect(draftWindow(draft, published)).toEqual({ from: "2027-01-01", to: null });
    expect(draftWindow({ id: "x", validFrom: "2025-02-01" }, published)).toEqual({ from: "2025-02-01", to: "2025-03-19" });
    const replacing = { ...draft, validFrom: "2026-01-01" };
    expect(candidateList(replacing, published).map((s) => s.id)).toEqual(["2024-01-01", "2024-07-01", "2025-01-01", "2025-03-19", "ps-test"]);
    const wi = whatIfList(draft, published, ["rates.parental"]);
    expect(wi.map((s) => [s.id, s.rates.parental])).toEqual(published.map((s) => [s.id, 7500]));
    expect(published.every((s) => s.rates.parental === 7000)).toBe(true); // inputs untouched
  });
});

describe("parental rate 70% → 75% from 2027-01-01", () => {
  const persona = {
    id: "p",
    label: "Rodzic 2027",
    facts: {
      asOf: "2026-11-21",
      claimant: {
        sex: "F" as const,
        role: "mother" as const,
        titles: [
          {
            id: "t1",
            kind: "employment" as const,
            from: "2020-01-01",
            sickness: { mode: "mandatory" as const, periods: [{ from: "2020-01-01" }] },
            payer: { ref: "payer-1", kind: "employer" as const, over20Insured: true },
            months: Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, contributionBase: 600000 })),
          },
        ],
        sickNotes: [],
        paidBenefits: [],
        arrears: [],
        insuranceDecisions: [],
      },
      event: { kind: "birth" as const, expectedDate: "2027-03-01", children: [{ ref: "c1" }] },
    },
  };
  const summary = runRegression({ draft, published, cases, personas: [persona], payloadHash: "h", now: new Date("2026-11-21T12:00:00Z") });

  it("sample cases (dated 2024–2026) keep their decisions; at most a stray late block falls in the window", () => {
    expect(summary.changedPaths).toEqual(["rates.parental"]);
    expect(summary.totals.cases).toBe(cases.length);
    expect(summary.totals.inWindow.governed).toBeLessThanOrEqual(2);
    expect(summary.totals.inWindow.affected).toBe(0);
    expect(summary.totals.inWindow.goldenAfter).toBe(summary.totals.inWindow.goldenBefore);
  });

  it("what-if run: cases paid at 70% get higher amounts, same outcome and length", () => {
    expect(summary.totals.whatIf.affected).toBeGreaterThan(5);
    expect(summary.totals.whatIf.goldenAfter).toBeLessThanOrEqual(summary.totals.inWindow.goldenBefore);
    const c = summary.cases.find((x) => x.id === "B3-03")!; // father, 32 weeks of parental at 70%
    expect(c.whatIf.gross).toBeGreaterThan(c.before.gross);
    expect([c.whatIf.outcome, c.whatIf.days]).toEqual([c.before.outcome, c.before.days]);
  });

  it("a 2027 birth gets the new rate in the 100%/70% variant", () => {
    const p = summary.personas[0];
    expect(p.error).toBeUndefined();
    expect(p.inWindow).toBe(true);
    expect(p.before.split?.parentalRateBps).toBe(7000);
    expect(p.after.split?.parentalRateBps).toBe(7500);
    expect(p.after.split!.parentalMonthly!).toBeGreaterThan(p.before.split!.parentalMonthly!);
    expect(summary.totals.personas.affected).toBe(1);
    // …and the engine selects the draft for that date, the published 2026 set for an earlier one.
    expect(evaluate(persona.facts, null, candidateList(draft, published)).parameterSetId).toBe("ps-test");
    expect(evaluate({ ...persona.facts, event: { ...persona.facts.event, expectedDate: "2026-12-01" } }, null, candidateList(draft, published)).parameterSetId).toBe("2026-01-01");
  });

  it("runs fast enough to be synchronous", () => {
    expect(summary.durationMs).toBeLessThan(5000);
  });
});
