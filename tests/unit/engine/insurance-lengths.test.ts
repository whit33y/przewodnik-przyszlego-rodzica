import { describe, expect, it } from "vitest";
import { insuredOn, supplementaryWeeks, type Child } from "@/engine";
import { addDays } from "@/engine/dates";
import { birth, block, employee, father, mandate, payableDays, periodsOf, person, plan, p2026, run, selfEmployed, sets } from "./helpers";

describe("insurance timeline", () => {
  it("employee covered from start to end of the contract", () => {
    const p = person([employee({ from: "2025-01-10", to: "2026-03-31" })]);
    expect(insuredOn(p, "2025-01-10", p2026).insured).toBe(true);
    expect(insuredOn(p, "2026-03-31", p2026).mode).toBe("mandatory");
    expect(insuredOn(p, "2026-04-01", p2026).insured).toBe(false);
    expect(insuredOn(p, "2025-01-09", p2026).insured).toBe(false);
  });
  it("voluntary cover starts on the ZUA receipt date, not the contract date (filed > 7 days late)", () => {
    const p = person([mandate({ from: "2025-09-01", registeredOn: "2025-09-20" })]);
    expect(insuredOn(p, "2025-09-10", p2026).insured).toBe(false);
    expect(insuredOn(p, "2025-09-20", p2026)).toMatchObject({ insured: true, mode: "voluntary" });
  });
  it("ZUA filed within 7 days keeps the declared start", () => {
    const p = person([selfEmployed({ from: "2025-11-01", registeredOn: "2025-11-05" })]);
    expect(insuredOn(p, "2025-11-01", p2026).insured).toBe(true);
  });
  it("CEIDG suspension ends cover", () => {
    const p = person([selfEmployed({ from: "2025-01-01", extra: { suspensions: [{ from: "2026-06-01", to: "2026-07-31" }] } })]);
    expect(insuredOn(p, "2026-06-15", p2026).insured).toBe(false);
    expect(insuredOn(p, "2026-08-01", p2026).insured).toBe(true);
  });
  it("ulga na start gives no insurance", () => {
    const p = person([selfEmployed({ from: "2026-01-01", scheme: "ulgaNaStart" })]);
    expect(insuredOn(p, "2026-03-01", p2026)).toMatchObject({ insured: false, reasonCode: "NO_INSURANCE_SCHEME" });
  });
  it("mandate of a student under 26 gives no insurance", () => {
    const p = person([mandate({ from: "2025-01-01" })], { flags: { studentUnder26: true } });
    expect(insuredOn(p, "2025-06-01", p2026)).toMatchObject({ insured: false, reasonCode: "NO_INSURANCE_SCHEME" });
  });
  it("a non-coverage decision voids the title", () => {
    const p = person([employee({ from: "2026-01-01" })], { insuranceDecisions: [{ titleId: "t1", kind: "nonCoverage", from: "2026-01-01" }] });
    expect(insuredOn(p, "2026-04-01", p2026)).toMatchObject({ insured: false, reasonCode: "TITLE_INVALIDATED" });
  });
  it("deregistration for concurrence with maternity benefit still covers the day the right arises", () => {
    const t = selfEmployed({ from: "2025-01-01", periods: [{ from: "2025-01-01", to: "2026-05-31" }], extra: { to: "2026-05-31", endReason: "deregisteredBenefitConcurrence" } });
    const r = run(birth({ asOf: "2026-06-10", date: "2026-06-01", claimant: person([t], { arrears: [] }) }), plan([block("m", "maternity", "2026-06-01", 140)]));
    expect(r.outcome.value).toBe("granted");
  });
  it("mandate without voluntary sickness insurance → maternity refused from that title", () => {
    const r = run(birth({ asOf: "2026-08-01", date: "2026-07-20", claimant: person([mandate({ from: "2025-09-01", mode: "none" })]) }), plan([block("m", "maternity", "2026-07-20", 140)]));
    expect(r.outcome).toMatchObject({ value: "refused" });
    expect(r.outcome.reasonCodes).toContain("NO_SICKNESS_INSURANCE_ON_TITLE");
  });
  it("Art. 30: liquidation in pregnancy → pre-birth benefit and maternity after the title", () => {
    const t = employee({ from: "2019-03-01", to: "2026-08-31", endReason: "employerLiquidation", gross: 720000, ref: "2026-08-31", over20: true });
    const facts = birth({ asOf: "2026-11-20", date: "2026-11-08", expected: "2026-11-10", claimant: person([t]) });
    const r = run(facts, plan([block("a", "art30PreBirth", "2026-09-01", 68), block("m", "maternity", "2026-11-08", 140)]));
    expect(r.outcome.value).toBe("granted");
    expect(periodsOf(r, "art30PreBirth")[0]).toMatchObject({ from: "2026-09-01", to: "2026-11-07", rateBps: 10000, paidBy: "zus", daily: 20710 });
    expect(periodsOf(r, "maternity").every((p) => p.paidBy === "zus")).toBe(true);
  });
  it("Art. 30: resignation does not qualify", () => {
    const t = employee({ from: "2019-03-01", to: "2026-08-31", endReason: "resignation" });
    const r = run(birth({ asOf: "2026-11-20", date: "2026-11-08", claimant: person([t]) }), plan([block("a", "art30PreBirth", "2026-09-01", 68), block("m", "maternity", "2026-11-08", 140)]));
    expect(r.outcome.value).toBe("refused");
    expect(r.outcome.reasonCodes).toEqual(expect.arrayContaining(["TITLE_END_NOT_QUALIFYING", "NOT_INSURED_AT_EVENT"]));
  });
  it("fixed-term contract extended to the birth: payer pays until the end, ZUS after", () => {
    const t = employee({ from: "2024-11-04", to: "2025-12-27", endReason: "extendedToBirth", over20: true });
    const r = run(birth({ asOf: "2026-01-10", date: "2025-12-27", claimant: person([t]) }), plan([block("m", "maternity", "2025-12-27", 140)]));
    expect(r.outcome.value).toBe("granted");
    const m = periodsOf(r, "maternity");
    expect(m[0]).toMatchObject({ from: "2025-12-27", to: "2025-12-27", paidBy: "payer" });
    expect(m[1]).toMatchObject({ from: "2025-12-28", paidBy: "zus" });
  });
  it("childcare leave counts for maternity benefit", () => {
    const titles = [employee({ from: "2018-01-01", gross: 600000, ref: "2024-05-01" }), { ...employee({ id: "t2", from: "2025-01-01", to: "2027-01-01" }), kind: "childcareLeave" as const, sickness: { mode: "none" as const, periods: [] } }];
    const r = run(birth({ asOf: "2026-04-01", date: "2026-03-15", claimant: person(titles) }), plan([block("m", "maternity", "2026-03-15", 140, { titleId: "t1" })]));
    expect(r.outcome.value).toBe("granted");
  });
});

describe("lengths", () => {
  const twins = (n: number): Child[] => Array.from({ length: n }, (_, i) => ({ ref: `child-${i + 1}`, bornAlive: true }));
  it.each([[1, 140], [2, 217], [3, 231], [4, 245], [5, 259], [6, 259]])("maternity for %i children = %i days", (n, days) => {
    const r = run(birth({ asOf: "2026-06-20", date: "2026-06-15", claimant: person([employee({ from: "2020-01-01" })]), children: twins(n) }));
    expect(r.pools.maternityDays.total).toBe(days);
  });
  it("parental 41/43 weeks, 65/67 with Za życiem, minus the other parent's 9 weeks", () => {
    const cases: [number, boolean, number, number][] = [[1, false, 287, 224], [2, false, 301, 238], [1, true, 455, 392], [2, true, 469, 406]];
    for (const [n, zz, total, mine] of cases) {
      const children = twins(n).map((c) => ({ ...c, zaZyciem: zz }));
      const r = run(birth({ asOf: "2026-06-20", date: "2026-06-15", claimant: person([employee({ from: "2020-01-01" })]), children }));
      expect(r.pools.parentalDays.total).toBe(total);
      expect(payableDays(r, "parental")).toBe(mine);
    }
  });
  it("stillbirth: 56 days at 100%, twins not multiplied, no parental", () => {
    for (const n of [1, 2]) {
      const children = twins(n).map((c) => ({ ...c, bornAlive: false }));
      const r = run(birth({ asOf: "2026-04-20", date: "2026-04-08", claimant: person([employee({ from: "2026-01-12" })]), children }));
      expect(payableDays(r, "maternity")).toBe(56);
      expect(periodsOf(r, "maternity")[0].rateBps).toBe(10000);
      expect(periodsOf(r, "parental")).toEqual([]);
    }
  });
  it("death before 8 weeks: not shorter than 7 days from the death", () => {
    const children = [{ ref: "c", bornAlive: true, deathDate: "2026-06-05" }];
    const r = run(birth({ asOf: "2026-06-20", date: "2026-04-12", claimant: person([employee({ from: "2020-01-01" })]), children }));
    expect(r.pools.maternityDays.total).toBe(61); // 2026-04-12 .. 2026-06-11 (death + 6)
  });
  it("death after 8 weeks: benefits end 7 days after the death", () => {
    const children = [{ ref: "c", bornAlive: true, deathDate: "2026-07-01" }];
    const r = run(birth({ asOf: "2026-07-20", date: "2026-04-01", claimant: person([employee({ from: "2020-01-01" })]), children }));
    expect(r.pools.maternityDays.total).toBe(98); // 2026-04-01 .. 2026-07-07
  });
  it("mixed multiples: length by surviving children", () => {
    const children = [{ ref: "a", bornAlive: true }, { ref: "b", bornAlive: true }, { ref: "c", bornAlive: false }];
    const r = run(birth({ asOf: "2026-06-20", date: "2026-06-15", claimant: person([employee({ from: "2020-01-01" })]), children }));
    expect(r.pools.maternityDays.total).toBe(217);
  });
  it("paternity 14 days until the child is 12 months old", () => {
    const r = run(birth({ asOf: "2026-06-20", date: "2026-05-30", claimant: father([employee({ from: "2020-01-01" })]) }));
    expect(r.pools.paternityDays).toMatchObject({ total: 14, expiresOn: "2027-05-29" });
    expect(r.pools.parentalDeadline).toBe("2032-12-31");
  });
});

describe("supplementary maternity leave (KP 180²)", () => {
  const B = "2026-02-04";
  const stay = (from: number, to: number) => [{ from: addDays(B, from), to: addDays(B, to) }];
  it("extreme preterm: ≤ 1000 g boundary and week 27 vs 28", () => {
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 30, birthWeightG: 1000, hospitalStays: stay(0, 200) }], B, p2026)).toEqual({ weeks: 15, cap: 15 });
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 30, birthWeightG: 1001, hospitalStays: stay(0, 200) }], B, p2026)).toEqual({ weeks: 8, cap: 8 });
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 27, birthWeightG: 1500, hospitalStays: stay(0, 200) }], B, p2026).cap).toBe(15);
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 28, birthWeightG: 1500, hospitalStays: stay(0, 200) }], B, p2026).cap).toBe(8);
  });
  it("preterm: incomplete weeks round up (E8)", () => {
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 30, birthWeightG: 1400, hospitalStays: stay(0, 24) }], B, p2026).weeks).toBe(4);
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 26, birthWeightG: 900, hospitalStays: stay(0, 83) }], B, p2026).weeks).toBe(12);
  });
  it("term: stay of ≥ 2 consecutive days starting between day 5 and 28 of life", () => {
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 39, hospitalStays: stay(10, 13) }], B, p2026).weeks).toBe(1);
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 41, hospitalStays: stay(0, 5) }], B, p2026).weeks).toBe(1); // B4-15
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 41, hospitalStays: stay(0, 3) }], B, p2026).weeks).toBe(0);
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 40, hospitalStays: stay(30, 40) }], B, p2026).weeks).toBe(0);
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 40, hospitalStays: stay(4, 33) }], B, p2026).weeks).toBe(5);
  });
  it("multiples: lowest weight and the longest stay (E6)", () => {
    const children = [
      { ref: "a", gestationalWeek: 30, birthWeightG: 1420, hospitalStays: stay(0, 20) },
      { ref: "b", gestationalWeek: 30, birthWeightG: 980, hospitalStays: stay(0, 32) },
    ];
    expect(supplementaryWeeks(children, B, p2026)).toEqual({ weeks: 5, cap: 15 });
  });
  it("not available before the act came into force", () => {
    const p2024 = sets.find((s) => s.id === "2024-01-01")!;
    expect(supplementaryWeeks([{ ref: "a", gestationalWeek: 30, birthWeightG: 1400, hospitalStays: stay(0, 24) }], B, p2024)).toEqual({ weeks: 0, cap: 0 });
  });
  it("transitional rule: parent no longer on maternity leave on 2025-03-19 → refused", () => {
    const children = [{ ref: "a", bornAlive: true, gestationalWeek: 30, birthWeightG: 1400, hospitalStays: [{ from: "2024-09-01", to: "2024-10-10" }] }];
    const r = run(birth({ asOf: "2025-04-01", date: "2024-09-01", claimant: person([employee({ from: "2020-01-01" })]), children }), plan([block("s", "supplementary", "2025-01-19", 28)]));
    expect(periodsOf(r, "supplementary")[0]).toMatchObject({ status: "refused", reasonCode: "TRANSITIONAL_RULE_NOT_MET" });
  });
});

describe("adoption and foster care", () => {
  const care = (kind: "adoption" | "foster", childBirth: string, extra: object = {}) => ({
    asOf: "2026-03-20", claimant: person([employee({ from: "2020-05-01", gross: 800000, ref: "2026-03-10" })], { role: kind === "adoption" ? "adoptive" as const : "foster" as const }),
    event: { kind, takenIntoCareOn: "2026-03-10", children: [{ ref: "c", birthDate: childBirth }], ...extra },
  });
  it("adoption of a 3-year-old: 20 weeks + 32 weeks", () => {
    const r = run(care("adoption", "2023-01-15") as never);
    expect(payableDays(r, "maternityOnAdoption")).toBe(140);
    expect(payableDays(r, "parental")).toBe(224);
  });
  it("age limits: adoption 14, foster 7 (10 with deferred schooling)", () => {
    expect(run(care("adoption", "2012-01-01") as never).outcome).toMatchObject({ value: "refused", reasonCodes: ["CHILD_AGE_LIMIT"] });
    expect(run(care("foster", "2018-01-01") as never).outcome.reasonCodes).toContain("CHILD_AGE_LIMIT");
    const deferred = care("foster", "2018-01-01", {}) as { event: { children: object[] } };
    deferred.event.children = [{ ref: "c", birthDate: "2018-01-01", schoolDeferred: true }];
    expect(run(deferred as never).outcome.value).toBe("granted");
  });
  it("professional foster family is excluded", () => {
    expect(run(care("foster", "2023-01-01", { fosterType: "professional" }) as never).outcome.reasonCodes).toContain("FOSTER_PROFESSIONAL");
  });
  it("E10: foster child weeks before the 7th birthday → leave of 9 weeks minimum, parental 38 weeks (flagged)", () => {
    const r = run(care("foster", "2019-04-01") as never); // 7th birthday 2026-04-01, 22 days after care
    expect(r.pools.maternityDays.total).toBe(63);
    expect(r.pools.parentalDays.total).toBe(38 * 7);
  });
});
