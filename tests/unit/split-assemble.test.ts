/**
 * Data-layer contract (plan 03 §1–2): every sample case survives split → assemble unchanged; demo personas go
 * through the assembler *without* case extras, so consent subsets, outages, overrides and the question list are
 * exercised for real; provenance resolves each displayed path to the registry that supplied it.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { netOfDeduction } from "@/engine/money";
import type { Facts, Plan } from "@/engine/types";
import { splitFacts } from "@/integrations/split";
import type { Answers, PersonaFile, SystemId, SystemPayloads } from "@/integrations/types";
import { safeNext } from "@/lib/safe-next";
import { assemble, lookupProvenance, type AssembleInput } from "@/server/assemble";
import { validateOverride } from "@/server/override-rules";

const DEDUCTION = 1371;
const root = path.resolve(__dirname, "../../data");

const caseIds = fs
  .readdirSync(path.join(root, "cases"))
  .filter((d) => /^[A-Z]\d-\d{2}$/.test(d) && fs.existsSync(path.join(root, "cases", d, "input.json")))
  .sort();

const persona = (id: string): PersonaFile => JSON.parse(fs.readFileSync(path.join(root, "personas", `${id}.json`), "utf8"));

function run(id: string, opts: { drop?: SystemId[]; answers?: Answers; overrides?: AssembleInput["overrides"]; mode?: AssembleInput["mode"] } = {}) {
  const p = persona(id);
  const payloads: Partial<SystemPayloads> = { ...p.systems };
  for (const s of opts.drop ?? []) delete (payloads as Record<string, unknown>)[s];
  return assemble({
    payloads,
    meta: {},
    answers: { ...(p.presetAnswers ?? {}), ...(opts.answers ?? {}) },
    overrides: opts.overrides ?? [],
    asOf: p.asOf,
    mode: opts.mode ?? "mobywatel",
    checked: Object.keys(payloads) as SystemId[],
    deductionBps: DEDUCTION,
  });
}

describe("split → assemble round-trip over every sample case", () => {
  it("finds the fixtures", () => {
    expect(caseIds.length).toBeGreaterThan(0);
  });
  for (const id of caseIds) {
    it(id, () => {
      const input = JSON.parse(fs.readFileSync(path.join(root, "cases", id, "input.json"), "utf8")) as { facts: Facts; plan: Plan };
      const { systems, answers } = splitFacts(input.facts, input.plan);
      const out = assemble({ payloads: systems, meta: {}, answers, overrides: [], asOf: input.facts.asOf, mode: "case", deductionBps: DEDUCTION });
      expect(out.facts).toEqual(input.facts);
      expect(out.missing).toEqual([]);
      expect(out.unverified).toEqual([]);
    });
  }
});

describe("assembler on personas (no case extras)", () => {
  it("full consent: nothing unverified, no manual question, registry facts present", () => {
    const a = run("weronika");
    expect(a.unverified).toEqual([]);
    expect(a.missing.map((q) => q.id)).not.toContain("manual");
    expect(a.facts.claimant.arrears.length).toBeGreaterThan(0);
    expect(a.facts.event.kind === "birth" && a.facts.event.expectedDate).toBe("2027-02-05");
  });

  it("outage of e-zdrowie: due date becomes a required question, the source is unverified", () => {
    const a = run("magdalena", { drop: ["ezdrowie"] });
    expect(a.unverified).toEqual(["ezdrowie"]);
    expect(a.missing.find((q) => q.id === "expectedDate")).toMatchObject({ required: true });
    const answered = run("magdalena", { drop: ["ezdrowie"], answers: { expectedDate: "2027-03-12" } });
    expect(answered.missing.map((q) => q.id)).not.toContain("expectedDate");
    expect(lookupProvenance(answered.provenance, "facts.event.expectedDate")?.source).toBe("user");
  });

  it("declined ZUS – saldo for a self-employed title: arrears are unverified and asked, never assumed absent", () => {
    const a = run("weronika", { drop: ["zus-saldo"] });
    expect(a.unverified).toContain("zus-saldo");
    expect(a.missing.map((q) => q.id)).toContain("arrears");
    expect(lookupProvenance(a.provenance, "facts.claimant.arrears")).toBeUndefined();
    const yes = run("weronika", { drop: ["zus-saldo"], answers: { arrears: true } });
    expect(yes.unverified).not.toContain("zus-saldo");
    expect(yes.facts.claimant.arrears).toEqual([{ account: "own", onDate: "2026-11-21", aboveThreshold: true }]);
    expect(lookupProvenance(yes.provenance, "facts.claimant.arrears")?.source).toBe("user");
  });

  it("declined ZUS – saldo for an employee asks nothing (arrears do not gate an employee's benefit)", () => {
    const a = run("magdalena", { drop: ["zus-saldo"] });
    expect(a.unverified).toContain("zus-saldo");
    expect(a.missing.map((q) => q.id)).not.toContain("arrears");
  });

  it("without ZUS – konto the manual question is required; manual answers fill the titles with the parameter-set deduction", () => {
    const a = run("oliwia", { drop: ["zus-konto"] });
    expect(a.unverified).toContain("zus-konto");
    expect(a.missing.find((q) => q.id === "manual")).toMatchObject({ required: true });
    expect(a.facts.claimant.titles).toEqual([]);
    const manual = { role: "mother", sex: "F", work: "employment", since: "2024-02-01", fraction: { num: 1, den: 1 }, monthlyGross: 650_000, sicknessInsurance: "mandatory" } as const;
    const b = run("oliwia", { drop: ["zus-konto"], answers: { manual } });
    expect(b.unverified).not.toContain("zus-konto");
    expect(b.missing.map((q) => q.id)).not.toContain("manual");
    expect(b.facts.claimant.titles[0]).toMatchObject({ kind: "employment", statedBenefitBase: netOfDeduction(650_000, DEDUCTION) });
    expect(lookupProvenance(b.provenance, "facts.claimant.titles[0].from")?.source).toBe("user");
  });

  it("manual mode with nothing read: everything except user-covered sources is unverified", () => {
    const a = assemble({ payloads: {}, meta: {}, answers: {}, overrides: [], asOf: "2026-11-21", mode: "manual", deductionBps: DEDUCTION });
    expect(a.missing[0]).toMatchObject({ id: "manual", required: true });
    expect(a.unverified).toContain("zus-konto");
    const b = assemble({
      payloads: {},
      meta: {},
      answers: { expectedDate: "2027-05-01", manual: { role: "mother", sex: "F", work: "selfEmployed", since: "2023-01-01", monthlyGross: 565_200, sicknessInsurance: "voluntary", arrears: false } },
      overrides: [],
      asOf: "2026-11-21",
      mode: "manual",
      deductionBps: DEDUCTION,
    });
    expect(b.unverified).not.toContain("zus-konto");
    expect(b.unverified).not.toContain("zus-saldo");
    expect(b.unverified).toContain("zus-ezla");
    expect(b.missing.map((q) => q.id)).not.toContain("manual");
  });

  it("other parent's estimated gross pay is converted with the deduction rate passed in", () => {
    const a = run("magdalena", { answers: { otherParent: { mode: "estimate", insured: "yes", estimatedGross: 700_000, role: "father" } } });
    expect(a.facts.otherParent).toMatchObject({ insured: "yes", estimatedBase: netOfDeduction(700_000, DEDUCTION) });
    expect(a.missing.map((q) => q.id)).not.toContain("otherParent");
  });

  it("overrides change the value, keep the original in provenance, and disappear on undo", () => {
    const at = "2026-11-21T10:00:00.000Z";
    const a = run("bartosz", { overrides: [{ path: "facts.claimant.titles[0].payer.over20Insured", value: true, at, note: "kadry" }] });
    expect(a.facts.claimant.titles[0].payer.over20Insured).toBe(true);
    expect(a.provenance["facts.claimant.titles[0].payer.over20Insured"]).toEqual({ source: "user", asOf: "2026-11-21", overridden: { original: false, at, note: "kadry" } });
    const undone = run("bartosz");
    expect(undone.facts.claimant.titles[0].payer.over20Insured).toBe(false);
    expect(undone.provenance["facts.claimant.titles[0].payer.over20Insured"]).toBeUndefined();
  });

  it("question list: one at a time per card, nothing a consented registry already provides", () => {
    expect(run("magdalena").missing.map((q) => q.id)).toEqual(["childrenCount", "zaZyciem", "plannedEnd", "otherParent"]);
    expect(run("monika").missing.map((q) => q.id)).toEqual(["otherParent"]);
    expect(run("oliwia").missing.find((q) => q.id === "expectedDate")?.required).toBe(true);
  });
});

describe("provenance lookup resolves every displayed path to its source", () => {
  const cases: [string, string, string][] = [
    ["monika", "facts.claimant.sex", "mobywatel"],
    ["monika", "facts.claimant.role", "zus-konto"],
    ["monika", "facts.claimant.titles[0].from", "zus-konto"],
    ["monika", "facts.claimant.titles[0].sickness.mode", "zus-konto"],
    ["monika", "facts.claimant.titles[0].payer.over20Insured", "zus-platnik"],
    ["monika", "facts.claimant.titles[0].payer.status", "krs"],
    ["monika", "facts.event.date", "rsc"],
    ["monika", "facts.event.children", "rsc"],
    ["monika", "facts.event.children[0].bornAlive", "rsc"],
    ["monika", "facts.event.children[0].gestationalWeek", "ezdrowie"],
    ["monika", "facts.event.children[1].hospitalStays", "ezdrowie"],
    ["monika", "facts.event.expectedDate", "ezdrowie"],
    ["monika", "facts.claimant.paidBenefits", "zus-swiadczenia"],
    ["magdalena", "facts.claimant.sickNotes", "zus-ezla"],
    ["weronika", "facts.claimant.arrears", "zus-saldo"],
    ["lucja", "facts.claimant.titles[0].suspensions", "ceidg"],
    ["hanna", "facts.claimant.titles[0].payer.status", "krs"],
  ];
  for (const [id, p, source] of cases) {
    it(`${id}: ${p} → ${source}`, () => {
      expect(lookupProvenance(run(id).provenance, p)?.source).toBe(source);
    });
  }

  it("a user's „Za życiem” answer is badged per child, not as the civil registry", () => {
    const a = run("magdalena", { answers: { zaZyciem: true } });
    expect(lookupProvenance(a.provenance, "facts.event.children[0].zaZyciem")?.source).toBe("user");
  });

  it("a role derived from sex says so (mObywatel), a manual role is the user's", () => {
    const p = persona("oliwia");
    const payloads = { ...p.systems, "zus-konto": { ...p.systems["zus-konto"]!, role: undefined } };
    const a = assemble({ payloads, meta: {}, answers: {}, overrides: [], asOf: p.asOf, mode: "mobywatel", deductionBps: DEDUCTION });
    expect(lookupProvenance(a.provenance, "facts.claimant.role")?.source).toBe("mobywatel");
  });
});

describe("override whitelist (S1)", () => {
  const facts = run("weronika").facts;
  it("rejects values of the wrong shape", () => {
    expect(validateOverride("facts.event.expectedDate", "banana", facts)).toMatchObject({ ok: false, code: "VALUE" });
    expect(validateOverride("facts.event.expectedDate", "2027-02-30", facts)).toMatchObject({ ok: false, code: "VALUE" });
    expect(validateOverride("facts.event.expectedDate", "2035-01-01", facts)).toMatchObject({ ok: false, code: "VALUE" });
    expect(validateOverride("facts.claimant.titles[0].sickness.mode", "sometimes", facts)).toMatchObject({ ok: false, code: "VALUE" });
    expect(validateOverride("facts.claimant.titles[0].statedBenefitBase", -5, facts)).toMatchObject({ ok: false, code: "VALUE" });
    expect(validateOverride("facts.claimant.titles[0].statedBenefitBase", 12.5, facts)).toMatchObject({ ok: false, code: "VALUE" });
  });
  it("rejects paths outside the whitelist and paths without a target", () => {
    expect(validateOverride("facts.claimant.role", "father", facts)).toMatchObject({ ok: false, code: "NOT_OVERRIDABLE" });
    expect(validateOverride("facts.claimant.titles[7].to", "2027-01-01", facts)).toMatchObject({ ok: false, code: "NO_TARGET" });
    expect(validateOverride("facts.claimant.arrears[9].repaidOn", "2026-12-01", facts)).toMatchObject({ ok: false, code: "NO_TARGET" });
  });
  it("accepts well-formed values, including on unset fields of an existing title", () => {
    expect(validateOverride("facts.claimant.titles[0].to", "2027-06-30", facts)).toEqual({ ok: true, value: "2027-06-30" });
    expect(validateOverride("facts.claimant.titles[0].sickness.mode", "voluntary", facts)).toEqual({ ok: true, value: "voluntary" });
    expect(validateOverride("facts.claimant.arrears[0].repaidOn", "2026-12-01", facts)).toEqual({ ok: true, value: "2026-12-01" });
  });
});

describe("login redirect target (S3)", () => {
  it.each(["/\\evil.example", "//evil.example", "https://evil.example", "/sytuacja?x=//evil", "", "sytuacja"])("rejects %j", (v) => {
    expect(safeNext(v)).toBeNull();
  });
  it.each(["/sytuacja", "/sprawy/B2-13", "/planuje-dziecko"])("accepts %j", (v) => {
    expect(safeNext(v)).toBe(v);
  });
});
