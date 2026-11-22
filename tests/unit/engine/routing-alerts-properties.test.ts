import { typedAnswers } from "../persona-answers";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate, type Plan, type PlanBlock } from "@/engine";
import { assemble } from "@/server/assemble";
import { birth, block, codes, employee, father, mandate, person, plan, run, selfEmployed, sets } from "./helpers";

const B = "2026-06-15";

describe("routing", () => {
  const mat = plan([block("m", "maternity", B, 140)]);
  it("payer with > 20 insured pays; ≤ 20 → ZUS (employer forwards within 7 days)", () => {
    const big = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01", over20: true })]) }), mat);
    expect(big.routing).toMatchObject({ benefitPayer: "payer", fileWith: "employer" });
    expect(big.periods[0].paidBy).toBe("payer");
    const small = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01", over20: false })]) }), mat);
    expect(small.routing).toMatchObject({ benefitPayer: "zus", fileWith: "employer", payerForwardsWithinDays: 7 });
    const count = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01", payer: { over20Insured: undefined, insuredOn30NovPrevYear: 21 } })]) }), mat);
    expect(count.routing.benefitPayer).toBe("payer");
  });
  it("self-employed always ZUS, filed via PUE or paper", () => {
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([selfEmployed({ from: "2020-01-01", base: 565200, ref: B })]) }), mat);
    expect(r.routing).toMatchObject({ benefitPayer: "zus", fileWith: "zus", channel: ["pue", "paper"] });
  });
  it("after the title ended always ZUS", () => {
    const t = employee({ from: "2019-01-01", to: "2026-04-30", endReason: "employerBankruptcy", over20: true });
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([t]) }), mat);
    expect(r.periods[0]).toMatchObject({ paidBy: "zus", status: "payable" });
  });
  it("document sets per scenario: ZUS-paid employee, stillbirth, adoption, supplementary, top-up", () => {
    const emp = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01" })]) }), plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)]));
    const docs = emp.documents.map((d) => d.code);
    expect(docs).toEqual(expect.arrayContaining(["ZAM", "Z-3", "BIRTH_ACT", "OTHER_PARENT_STATEMENT_PARENTAL", "LEAVE_APP_MATERNITY", "LEAVE_APP_PARENTAL"]));
    expect(emp.documents.find((d) => d.code === "BIRTH_ACT")?.obtainableFromRegistry).toBe(true);
    const sb = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01" })]), children: [{ ref: "c", bornAlive: false }] }), plan([block("m", "maternity", B, 56)]));
    expect(sb.documents.map((d) => d.code)).toEqual(expect.arrayContaining(["CERT_STILLBIRTH", "Z-12"]));
  });
  it("deadlines: 21 days for the rate, 21 days before parental, paternity expiry, claim limitation", () => {
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01" })]) }), plan([block("m", "maternity", B, 140), block("p", "parental", "2026-11-02", 224)]));
    const d = Object.fromEntries(r.deadlines.map((x) => [x.code + (x.blockId ? ":" + x.blockId : ""), x.date]));
    expect(d.RATE_OPTION_21_DAYS).toBe("2026-07-06");
    expect(d["PARENTAL_APPLICATION:p"]).toBe("2026-10-12");
    expect(d["CLAIM_LIMITATION:m"]).toBe("2027-05-01");
    const f = run(birth({ asOf: "2026-06-20", date: "2026-05-30", claimant: father([employee({ from: "2020-01-01" })]) }), plan([block("x", "paternity", "2026-09-21", 14)]));
    expect(f.deadlines.find((x) => x.code === "PATERNITY_EXPIRY")?.date).toBe("2027-05-29");
    expect(f.deadlines.find((x) => x.code === "PATERNITY_APPLICATION")?.date).toBe("2026-09-14");
  });
});

describe("alerts (prospective)", () => {
  it("not insured on the due date → blocking, municipal benefit", () => {
    const r = run(birth({ asOf: "2026-04-01", expected: B, claimant: person([]) }));
    expect(r.alerts.find((a) => a.code === "NOT_INSURED_ON_DUE_DATE")).toMatchObject({ severity: "blocking", fix: { action: "APPLY_MUNICIPAL_BENEFIT" } });
  });
  it("voluntary sickness not joined; ulga na start", () => {
    expect(codes(run(birth({ asOf: "2026-04-01", expected: B, claimant: person([mandate({ from: "2025-01-01", mode: "none" })]) })))).toContain("VOLUNTARY_SICKNESS_NOT_JOINED");
    expect(codes(run(birth({ asOf: "2026-04-01", expected: B, claimant: person([selfEmployed({ from: "2026-01-01", scheme: "ulgaNaStart" })]) })))).toContain("NO_SCHEME_ULGA_NA_START");
  });
  it("contract ending before the birth: resignation blocks, liquidation and the 3rd-month extension do not", () => {
    const mk = (date: string, reason: "resignation" | "employerLiquidation" | "fixedTermExpired") => run(birth({ asOf: "2025-10-01", expected: B, claimant: person([{ ...employee({ from: "2020-01-01" }), plannedEnd: { date, reason } }]) }));
    expect(codes(mk("2026-04-30", "resignation"))).toContain("CONTRACT_ENDS_BEFORE_BIRTH");
    expect(codes(mk("2026-04-30", "employerLiquidation"))).not.toContain("CONTRACT_ENDS_BEFORE_BIRTH");
    expect(codes(mk("2026-04-30", "fixedTermExpired"))).not.toContain("CONTRACT_ENDS_BEFORE_BIRTH");
    expect(codes(mk("2025-11-30", "fixedTermExpired"))).toContain("CONTRACT_ENDS_BEFORE_BIRTH");
  });
  it("rate deadline countdown and paternity expiry reminders", () => {
    const m = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01" })]) }));
    expect(m.alerts.find((a) => a.code === "RATE_DEADLINE_21_DAYS")).toMatchObject({ deadline: "2026-07-06", values: { daysLeft: 16 } });
    const f = run(birth({ asOf: "2027-04-15", date: "2026-05-30", claimant: father([employee({ from: "2020-01-01" })]) }));
    expect(f.alerts.find((a) => a.code === "PATERNITY_EXPIRES")).toMatchObject({ severity: "warning", deadline: "2027-05-29" });
  });
  it("base explanations: Art. 48a dilution and a base raised months before the due date", () => {
    const t = selfEmployed({ from: "2026-01-01", base: 1500000, ref: "2026-07-15", n: 6 });
    expect(codes(run(birth({ asOf: "2026-06-01", expected: "2026-07-15", claimant: person([t]) })))).toEqual(expect.arrayContaining(["BASE_DILUTED_ART48A", "BASE_CHANGE_SCRUTINY"]));
  });
  it("other parent info missing; certificate guidance for Za życiem", () => {
    const r = run(birth({ asOf: "2026-06-20", date: B, claimant: person([employee({ from: "2020-01-01" })]), children: [{ ref: "c", bornAlive: true, zaZyciem: true }] }));
    expect(codes(r)).toEqual(expect.arrayContaining(["OTHER_PARENT_INFO_MISSING", "CERTIFICATE_TYPE"]));
  });
});

describe("properties", () => {
  // Deterministic pseudo-random generator (tests only; the engine itself never uses randomness).
  let seed = 42;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
  const date = (base: string, offset: number) => { const d = new Date(Date.UTC(+base.slice(0, 4), +base.slice(5, 7) - 1, +base.slice(8, 10) + offset)); return d.toISOString().slice(0, 10); };
  const scenarios = Array.from({ length: 40 }, (_, k) => {
    const birthDate = date("2026-01-10", rnd(300));
    const gross = 300000 + rnd(900000);
    const twins = rnd(4) === 0;
    const blocks: PlanBlock[] = [block("m", "maternity", birthDate, twins ? 217 : 140 - rnd(3) * 7)];
    let cursor = date(birthDate, blocks[0].days);
    const parts = 1 + rnd(3);
    for (let i = 0; i < parts; i++) {
      const days = 7 * (1 + rnd(20)) + (rnd(5) === 0 ? 1 : 0);
      blocks.push(block(`p${i}`, "parental", cursor, days, rnd(4) === 0 ? { workFraction: { num: 1, den: 2 } } : {}));
      cursor = date(cursor, days + rnd(30));
    }
    const facts = birth({ asOf: date(birthDate, 10), date: birthDate, claimant: person([employee({ from: "2020-01-01", gross, ref: birthDate })]), children: twins ? [{ ref: "a", bornAlive: true }, { ref: "b", bornAlive: true }] : undefined });
    const p: Plan = plan(blocks, { rateOption: rnd(2) ? "averaged81_5" : "split100_70", applicationDate: date(birthDate, rnd(30)), singleTitleStatement: rnd(2) === 0 });
    return { k, facts, p };
  });

  it.each(scenarios.map((s) => [s.k, s] as const))("scenario %i: pools, sums, determinism, order independence, trace", (_k, { facts, p }) => {
    const r = evaluate(facts, p, sets);
    const payable = r.periods.filter((x) => x.status !== "refused");
    const days = (t: string) => payable.filter((x) => x.type === t).reduce((a, x) => a + x.days, 0);
    expect(days("maternity")).toBeLessThanOrEqual(r.pools.maternityDays.total);
    expect(r.pools.parentalDays.usedByClaimant).toBeLessThanOrEqual(r.pools.parentalDays.total - r.pools.parentalDays.reservedPerParent);
    for (const x of r.periods) {
      expect(x.gross).toBe(x.months.reduce((a, m) => a + m.gross, 0));
      expect(x.days).toBe(Math.round((Date.UTC(+x.to.slice(0, 4), +x.to.slice(5, 7) - 1, +x.to.slice(8, 10)) - Date.UTC(+x.from.slice(0, 4), +x.from.slice(5, 7) - 1, +x.from.slice(8, 10))) / 86_400_000) + 1);
      expect(r.trace.some((t) => (t.inputs as { blockId?: string }).blockId === x.blockId), `trace for ${x.blockId}`).toBe(true);
    }
    expect(evaluate(facts, p, sets)).toEqual(r);
    const shuffled = { ...p, blocks: [...p.blocks].reverse() };
    expect(evaluate(facts, shuffled, sets).periods).toEqual(r.periods);
    // Adding a block never increases another block's daily amount.
    const more = evaluate(facts, { ...p, blocks: [...p.blocks, block("extra", "parental", "2031-01-05", 14)] }, sets);
    for (const x of r.periods) {
      const same = more.periods.find((y) => y.blockId === x.blockId && y.from === x.from);
      if (same) expect(same.daily).toBeLessThanOrEqual(x.daily);
    }
  });

  it("every base has a trace step", () => {
    const r = evaluate(scenarios[0].facts, scenarios[0].p, sets);
    for (const b of r.bases) expect(r.trace.some((t) => t.stage === "base" && (t.inputs as { titleId?: string }).titleId === b.titleId)).toBe(true);
    expect(r.trace.every((t) => Array.isArray(t.citations) && Array.isArray(t.paramKeys))).toBe(true);
  });
});

describe("demo personas: scenario review regressions", () => {
  const load = (id: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/personas", `${id}.json`), "utf8"));
  const evalPersona = (id: string) => {
    const p = load(id);
    const { facts } = assemble({ payloads: p.systems ?? {}, meta: {}, answers: { ...(p.presetAnswers ?? {}), ...typedAnswers(p.id) }, overrides: [], asOf: p.asOf, mode: "mobywatel", deductionBps: 1371 });
    return evaluate(facts, null, sets);
  };
  it("self-employed with 30 months of cover: future months are carried forward, no art. 48a dilution", () => {
    const r = evalPersona("weronika");
    expect(r.bases[0].method).toBe("nonEmployee12m");
    expect(r.alerts.map((a) => a.code)).not.toContain("BASE_DILUTED_ART48A");
    expect(r.alerts.map((a) => a.code)).toContain("REREGISTER_AFTER_MATERNITY"); // withheld, not refused
  });
  it("refused benefit: no re-registration alert", () => {
    expect(evalPersona("lucja").alerts.map((a) => a.code)).not.toContain("REREGISTER_AFTER_MATERNITY");
  });
});

describe("demo personas (data/personas): evaluate with plan = null never throws", () => {
  const dir = path.resolve(__dirname, "../../../data/personas");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  const designed: Record<string, string[]> = {
    "weronika.json": ["ARREARS_OWN", "BASE_CHANGE_SCRUTINY"],
    "oliwia.json": ["VOLUNTARY_SICKNESS_NOT_JOINED"],
    "lucja.json": ["BUSINESS_SUSPENDED_NEAR_DUE_DATE", "LOW_BASE"],
  };
  it.each(files)("%s", (f) => {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const { facts } = assemble({ payloads: p.systems ?? {}, meta: {}, answers: { ...(p.presetAnswers ?? {}), ...typedAnswers(p.id) }, overrides: [], asOf: p.asOf, mode: "mobywatel", deductionBps: 1371 });
    const r = evaluate(facts, null, sets);
    expect(r.defaultPlan).toBeDefined();
    for (const code of designed[f] ?? []) expect(r.alerts.map((a) => a.code)).toContain(code);
  });
});
