/** Personas P1–P12 (digest 03 §4) with their variants. [E]-marked values are asserted as rates and day counts only. */
import { describe, expect, it } from "vitest";
import type { Facts, InsuranceTitle } from "@/engine";
import { birth, block, codes, employee, father, mandate, months, payableDays, periodsOf, person, plan, run, selfEmployed } from "./helpers";

describe("P1 Magdalena — employee, sick in pregnancy, 52 weeks at 81,5%", () => {
  const t = employee({ from: "2021-04-01", gross: 650000, ref: "2026-03-02" });
  const facts = birth({ asOf: "2026-06-24", date: "2026-06-15", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-03-02", to: "2026-06-14", code: "B" }] }), otherParent: { role: "father", insured: "yes", used: [], declaresNonUse: { from: "2026-11-02", to: "2027-06-13" } } });
  const p = plan([block("sp", "sickPay", "2026-03-02", 33), block("s", "sickness", "2026-04-04", 72), block("m", "maternity", "2026-06-15", 140), block("p", "parental", "2026-11-02", 224)], { rateOption: "averaged81_5", applicationDate: "2026-06-24" });
  const r = run(facts, p);
  it("sick pay by the employer, then ZUS sickness benefit at 100% (186,96)", () => {
    expect(periodsOf(r, "sickPay")[0]).toMatchObject({ days: 33, paidBy: "payer", rateBps: 10000 });
    expect(periodsOf(r, "sickness")[0]).toMatchObject({ from: "2026-04-04", to: "2026-06-14", daily: 18696, paidBy: "zus" });
  });
  it("base 5 608,85; maternity + parental at 152,37; monthly 4 723,47 / 4 571,10; total 55 462,68", () => {
    expect(r.bases[0].base).toBe(560885);
    const mat = periodsOf(r, "maternity")[0];
    const par = periodsOf(r, "parental")[0];
    expect([mat.daily, par.daily]).toEqual([15237, 15237]);
    expect(mat.to).toBe("2026-11-01");
    expect(par.to).toBe("2027-06-13");
    expect(mat.months.find((m) => m.month === "2026-07")?.gross).toBe(472347);
    expect(mat.months.find((m) => m.month === "2026-09")?.gross).toBe(457110);
    expect(mat.gross + par.gross).toBe(5546268);
  });
  it("the father keeps 9 weeks until the end of 2032", () => {
    expect(r.pools.parentalDeadline).toBe("2032-12-31");
    expect(r.pools.parentalDays.total - r.pools.parentalDays.usedByClaimant).toBe(63);
    expect(r.outcome.value).toBe("granted");
  });
});

describe("P2 Bartosz — paternity + his 9 weeks", () => {
  const t = employee({ from: "2022-02-01", gross: 560000, ref: "2027-06-07", n: 24 });
  const facts = birth({ asOf: "2026-09-10", date: "2026-05-30", claimant: father([t]) });
  it("paternity 161,07 × 14 = 2 254,98; 9 weeks at 70% 112,75 × 63", () => {
    const r = run(facts, plan([block("pat", "paternity", "2026-09-21", 14), block("p", "parental", "2027-06-07", 63, { pool: "ownNineWeeks" })]));
    expect(r.bases[0].base).toBe(483224);
    expect(periodsOf(r, "paternity")[0]).toMatchObject({ daily: 16107, gross: 225498, rateBps: 10000 });
    expect(periodsOf(r, "parental")[0]).toMatchObject({ daily: 11275, rateBps: 7000, gross: 710325 });
  });
  it("paternity after the child's first birthday is refused; a 3rd part is refused; 8 weeks + 3 days warns", () => {
    expect(run(facts, plan([block("pat", "paternity", "2027-05-30", 14)])).outcome).toMatchObject({ value: "refused", reasonCodes: ["DEADLINE_PASSED"] });
    expect(run(facts, plan([block("a", "paternity", "2026-07-01", 7), block("b", "paternity", "2026-08-01", 3), block("c", "paternity", "2026-09-01", 4)])).outcome.reasonCodes).toContain("PARTS_LIMIT");
    const odd = run(facts, plan([block("p", "parental", "2027-06-07", 59, { pool: "ownNineWeeks" })]));
    expect(odd.alerts.find((a) => a.code === "DAY_COUNT_MISMATCH")?.values).toMatchObject({ requested: 59, expected: 56 });
  });
});

describe("P3 Weronika — self-employed, 81,5%, debt and late variants", () => {
  const t = selfEmployed({ from: "2026-01-01", base: 565200, ref: "2026-09-20", n: 8 });
  const p = plan([block("m", "maternity", "2026-09-20", 140), block("p", "parental", "2027-02-07", 224)], { rateOption: "averaged81_5", applicationDate: "2026-10-09" });
  const facts = (extra: Partial<Facts["claimant"]> = {}, asOf = "2026-10-09") => birth({ asOf, date: "2026-09-20", claimant: person([t], extra) });
  it("base 4 877,11; daily 132,49; 1 457,39 for 11 days of September; total 48 226,36", () => {
    const r = run(facts(), p);
    expect(r.bases[0].base).toBe(487711);
    const mat = periodsOf(r, "maternity")[0];
    expect(mat.daily).toBe(13249);
    expect(mat.months[0]).toMatchObject({ month: "2026-09", days: 11, gross: 145739 });
    expect(mat.months[1].gross).toBe(410719);
    expect(r.totals.gross).toBe(4822636);
    expect(periodsOf(r, "parental")[0].to).toBe("2027-09-18");
  });
  it("debt: refused until repaid (expiry 2027-03-20); repaid on 2026-11-15 → paid", () => {
    const debt = [{ account: "own" as const, onDate: "2026-09-20", amount: 12000 }];
    const refused = run(facts({ arrears: debt }), p);
    expect(refused.outcome).toMatchObject({ value: "refused", reasonCodes: ["ARREARS_UNPAID"] });
    expect(refused.alerts.find((a) => a.code === "ARREARS_OWN")?.deadline).toBe("2027-03-20");
    expect(run(facts({ arrears: [{ ...debt[0], repaidOn: "2026-11-15" }] }, "2026-11-20"), p).outcome.value).toBe("granted");
    const prospective = run(birth({ asOf: "2026-08-01", expected: "2026-09-20", claimant: person([t], { arrears: debt }) }));
    expect(prospective.outcome.value).toBe("withheld");
  });
  it("late application (day 30) → 100% (162,57) and 70% (113,80)", () => {
    const r = run(facts(), plan(p.blocks, { rateOption: "averaged81_5", applicationDate: "2026-10-20" }));
    expect(r.periods.map((x) => x.daily)).toEqual([16257, 11380]);
  });
});

describe("P4 Kamil — preferential ZUS, 9 weeks concurrent with the mother, top-up", () => {
  // Deviation: insured from 2026-01 so every declared month carries the 2026 preferential base.
  const t = selfEmployed({ from: "2026-01-01", registeredOn: "2026-01-05", base: 144180, ref: "2026-10-05", n: 9, scheme: "preferential" });
  const facts = birth({ asOf: "2026-09-20", date: "2026-03-12", claimant: father([t]), otherParent: { role: "mother", insured: "yes", used: [{ type: "maternity", from: "2026-03-12", to: "2026-07-29", rateBps: 8150 }, { type: "parental", from: "2026-07-30", to: "2027-03-10", rateBps: 8150 }] } });
  it("base 1 244,13; 70% → 29,03 / day, 870,89 / month; topped up to 1 000 zł net with the statement", () => {
    const r = run(facts, plan([block("p", "parental", "2026-10-05", 63, { pool: "ownNineWeeks" })], { singleTitleStatement: true }));
    expect(r.outcome.value).toBe("granted");
    expect(r.bases[0].base).toBe(124413);
    expect(periodsOf(r, "parental")[0].daily).toBe(2903);
    const nov = periodsOf(r, "parental")[0].months.find((m) => m.month === "2026-11")!;
    expect(nov.net + nov.topUp).toBe(100000);
    expect(codes(r)).toContain("LOW_BASE");
  });
});

describe("P5 Oliwia — mandate with voluntary sickness insurance", () => {
  const t = mandate({ from: "2025-09-01", sicknessFrom: "2026-02-01", income: 300000, ref: "2026-05-15", n: 8 });
  const p = plan([block("s", "sickness", "2026-05-15", 66), block("m", "maternity", "2026-07-20", 140), block("p", "parental", "2026-12-07", 224)], { rateOption: "averaged81_5", applicationDate: "2026-08-01" });
  it("sickness from day 104 at 100% (86,29), maternity at 81,5% (70,33) on the carried-over base 2 588,70", () => {
    const r = run(birth({ asOf: "2026-08-01", date: "2026-07-20", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-05-15", to: "2026-07-19", code: "B" }] }) }), p);
    expect(r.outcome.value).toBe("granted");
    expect(periodsOf(r, "sickness")[0]).toMatchObject({ daily: 8629, base: 258870 });
    expect(periodsOf(r, "maternity")[0]).toMatchObject({ daily: 7033, to: "2026-12-06" });
    expect(periodsOf(r, "parental")[0].to).toBe("2027-07-18");
  });
  it("P5-early: sick on day 60 → no sickness benefit until day 91, maternity unaffected", () => {
    const r = run(birth({ asOf: "2026-08-01", date: "2026-07-20", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-04-01", to: "2026-07-19", code: "B" }] }) }), plan([block("s", "sickness", "2026-04-01", 110), ...p.blocks.slice(1)], p));
    expect(periodsOf(r, "sickness").find((x) => x.status === "refused")).toMatchObject({ to: "2026-05-01", reasonCode: "WAITING_PERIOD" });
    expect(periodsOf(r, "maternity")[0].status).toBe("payable");
  });
  it("P5-none: never joined voluntary sickness → maternity refused, municipal benefit", () => {
    const none = mandate({ from: "2025-09-01", mode: "none" });
    const r = run(birth({ asOf: "2026-08-01", date: "2026-07-20", claimant: person([none]) }), plan(p.blocks.slice(1), p));
    expect(r.outcome.value).toBe("refused");
    expect(r.entitlements.some((e) => e.benefit === "parentalBenefitMunicipal")).toBe(true);
  });
});

describe("P6 Patrycja — stillbirth without a registry act", () => {
  const t = employee({ from: "2026-01-12", extra: { months: [{ month: "2026-01", contributionBase: 380000, fullMonthInsured: false }, ...months("2026-04-08", 2, 500000)] } });
  const r = run(birth({ asOf: "2026-04-20", date: "2026-04-08", claimant: person([t]), children: [{ ref: "c", bornAlive: false, gestationalWeek: 24 }], documents: ["stillbirthCert"] }), plan([block("m", "maternity", "2026-04-08", 56)]));
  it("56 days at 100%, no parental, base from the full months", () => {
    expect(r.periods[0]).toMatchObject({ from: "2026-04-08", to: "2026-06-02", days: 56, rateBps: 10000, status: "payable" });
    expect(r.bases[0].base).toBe(431450);
    expect(r.periods[0].daily).toBe(14382);
    expect(r.periods[0].gross).toBe(805392);
    expect(r.documents.some((d) => d.code === "CERT_STILLBIRTH")).toBe(true);
    expect(r.documents.some((d) => d.code === "BIRTH_ACT")).toBe(false);
  });
});

describe("P7 Monika — twins at 30 weeks, supplementary leave", () => {
  const children = [
    { ref: "a", bornAlive: true, gestationalWeek: 30, birthWeightG: 1420, hospitalStays: [{ from: "2026-02-04", to: "2026-03-08" }] },
    { ref: "b", bornAlive: true, gestationalWeek: 30, birthWeightG: 1610, hospitalStays: [{ from: "2026-02-04", to: "2026-02-28" }] },
  ];
  const t = employee({ from: "2023-09-01", gross: 740000, ref: "2026-02-04" });
  const p = plan([block("m", "maternity", "2026-02-04", 217), block("s", "supplementary", "2026-09-09", 35), block("p", "parental", "2026-10-14", 238)], { rateOption: "averaged81_5", applicationDate: "2026-02-16" });
  it("31 weeks + 5 weeks at 100% + 34 weeks; base 6 385,46; 173,47 / 212,85", () => {
    const r = run(birth({ asOf: "2026-03-10", date: "2026-02-04", claimant: person([t]), children }), p);
    expect(r.outcome.value).toBe("granted");
    expect(r.periods.map((x) => [x.type, x.from, x.to, x.rateBps, x.daily])).toEqual([
      ["maternity", "2026-02-04", "2026-09-08", 8150, 17347],
      ["supplementary", "2026-09-09", "2026-10-13", 10000, 21285],
      ["parental", "2026-10-14", "2027-06-08", 8150, 17347],
    ]);
  });
  it("P7-Za-życiem: 67 − 9 = 58 weeks of parental", () => {
    const r = run(birth({ asOf: "2026-03-10", date: "2026-02-04", claimant: person([t]), children: children.map((c) => ({ ...c, zaZyciem: true })), documents: ["zaZyciemCert", "hospitalStayCert"] }));
    expect(payableDays(r, "parental")).toBe(406);
  });
});

describe("P8 Hanna — employer liquidated (Art. 30), then maternity", () => {
  const liquidated = employee({ from: "2019-03-01", to: "2026-08-31", endReason: "employerLiquidation", gross: 720000, ref: "2026-09-01" });
  const facts = (t: InsuranceTitle) => birth({ asOf: "2026-11-20", date: "2026-11-08", expected: "2026-11-10", claimant: person([t]) });
  const p = plan([block("a", "art30PreBirth", "2026-09-01", 68), block("m", "maternity", "2026-11-08", 140)]);
  it("benefit 2026-09-01..11-07 at 100% (207,10), then maternity paid by ZUS; documents", () => {
    const r = run(facts(liquidated), p);
    expect(r.outcome.value).toBe("granted");
    expect(periodsOf(r, "art30PreBirth")[0]).toMatchObject({ to: "2026-11-07", daily: 20710, base: 621288 });
    expect(periodsOf(r, "maternity")[0]).toMatchObject({ paidBy: "zus", base: 621288 });
    expect(r.documents.map((d) => d.code)).toEqual(expect.arrayContaining(["ZAS-55", "WORK_CERTIFICATE", "CERT_PREGNANCY_DURING_EMPLOYMENT", "Z-3"]));
  });
  it("P8-resign: no Art. 30 benefit and no maternity benefit", () => {
    const r = run(facts({ ...liquidated, endReason: "resignation" }), p);
    expect(r.outcome.value).toBe("refused");
    const pre = run(birth({ asOf: "2026-08-01", expected: "2026-11-10", claimant: person([{ ...liquidated, to: undefined, endReason: undefined, plannedEnd: { date: "2026-08-31", reason: "resignation" } }]) }));
    expect(codes(pre)).toContain("CONTRACT_ENDS_BEFORE_BIRTH");
  });
});

describe("P9 Iwona — high-risk new job (alert, not refusal)", () => {
  const t = employee({ from: "2026-03-01", fraction: { num: 1, den: 8 }, gross: 290000, ref: "2026-08-10", n: 5, payer: { relatedToClaimant: true, sameFirmPriorContract: true }, extra: { registeredOn: "2026-03-15" } });
  it("eligible on paper; TITLE_LIKELY_VERIFIED (high) with proof-of-work fix", () => {
    const r = run(birth({ asOf: "2026-04-01", expected: "2026-08-10", claimant: person([t], { sickNotes: [{ titleId: "t1", from: "2026-03-25", to: "2026-08-09", code: "B" }] }) }));
    const a = r.alerts.find((x) => x.code === "TITLE_LIKELY_VERIFIED");
    expect(a).toMatchObject({ severity: "high", fix: { action: "COLLECT_PROOF_OF_WORK" } });
    expect(String(a?.values.signals)).toContain("familyFirm");
    expect(periodsOf(r, "maternity")[0].status).toBe("payable");
  });
});

describe("P10 Łucja — business suspended around the birth", () => {
  const base = (sickFrom: string, registeredOn: string): InsuranceTitle => ({
    ...selfEmployed({ from: "2025-12-01", scheme: "preferential", base: 144180, ref: "2026-06-01", n: 6 }),
    suspensions: [{ from: "2026-06-30", to: "2026-06-30" }],
    sickness: { mode: "voluntary", periods: [{ from: "2025-12-01", to: "2026-06-29" }, { from: sickFrom }] },
    registeredOn,
  });
  const p = plan([block("m", "maternity", "2026-07-09", 140)]);
  it("ZUA received 2026-07-28 → maternity refused (not insured on the birth date)", () => {
    const r = run(birth({ asOf: "2026-08-10", date: "2026-07-09", claimant: person([base("2026-07-01", "2026-07-28")]) }), p);
    expect(r.outcome).toMatchObject({ value: "refused" });
    expect(r.outcome.reasonCodes).toContain("NOT_INSURED_AT_EVENT");
  });
  it("P10-ok: ZUA received 2026-07-05 → granted", () => {
    expect(run(birth({ asOf: "2026-08-10", date: "2026-07-09", claimant: person([base("2026-07-01", "2026-07-05")]) }), p).outcome.value).toBe("granted");
  });
  it("P10-gap: separate parental claim without re-registering → refused", () => {
    const t: InsuranceTitle = { ...base("2026-07-01", "2026-07-05"), sickness: { mode: "voluntary", periods: [{ from: "2025-12-01", to: "2026-06-29" }, { from: "2026-07-01", to: "2026-07-08" }] } };
    const r = run(birth({ asOf: "2026-12-10", date: "2026-07-09", claimant: person([t], { paidBenefits: [{ type: "maternity", titleId: "t1", from: "2026-07-09", to: "2026-11-25" }] }) }), plan([block("p", "parental", "2026-12-10", 224, { claimedSeparatelyOn: "2026-12-10" })]));
    expect(r.outcome).toMatchObject({ value: "refused", reasonCodes: expect.arrayContaining(["NOT_INSURED_AT_PART_START"]) });
  });
  it("alerts before the birth: suspension near the due date and re-registration after maternity", () => {
    const pre: InsuranceTitle = { ...selfEmployed({ from: "2025-12-01", scheme: "preferential" }), plannedEnd: { date: "2026-06-30", reason: "businessSuspended" } };
    const r = run(birth({ asOf: "2026-05-01", expected: "2026-07-09", claimant: person([pre]) }));
    expect(codes(r)).toEqual(expect.arrayContaining(["BUSINESS_SUSPENDED_NEAR_DUE_DATE", "NOT_INSURED_ON_DUE_DATE"]));
    const ok = run(birth({ asOf: "2026-05-01", expected: "2026-07-09", claimant: person([selfEmployed({ from: "2025-12-01", scheme: "preferential" })]) }));
    expect(ok.alerts.find((a) => a.code === "REREGISTER_AFTER_MATERNITY")?.severity).toBe("high");
  });
});

describe("P11 Aleksandra — adoption of a 3-year-old", () => {
  const t = employee({ from: "2020-05-01", gross: 800000, ref: "2026-03-10" });
  const facts = (child: object, kind: "adoption" | "foster" = "adoption"): Facts => ({
    asOf: "2026-03-20", claimant: person([t], { role: kind === "adoption" ? "adoptive" : "foster" }),
    event: { kind, takenIntoCareOn: "2026-03-10", petitionFiledOn: "2026-02-20", children: [{ ref: "c", ...child }] },
  });
  const p = plan([block("m", "maternityOnAdoption", "2026-03-10", 140), block("p", "parental", "2026-07-28", 224)], { rateOption: "averaged81_5", applicationDate: "2026-03-20" });
  it("20 weeks to 2026-07-27, 32 weeks to 2027-03-08, daily 187,54", () => {
    const r = run(facts({ birthDate: "2023-01-15" }), p);
    expect(r.outcome.value).toBe("granted");
    expect(r.periods.map((x) => [x.to, x.daily])).toEqual([["2026-07-27", 18754], ["2027-03-08", 18754]]);
  });
  it("foster child aged 8 without deferred schooling → no leave; professional foster excluded; Za życiem → 56 weeks", () => {
    expect(run(facts({ birthDate: "2018-01-01" }, "foster")).outcome.reasonCodes).toContain("CHILD_AGE_LIMIT");
    expect(run({ ...facts({ birthDate: "2023-01-01" }, "foster"), event: { ...facts({ birthDate: "2023-01-01" }, "foster").event, fosterType: "professional" } as Facts["event"] }).outcome.reasonCodes).toContain("FOSTER_PROFESSIONAL");
    expect(payableDays(run(facts({ birthDate: "2021-01-01", zaZyciem: true })), "parental")).toBe(392);
  });
});

describe("P12 Maja — ¼ etat, top-up, father's concurrent 9 weeks, parts limit, 225th day", () => {
  const t = employee({ from: "2023-09-01", fraction: { num: 1, den: 4 }, gross: 120150, ref: "2026-05-04" });
  const p = plan([block("m", "maternity", "2026-05-04", 140), block("p", "parental", "2026-09-21", 224)], { rateOption: "averaged81_5", applicationDate: "2026-05-19", singleTitleStatement: true });
  const other = { role: "father" as const, insured: "yes" as const, used: [{ type: "parental" as const, from: "2026-06-01", to: "2026-08-02" }] };
  it("base 1 036,77; 81,5% ≈ 844,97 / month, topped up to 1 000 zł net; leave ends 2027-05-02", () => {
    const r = run(birth({ asOf: "2026-05-19", date: "2026-05-04", claimant: person([t]), otherParent: other }), p);
    expect(r.outcome.value).toBe("granted");
    expect(r.bases[0]).toMatchObject({ base: 103677, floorApplied: undefined });
    const june = periodsOf(r, "maternity")[0].months.find((m) => m.month === "2026-06")!;
    expect(june.gross).toBe(84510); // 28,17 × 30
    expect(june.net + june.topUp).toBe(100000);
    expect(periodsOf(r, "parental")[0].to).toBe("2027-05-02");
  });
  it("the father's 6th part is refused (shared limit of 5)", () => {
    const facts = birth({ asOf: "2027-03-01", date: "2026-05-04", claimant: father([employee({ from: "2020-01-01" })]), otherParent: { role: "mother", insured: "yes", used: [{ type: "parental", from: "2026-09-21", to: "2027-05-02" }] } });
    facts.claimant.paidBenefits = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-10-01"].map((d) => ({ type: "parental" as const, titleId: "t1", from: d, to: d.replace(/-01$/, "-07") }));
    expect(run(facts, plan([block("x", "parental", "2027-02-01", 7, { pool: "ownNineWeeks" })])).outcome).toMatchObject({ value: "refused", reasonCodes: ["PARTS_LIMIT"] });
  });
  it("225 days of parental → the 225th day refused", () => {
    const r = run(birth({ asOf: "2026-05-19", date: "2026-05-04", claimant: person([t]) }), plan([block("m", "maternity", "2026-05-04", 140), block("p", "parental", "2026-09-21", 225)], p));
    expect(periodsOf(r, "parental").find((x) => x.status === "refused")).toMatchObject({ from: "2027-05-03", days: 1, reasonCode: "EXCESS_DAYS" });
  });
});
