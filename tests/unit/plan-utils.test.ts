import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluate } from "@/engine";
import type { ParameterSet, Plan } from "@/engine/types";
import { assemble } from "@/server/assemble";
import { addDays, buildPreset, cashFlow, daysBetween, initChain, reflow } from "@/app/(app)/plan/plan-utils";

const sets = fs
  .readdirSync("data/params")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(`data/params/${f}`, "utf8"))) as ParameterSet[];

function personaFacts(id: string, answers: Record<string, unknown> = {}) {
  const p = JSON.parse(fs.readFileSync(`data/personas/${id}.json`, "utf8"));
  return assemble({ payloads: p.systems, meta: {}, answers: { expectedDate: "2027-03-12", ...answers }, overrides: [], asOf: p.asOf, mode: "mobywatel" }).facts;
}

describe("dates", () => {
  it("adds days across months and leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(daysBetween("2027-03-12", "2027-07-30")).toBe(140);
  });
});

describe("chain", () => {
  const plan: Plan = {
    rateOption: "averaged81_5",
    blocks: [
      { id: "m", parent: "claimant", type: "maternity", from: "2027-03-12", days: 140 },
      { id: "p1", parent: "other", type: "parental", from: "2027-07-30", days: 63, pool: "ownNineWeeks" },
      { id: "p2", parent: "claimant", type: "parental", from: "2027-10-01", days: 161 },
      { id: "o", parent: "other", type: "paternity", from: "2027-03-12", days: 14 },
    ],
  };
  it("links blocks that start the day after their predecessor, across parents", () => {
    const c = initChain(plan);
    expect(c.order).toEqual(["m", "p1", "p2"]);
    expect(c.linked).toEqual({ p1: true, p2: true });
  });
  it("moves linked blocks when an earlier block changes length; paternity stays put", () => {
    const c = initChain(plan);
    const edited = reflow({ ...plan, blocks: plan.blocks.map((b) => (b.id === "m" ? { ...b, days: 147 } : b)) }, c);
    expect(edited.blocks.find((b) => b.id === "p1")!.from).toBe("2027-08-06");
    expect(edited.blocks.find((b) => b.id === "p2")!.from).toBe("2027-10-08");
    expect(edited.blocks.find((b) => b.id === "o")!.from).toBe("2027-03-12");
  });
  it("leaves an unlinked block where it is", () => {
    const c = initChain(plan);
    c.linked.p2 = false;
    const edited = reflow({ ...plan, blocks: plan.blocks.map((b) => (b.id === "m" ? { ...b, days: 147 } : b)) }, c);
    expect(edited.blocks.find((b) => b.id === "p2")!.from).toBe("2027-10-01");
  });
});

describe("presets produce plans the engine accepts", () => {
  const facts = personaFacts("monika"); // twins, father consented
  const base = evaluate(facts, null, sets);
  const ctx = { anchor: (facts.event as { date: string }).date, motherSide: "claimant" as const, fatherSide: null, pools: base.pools, adoption: false, rateOption: "averaged81_5" as const };
  it("single parent: everything to the mother, no violations", () => {
    const plan = buildPreset("allMother", ctx)!;
    const r = evaluate(facts, plan, sets);
    expect(r.violations).toEqual([]);
    expect(plan.blocks.find((b) => b.type === "maternity")!.days).toBe(base.pools.maternityDays.total);
  });
  it("part-time doubles calendar days of the parental block but uses the same pool", () => {
    const full = buildPreset("allMother", ctx)!;
    const part = buildPreset("partTime", ctx)!;
    const fp = full.blocks.find((b) => b.type === "parental")!;
    const pp = part.blocks.find((b) => b.type === "parental")!;
    expect(pp.days).toBe(fp.days * 2);
    expect(pp.workFraction).toEqual({ num: 1, den: 2 });
    expect(evaluate(facts, part, sets).violations.filter((v) => v.code === "EXCESS_DAYS" || v.code === "POOL_EXCEEDED")).toEqual([]);
  });
  it("presets that need a second parent return null without one", () => {
    expect(buildPreset("equal", ctx)).toBeNull();
    expect(buildPreset("fatherNine", ctx)).toBeNull();
  });
});

describe("cash flow", () => {
  it("monthly rows add up to the engine totals (net excludes the top-up)", () => {
    const facts = personaFacts("magdalena");
    const r = evaluate(facts, null, sets);
    const rows = cashFlow(r);
    const gross = rows.reduce((a, x) => a + x.claimant.gross + x.other.gross, 0);
    const net = rows.reduce((a, x) => a + x.claimant.net + x.claimant.topUp + x.other.net + x.other.topUp, 0);
    const counted = r.periods.filter((p) => p.status !== "refused");
    expect(gross).toBe(counted.reduce((a, p) => a + p.months.reduce((x, m) => x + m.gross, 0), 0));
    expect(net).toBe(r.totals.netEstimate);
  });
});
