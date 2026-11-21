import { describe, expect, it } from "vitest";
import { computeBase, type InsuranceTitle } from "@/engine";
import { birth, block, codes, employee, father, mandate, months, payableDays, periodsOf, person, plan, p2026, run, selfEmployed, sets } from "./helpers";

const B = "2026-06-15";
const emp8000 = () => employee({ from: "2020-01-01", gross: 800000, ref: B });
const base = (t: InsuranceTitle, date: string, p = person([t])) => computeBase(t, date, { person: p, sets }, p2026);

describe("allocation", () => {
  it("mother's 14 weeks before handing over to the father", () => {
    const mother = { insuredAtBirth: true as const, maternityUsed: { from: B, to: "2026-09-13", rateBps: 10000 } }; // 91 days
    const facts = birth({ asOf: "2026-09-01", date: B, claimant: father([employee({ from: "2020-01-01" })]) });
    (facts.event as { mother?: object }).mother = mother;
    const r = run(facts, plan([block("f", "maternity", "2026-09-14", 49, { takeover: "afterResignation" })]));
    expect(r.outcome.reasonCodes).toContain("MOTHER_MINIMUM_WEEKS");
    expect(r.violations.find((v) => v.code === "MOTHER_MINIMUM_WEEKS")?.values.requiredDays).toBe(98);
    (facts.event as { mother: { maternityUsed: { to: string } } }).mother.maternityUsed.to = "2026-09-20"; // 98 days
    const ok = run(facts, plan([block("f", "maternity", "2026-09-21", 42, { takeover: "afterResignation" })]));
    expect(ok.outcome.value).toBe("granted");
  });
  it("8 weeks suffice when the mother is hospitalised", () => {
    const facts = birth({ asOf: "2026-09-01", date: B, claimant: father([employee({ from: "2020-01-01" })]) });
    (facts.event as { mother?: object }).mother = { insuredAtBirth: true, maternityUsed: { from: B, to: "2026-08-09", rateBps: 10000 } };
    expect(run(facts, plan([block("f", "maternity", "2026-08-10", 30, { takeover: "motherHospital" })])).outcome.value).toBe("granted");
  });
  it("at most 6 weeks before the due date", () => {
    const facts = birth({ asOf: "2026-05-01", date: B, expected: B, claimant: person([emp8000()]) });
    const r = run(facts, plan([block("m", "maternity", "2026-04-27", 140)]));
    const refused = periodsOf(r, "maternity").filter((p) => p.status === "refused");
    expect(refused[0]).toMatchObject({ from: "2026-04-27", to: "2026-05-03", reasonCode: "EXCESS_DAYS" });
    expect(r.outcome.value).toBe("partial");
  });
  it("225 days of parental for one child → only the 225th day refused (B3-14)", () => {
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([emp8000()]) }), plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 225)]));
    expect(r.outcome).toMatchObject({ value: "partial", reasonCodes: ["EXCESS_DAYS"] });
    expect(payableDays(r, "parental")).toBe(224);
    expect(r.violations.find((v) => v.code === "EXCESS_DAYS")?.values.allowedDays).toBe(224);
    expect(r.violations.some((v) => v.code === "RESERVED_WEEKS")).toBe(true);
    expect(codes(r)).toContain("DAY_COUNT_MISMATCH");
  });
  it("5 parental parts are shared by both parents; the 6th is refused (B4-12)", () => {
    const facts = birth({ asOf: "2024-08-01", date: "2023-12-01", claimant: father([employee({ from: "2020-01-01" })]) });
    facts.claimant.paidBenefits = [1, 2, 3, 4].map((k) => ({ type: "parental" as const, titleId: "t1", from: `2024-0${k + 1}-01`, to: `2024-0${k + 1}-14` }));
    facts.otherParent = { role: "mother", insured: "yes", used: [{ type: "parental", from: "2024-04-20", to: "2024-10-20" }] };
    const r = run(facts, plan([block("p6", "parental", "2024-11-01", 7)]));
    expect(r.outcome).toMatchObject({ value: "refused", reasonCodes: ["PARTS_LIMIT"] });
    expect(r.violations[0].values.partsUsed).toBe(5);
    expect(codes(r)).toContain("PARTS_LIMIT_NEAR");
  });
  it("parents may use parental leave simultaneously", () => {
    const facts = birth({ asOf: "2026-06-20", date: B, claimant: father([employee({ from: "2020-01-01" })]) });
    facts.otherParent = { role: "mother", insured: "yes", used: [{ type: "maternity", from: B, to: "2026-11-01" }, { type: "parental", from: "2026-11-02", to: "2027-06-13" }] };
    expect(run(facts, plan([block("p", "parental", "2026-12-01", 63, { pool: "ownNineWeeks" })])).outcome.value).toBe("granted");
  });
  it("parental after the end of the year the child turns 6 → refused days", () => {
    const r = run(birth({ asOf: "2032-12-01", date: "2026-05-30", claimant: father([employee({ from: "2020-01-01" })]) }), plan([block("p", "parental", "2032-12-20", 21, { pool: "ownNineWeeks" })]));
    expect(periodsOf(r, "parental").find((p) => p.status === "refused")).toMatchObject({ from: "2033-01-01", reasonCode: "DEADLINE_PASSED" });
  });
  it("paternity: 14 days or 7 + 7; a third part and days after 12 months refused", () => {
    const f = () => birth({ asOf: "2026-06-20", date: "2026-05-30", claimant: father([employee({ from: "2020-01-01", gross: 560000, ref: "2026-06-01" })]) });
    expect(run(f(), plan([block("a", "paternity", "2026-09-21", 14)])).outcome.value).toBe("granted");
    expect(run(f(), plan([block("a", "paternity", "2026-07-01", 7), block("b", "paternity", "2026-09-01", 7)])).outcome.value).toBe("granted");
    const third = run(f(), plan([block("a", "paternity", "2026-07-01", 7), block("b", "paternity", "2026-08-01", 4), block("c", "paternity", "2026-09-01", 3)]));
    expect(third.outcome.reasonCodes).toContain("PARTS_LIMIT");
    const late = run(f(), plan([block("a", "paternity", "2027-05-31", 14)]));
    expect(late.outcome).toMatchObject({ value: "refused", reasonCodes: ["DEADLINE_PASSED"] });
  });
  it("work fraction above ½ is rejected", () => {
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([emp8000()]) }), plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 100, { workFraction: { num: 3, den: 4 } })]));
    expect(periodsOf(r, "parental")[0]).toMatchObject({ status: "refused", reasonCode: "WORK_FRACTION_TOO_HIGH" });
    expect(r.violations.find((v) => v.code === "WORK_FRACTION_TOO_HIGH")?.values).toMatchObject({ maxNum: 1, maxDen: 2 });
  });
  it("E7: combining with ½-time work — 2 416,12 / month, extension 16 weeks, 64 weeks when the extension is combined too", () => {
    const facts = birth({ asOf: "2026-06-20", date: B, claimant: person([emp8000()]) });
    const r = run(facts, plan([block("m", "maternity", B, 140), block("p1", "parental", "2026-11-02", 224, { workFraction: { num: 1, den: 2 } }), block("p2", "parental", "2027-06-14", 224, { workFraction: { num: 1, den: 2 } })]));
    expect(r.outcome.value).toBe("granted");
    const p1 = periodsOf(r, "parental")[0];
    expect(p1).toMatchObject({ rateBps: 7000, workReductionBps: 5000, extensionDays: 112 });
    expect(p1.daily).toBe(8054);
    expect(r.pools.parentalDays.usedByClaimant).toBe(224);
  });
});

describe("rates", () => {
  const f = () => birth({ asOf: "2026-07-10", date: B, claimant: person([emp8000()]) });
  const blocks = () => [block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)];
  it("81,5% when the application is filed on day 21; 100/70 on day 22 (with a DEADLINE_PASSED violation)", () => {
    const on = run(f(), plan(blocks(), { rateOption: "averaged81_5", applicationDate: "2026-07-06" }));
    expect(on.periods.map((p) => p.rateBps)).toEqual([8150, 8150]);
    const late = run(f(), plan(blocks(), { rateOption: "averaged81_5", applicationDate: "2026-07-07" }));
    expect(late.periods.map((p) => p.rateBps)).toEqual([10000, 7000]);
    expect(late.violations.find((v) => v.code === "DEADLINE_PASSED")?.values.deadline).toBe("2026-07-06");
  });
  it("the other parent's 9 weeks are always 70%", () => {
    const r = run(birth({ asOf: "2026-07-10", date: B, claimant: father([emp8000()]) }), plan([block("p", "parental", "2027-06-14", 63, { pool: "ownNineWeeks" })], { rateOption: "averaged81_5", applicationDate: "2026-06-20" }));
    expect(periodsOf(r, "parental")[0].rateBps).toBe(7000);
  });
  it("supplementary stays at 100% inside an 81,5% plan", () => {
    const children = [{ ref: "c", bornAlive: true, gestationalWeek: 30, birthWeightG: 1400, hospitalStays: [{ from: B, to: "2026-07-09" }] }];
    const r = run(birth({ asOf: "2026-07-10", date: B, claimant: person([emp8000()]), children }), plan([block("m", "maternity", B, 140), block("s", "supplementary", "2026-11-02", 28), block("p", "parental", "2026-11-30", 224)], { rateOption: "averaged81_5", applicationDate: "2026-06-25" }));
    expect(r.periods.map((p) => [p.type, p.rateBps])).toEqual([["maternity", 8150], ["supplementary", 10000], ["parental", 8150]]);
  });
  it("no parental day in the child's first year under 81,5% → parental at 70% and a top-up entitlement", () => {
    const r = run(f(), plan([block("m", "maternity", B, 140), block("p", "parental", "2027-06-15", 224)], { rateOption: "averaged81_5", applicationDate: "2026-06-20" }));
    expect(periodsOf(r, "parental")[0].rateBps).toBe(7000);
    expect(r.entitlements.some((e) => e.benefit === "maternity" && e.status === "informational")).toBe(true);
    expect(codes(r)).toContain("NO_PARENTAL_IN_FIRST_YEAR");
  });
});

describe("base", () => {
  it("12-month average; full-time floor; no floor for part-time", () => {
    expect(base(emp8000(), B)).toMatchObject({ method: "employee12m", base: 690320 });
    expect(base(employee({ from: "2020-01-01", gross: 300000, ref: B }), B)).toMatchObject({ base: 414710, floorApplied: true });
    expect(base(employee({ from: "2020-01-01", gross: 120150, ref: B, fraction: { num: 1, den: 4 } }), B).base).toBe(103677);
  });
  it("< 12 months: full months of insurance only; first month rule", () => {
    const t = employee({ from: "2026-01-12", gross: 500000, ref: "2026-04-08", n: 3 });
    expect(base(t, "2026-04-08")).toMatchObject({ method: "employeeShort", base: 431450 });
    const first = employee({ from: "2026-04-02", extra: { months: [{ month: "2026-04", contributionBase: 300000, fixedPay: 520000, daysWorked: 5, daysDue: 20 }] } });
    expect(base(first, "2026-04-20")).toMatchObject({ method: "employeeFirstMonth", base: 448708 });
  });
  it("months with < ½ worked are excluded, ≥ ½ topped up; all months < ½ → all topped up", () => {
    const t = employee({ from: "2020-01-01", extra: { months: [
      { month: "2026-03", contributionBase: 600000, fixedPay: 600000, daysWorked: 20, daysDue: 20 },
      { month: "2026-04", contributionBase: 300000, fixedPay: 600000, daysWorked: 5, daysDue: 21 },
      { month: "2026-05", contributionBase: 450000, fixedPay: 500000, variablePay: 50000, daysWorked: 15, daysDue: 20 },
    ] } });
    const b = base(t, B);
    expect(b.monthsUsed.find((m) => m.month === "2026-04")?.adjusted).toBe("excluded");
    expect(b.monthsUsed.find((m) => m.month === "2026-05")).toMatchObject({ adjusted: "toppedUp", income: 488977 }); // 500000 + 50000×20/15 = 566667 gross → × 0,8629
    const allLow = employee({ from: "2020-01-01", extra: { months: [{ month: "2026-05", contributionBase: 100000, fixedPay: 600000, daysWorked: 2, daysDue: 20 }] } });
    expect(base(allLow, B).base).toBe(517740);
  });
  it("working-time change → only full months after it (Art. 40)", () => {
    const t: InsuranceTitle = { ...employee({ from: "2020-01-01" }), workTime: [{ from: "2020-01-01", fraction: { num: 1, den: 2 } }, { from: "2026-03-01", fraction: { num: 1, den: 1 } }], months: [...months("2026-03-01", 6, 300000), ...months(B, 3, 600000)] };
    expect(base(t, B)).toMatchObject({ method: "employeeNewWorkTime", base: 517740 });
  });
  it("no cap for employees; actual contributions respected (2,45% above the annual cap)", () => {
    const t = employee({ from: "2020-01-01", extra: { months: months(B, 12, 6000000).map((m) => ({ ...m, employeeContributions: 147000 })) } });
    expect(base(t, B).base).toBe(5853000);
    const t2 = employee({ from: "2020-01-01", extra: { months: months(B, 12, 6000000, { deductionBps: 245 }) } });
    expect(base(t2, B).base).toBe(5853000);
  });
  it("bonuses: annual bonus of the previous year as 1/12", () => {
    const t = employee({ from: "2020-01-01", gross: 500000, ref: B, extra: { annualBonuses: [{ year: 2025, amount: 1200000 }] } });
    expect(base(t, B).base).toBe(431450 + 86290);
  });
  it("carried-over base after sickness with < 1 month gap (Art. 43)", () => {
    const t = selfEmployed({ from: "2026-03-23", extra: { months: [{ month: "2026-04", contributionBase: 565200 }, { month: "2026-05", contributionBase: 565200 }, { month: "2026-06", contributionBase: 565200 }] } });
    const facts = birth({ asOf: "2026-10-09", date: "2026-09-20", claimant: person([t], { paidBenefits: [{ type: "sickness", titleId: "t1", from: "2026-07-06", to: "2026-09-19" }] }) });
    const r = run(facts, plan([block("m", "maternity", "2026-09-20", 140)], { rateOption: "averaged81_5", applicationDate: "2026-10-09" }));
    expect(r.bases[0]).toMatchObject({ method: "carriedOver", base: 487711, carriedOverFrom: "sickness" });
    expect(periodsOf(r, "maternity")[0].daily).toBe(13249);
  });
  it("E5: Art. 48a dilution — 6 months at 15 000 → 8 910,31", () => {
    const t = selfEmployed({ from: "2026-01-01", base: 1500000, ref: "2026-07-15", n: 6 });
    expect(base(t, "2026-07-15")).toMatchObject({ method: "nonEmployeeArt48a", base: 891031 });
    const full = selfEmployed({ from: "2025-01-01", base: 1500000, ref: "2026-07-15", n: 12 });
    expect(base(full, "2026-07-15")).toMatchObject({ method: "nonEmployee12m" });
  });
  it("non-employee cap at 250% of the forecast wage", () => {
    // Each month is capped with its own year's cap; all months in 2026 here.
    const t = selfEmployed({ from: "2020-01-01", base: 3000000, ref: "2027-01-15" });
    expect(base(t, "2027-01-15")).toMatchObject({ base: 2032130, capApplied: true });
  });
  it("preferential base 1 441,80 → 1 244,13", () => {
    const t = selfEmployed({ from: "2025-01-01", base: 144180, ref: B, scheme: "preferential" });
    expect(base(t, B).base).toBe(124413);
  });
  it("stated base wins", () => {
    expect(base({ ...emp8000(), statedBenefitBase: 560885 }, B)).toMatchObject({ method: "stated", base: 560885 });
  });
});

describe("worked examples (digest 02 §3.5)", () => {
  it("E1: option A 230,11 / 161,07 = 68 295,08; option B 187,54 = 68 264,56", () => {
    const f = birth({ asOf: "2026-06-25", date: B, claimant: person([emp8000()]) });
    const a = run(f, plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)]));
    expect(a.periods.map((p) => p.daily)).toEqual([23011, 16107]);
    expect(a.totals.gross).toBe(6829508);
    const b = run(f, plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)], { rateOption: "averaged81_5", applicationDate: "2026-06-25" }));
    expect(b.periods.map((p) => p.daily)).toEqual([18754, 18754]);
    expect(b.totals.gross).toBe(6826456);
  });
  it("E2: minimum-wage floor 4 147,10; no top-up", () => {
    const f = birth({ asOf: "2026-06-25", date: B, claimant: person([employee({ from: "2020-01-01", gross: 480600, ref: B })]) });
    const r = run(f, plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)], { singleTitleStatement: true }));
    expect(r.bases[0].base).toBe(414710);
    expect(r.periods.every((p) => p.months.every((m) => m.topUp === 0))).toBe(true);
  });
  it("E3: 33 days of sick pay, then sickness benefit at 100%; maternity base carried over; without code B → 80% and 182 days", () => {
    const t = employee({ from: "2020-01-01", gross: 650000, ref: "2026-03-02" });
    const b = run(birth({ asOf: "2026-03-05", expected: B, claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-03-02", to: "2026-06-14", code: "B" }] }) }));
    const pay = periodsOf(b, "sickPay")[0];
    expect(pay).toMatchObject({ from: "2026-03-02", to: "2026-04-03", days: 33, paidBy: "payer", rateBps: 10000 });
    expect(periodsOf(b, "sickness")[0]).toMatchObject({ from: "2026-04-04", rateBps: 10000, daily: 18696 });
    expect(b.bases.some((x) => x.method === "carriedOver")).toBe(true);
    const a = run(birth({ asOf: "2026-01-05", expected: "2026-12-30", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-01-05", to: "2026-08-31", code: "A" }] }) }));
    expect(periodsOf(a, "sickness")[0].rateBps).toBe(8000);
    expect(periodsOf(a, "sickness").find((p) => p.status === "refused")).toMatchObject({ from: "2026-07-06", reasonCode: "BENEFIT_PERIOD_EXHAUSTED" });
  });
  it("E4: mandate 1 500 zł → base 1 294,35; 70% → 906,05; topped up; student under 26 not insured", () => {
    const t = mandate({ from: "2025-08-01", income: 150000, ref: B, n: 10 });
    const f = birth({ asOf: "2026-06-25", date: B, claimant: person([t]) });
    const r = run(f, plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)], { singleTitleStatement: true }));
    expect(r.bases[0].base).toBe(129435);
    expect(periodsOf(r, "parental")[0].daily).toBe(3020);
    expect(periodsOf(r, "parental")[0].months.some((m) => m.topUp > 0)).toBe(true);
    const student = run(birth({ asOf: "2026-06-25", date: B, claimant: person([t], { flags: { studentUnder26: true } }) }), plan([block("m", "maternity", B, 140)]));
    expect(student.outcome.value).toBe("refused");
    expect(student.entitlements.some((e) => e.benefit === "parentalBenefitMunicipal")).toBe(true);
  });
  it("E5: 81,5% of 8 910,31 → 7 261,90 / month; 60 zł arrears → withheld until repaid, expiry date", () => {
    const t = selfEmployed({ from: "2026-01-01", base: 1500000, ref: "2026-07-15", n: 6 });
    const debt = [{ account: "own" as const, onDate: "2026-07-15", amount: 6000 }];
    const pre = run(birth({ asOf: "2026-06-01", expected: "2026-07-15", claimant: person([t], { arrears: debt }) }));
    expect(periodsOf(pre, "maternity")[0]).toMatchObject({ status: "withheld", reasonCode: "ARREARS_UNPAID", daily: 24206 });
    expect(pre.alerts.find((a) => a.code === "ARREARS_OWN")).toMatchObject({ severity: "blocking", deadline: "2027-01-15" });
  });
  it("E6: twins — 31 + 34 weeks at 81,5%", () => {
    const children = [{ ref: "a", bornAlive: true }, { ref: "b", bornAlive: true }];
    const r = run(birth({ asOf: "2026-06-25", date: B, claimant: person([emp8000()]), children }), plan([block("m", "maternity", B, 217), block("p", "parental", "2027-01-18", 238)], { rateOption: "averaged81_5", applicationDate: "2026-06-25" }));
    expect(r.outcome.value).toBe("granted");
    expect(r.totals.days).toBe(65 * 7);
    expect(r.periods.every((p) => p.rateBps === 8150)).toBe(true);
  });
  it("E9: stillbirth — 56 days at 100% and the funeral grant entitlement", () => {
    const r = run(birth({ asOf: "2026-04-20", date: "2026-04-08", claimant: person([emp8000()]), children: [{ ref: "c", bornAlive: false }] }), plan([block("m", "maternity", "2026-04-08", 56)]));
    expect(r.periods[0]).toMatchObject({ days: 56, to: "2026-06-02", rateBps: 10000, status: "payable" });
    expect(r.entitlements.some((e) => e.benefit === "funeralGrant")).toBe(true);
  });
});

describe("amount and gating", () => {
  it("month split 30 / 31 days with PIT and net", () => {
    const r = run(birth({ asOf: "2026-06-12", date: "2026-06-03", claimant: person([{ ...emp8000(), statedBenefitBase: 560885 }]) }), plan([block("m", "maternity", "2026-06-03", 140)], { rateOption: "averaged81_5", applicationDate: "2026-06-12" }));
    const ms = r.periods[0].months;
    expect(ms.map((m) => [m.month, m.days, m.gross])).toEqual([["2026-06", 28, 426636], ["2026-07", 31, 472347], ["2026-08", 31, 472347], ["2026-09", 30, 457110], ["2026-10", 20, 304740]]);
    expect(ms[1].pitAdvance).toBe(56700);
    expect(ms[1].net).toBe(472347 - 56700);
  });
  it("top-up only with the single-title statement (alert otherwise)", () => {
    const t = selfEmployed({ from: "2025-01-01", base: 144180, ref: B, scheme: "preferential" });
    const f = birth({ asOf: "2026-06-25", date: B, claimant: person([t]) });
    const blocks = [block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)];
    const without = run(f, plan(blocks, { rateOption: "averaged81_5", applicationDate: "2026-06-20" }));
    expect(without.periods.every((p) => p.months.every((m) => m.topUp === 0))).toBe(true);
    expect(without.alerts.find((a) => a.code === "TOP_UP_STATEMENT_NEEDED")?.severity).toBe("warning");
    const withStmt = run(f, plan(blocks, { rateOption: "averaged81_5", applicationDate: "2026-06-20", singleTitleStatement: true }));
    const july = withStmt.periods[0].months.find((m) => m.month === "2026-07")!;
    expect(july.net + july.topUp).toBe(100000);
  });
  it("arrears just below / at / above the threshold; payer's account for collaborators", () => {
    const t = selfEmployed({ from: "2025-01-01", base: 565200, ref: B });
    const mk = (amount: number, extra: object = {}) => run(birth({ asOf: "2026-07-01", date: B, claimant: person([t], { arrears: [{ account: "own", onDate: B, amount, ...extra }] }) }), plan([block("m", "maternity", B, 140)]));
    expect(mk(4806).outcome.value).toBe("granted");
    expect(mk(4807).outcome).toMatchObject({ value: "refused", reasonCodes: ["ARREARS_UNPAID"] });
    expect(mk(4807, { repaidOn: "2026-06-30" }).outcome.value).toBe("granted");
    expect(mk(4807, { repaidOn: "2026-06-30", instalmentAgreement: true }).outcome.value).toBe("refused");
    const coll = { ...t, kind: "collaborator" as const };
    const own = run(birth({ asOf: "2026-07-01", date: B, claimant: person([coll], { arrears: [{ account: "own", onDate: B, amount: 9000 }] }) }), plan([block("m", "maternity", B, 140)]));
    expect(own.outcome.value).toBe("granted");
    const payerAcc = run(birth({ asOf: "2026-07-01", date: B, claimant: person([coll], { arrears: [{ account: "payer", onDate: B, aboveThreshold: true }] }) }), plan([block("m", "maternity", B, 140)]));
    expect(payerAcc.outcome.value).toBe("refused");
    expect(codes(payerAcc)).toContain("ARREARS_PAYER");
  });
  it("arrears not repaid within 6 months → the right expires", () => {
    const t = selfEmployed({ from: "2025-01-01", base: 565200, ref: B });
    const r = run(birth({ asOf: "2027-01-20", date: B, claimant: person([t], { arrears: [{ account: "own", onDate: B, amount: 12000 }] }) }), plan([block("m", "maternity", B, 140)]));
    expect(r.outcome.reasonCodes).toEqual(expect.arrayContaining(["ARREARS_RIGHT_EXPIRED", "ARREARS_UNPAID"]));
  });
  it("waiting period: 90 days voluntary (day 104 ok, day 60 not), maternity unaffected", () => {
    const t = mandate({ from: "2025-09-01", sicknessFrom: "2026-02-01", income: 300000, ref: "2026-05-15", n: 3 });
    const ok = run(birth({ asOf: "2026-05-20", expected: "2026-07-20", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-05-15", to: "2026-07-19", code: "B" }] }) }));
    expect(periodsOf(ok, "sickness").every((p) => p.status === "payable")).toBe(true);
    const early = run(birth({ asOf: "2026-04-05", expected: "2026-07-20", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-04-01", to: "2026-07-19", code: "B" }] }) }));
    expect(periodsOf(early, "sickness").find((p) => p.status === "refused")).toMatchObject({ from: "2026-04-01", to: "2026-05-01", reasonCode: "WAITING_PERIOD" });
    expect(codes(early)).toContain("WAITING_PERIOD_NOT_MET");
    expect(periodsOf(early, "maternity")[0].status).toBe("payable");
  });
  it("waiting period: 30 days mandatory, bridged over a gap ≤ 30 days", () => {
    const t1 = employee({ id: "t0", from: "2025-01-01", to: "2025-12-31" });
    const t2 = employee({ id: "t1", from: "2026-01-20" });
    const r = run(birth({ asOf: "2026-02-01", expected: "2026-08-01", claimant: person([t1, t2], { sickNotes: [{ titleId: "t1", from: "2026-01-25", to: "2026-02-10", code: "B" }] }) }));
    expect(periodsOf(r, "sickPay").every((p) => p.status === "payable")).toBe(true);
  });
  it("sick pay 33 days vs 14 days from the year after turning 50", () => {
    const t = employee({ from: "2020-01-01", gross: 600000, ref: "2026-03-02" });
    const young = run(birth({ asOf: "2026-03-05", expected: "2026-08-01", claimant: person([t], { birthYear: 1990, sickNotes: [{ titleId: "t1", from: "2026-03-02", to: "2026-04-30", code: "B" }] }) }));
    expect(periodsOf(young, "sickPay")[0].days).toBe(33);
    const older = run(birth({ asOf: "2026-03-05", expected: "2026-08-01", claimant: person([t], { birthYear: 1975, sickNotes: [{ titleId: "t1", from: "2026-03-02", to: "2026-04-30", code: "B" }] }) }));
    expect(periodsOf(older, "sickPay")[0].days).toBe(14);
  });
  it("270-day benefit period in pregnancy", () => {
    const t = employee({ from: "2020-01-01", gross: 600000, ref: "2025-11-03" });
    const r = run(birth({ asOf: "2025-11-05", expected: "2026-09-30", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2025-11-03", to: "2026-09-29", code: "B" }] }) }));
    const exhausted = r.periods.find((p) => p.reasonCode === "BENEFIT_PERIOD_EXHAUSTED");
    expect(exhausted).toBeDefined();
    const payable = r.periods.filter((p) => (p.type === "sickPay" || p.type === "sickness") && p.status === "payable").reduce((a, p) => a + p.days, 0);
    expect(payable).toBe(270);
  });
});
