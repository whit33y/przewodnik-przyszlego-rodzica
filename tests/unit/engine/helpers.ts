/** Builders for engine unit tests: compact Facts / Plan construction with 2026 parameters by default. */
import fs from "node:fs";
import path from "node:path";
import { evaluate, type Facts, type InsuranceTitle, type MonthRecord, type OtherParent, type ParameterSet, type Person, type Plan, type PlanBlock, type Result } from "@/engine";
import { addYearMonths, yearMonth } from "@/engine/dates";

const dir = path.resolve(__dirname, "../../../data/params");
export const sets: ParameterSet[] = fs
  .readdirSync(dir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as ParameterSet);
export const p2026 = sets.find((s) => s.id === "2026-01-01")!;

/** `n` monthly records with a constant base, ending in the month before `beforeDate`'s month. */
export function months(beforeDate: string, n: number, base: number, extra: Partial<MonthRecord> = {}): MonthRecord[] {
  const last = addYearMonths(yearMonth(beforeDate), -1);
  return Array.from({ length: n }, (_, k) => ({ month: addYearMonths(last, k - n + 1), contributionBase: base, ...extra }));
}

export function employee(o: { id?: string; from: string; to?: string; endReason?: InsuranceTitle["endReason"]; gross?: number; ref?: string; n?: number; fraction?: { num: number; den: number }; over20?: boolean; payer?: Partial<InsuranceTitle["payer"]>; extra?: Partial<InsuranceTitle> }): InsuranceTitle {
  return {
    id: o.id ?? "t1",
    kind: "employment",
    from: o.from,
    to: o.to,
    endReason: o.endReason,
    sickness: { mode: "mandatory", periods: [{ from: o.from, to: o.to }] },
    workTime: o.fraction ? [{ from: o.from, fraction: o.fraction }] : undefined,
    payer: { ref: "payer-1", kind: "employer", over20Insured: o.over20 ?? false, ...o.payer },
    months: o.gross !== undefined && o.ref ? months(o.ref, o.n ?? 12, o.gross) : [],
    ...o.extra,
  };
}

export function selfEmployed(o: { id?: string; from: string; registeredOn?: string; base?: number; ref?: string; n?: number; scheme?: InsuranceTitle["scheme"]; periods?: { from: string; to?: string }[]; extra?: Partial<InsuranceTitle> }): InsuranceTitle {
  return {
    id: o.id ?? "t1",
    kind: "selfEmployed",
    from: o.from,
    sickness: { mode: "voluntary", periods: o.periods ?? [{ from: o.from }] },
    registeredOn: o.registeredOn,
    scheme: o.scheme ?? "standard",
    payer: { ref: "payer-self", kind: "self" },
    months: o.base !== undefined && o.ref ? months(o.ref, o.n ?? 12, o.base) : [],
    ...o.extra,
  };
}

export function mandate(o: { id?: string; from: string; sicknessFrom?: string; income?: number; ref?: string; n?: number; registeredOn?: string; mode?: "voluntary" | "none" }): InsuranceTitle {
  return {
    id: o.id ?? "t1",
    kind: "mandate",
    from: o.from,
    sickness: { mode: o.mode ?? "voluntary", periods: o.mode === "none" ? [] : [{ from: o.sicknessFrom ?? o.from }] },
    registeredOn: o.registeredOn,
    payer: { ref: "payer-1", kind: "client", over20Insured: false },
    months: o.income !== undefined && o.ref ? months(o.ref, o.n ?? 12, o.income) : [],
  };
}

export function person(titles: InsuranceTitle[], extra: Partial<Person> = {}): Person {
  return { sex: "F", role: "mother", titles, sickNotes: [], paidBenefits: [], arrears: [], insuranceDecisions: [], ...extra };
}

export function father(titles: InsuranceTitle[], extra: Partial<Person> = {}): Person {
  return person(titles, { sex: "M", role: "father", ...extra });
}

export function birth(o: { asOf: string; claimant: Person; date?: string; expected?: string; children?: Facts["event"]["children"]; otherParent?: OtherParent; parameterDate?: string; documents?: NonNullable<Extract<Facts["event"], { kind: "birth" }>["documents"]> }): Facts {
  return {
    asOf: o.asOf,
    parameterDate: o.parameterDate,
    claimant: o.claimant,
    otherParent: o.otherParent,
    event: { kind: "birth", date: o.date, expectedDate: o.expected, children: o.children ?? [{ ref: "child-1", bornAlive: true }], documents: o.documents },
  };
}

export function block(id: string, type: PlanBlock["type"], from: string, days: number, extra: Partial<PlanBlock> = {}): PlanBlock {
  return { id, parent: "claimant", type, titleId: "t1", from, days, ...extra };
}

export function plan(blocks: PlanBlock[], o: Partial<Omit<Plan, "blocks">> = {}): Plan {
  return { rateOption: "split100_70", ...o, blocks };
}

export function run(facts: Facts, p: Plan | null = null): Result {
  return evaluate(facts, p, sets);
}

export const codes = (r: Result) => r.alerts.map((a) => a.code);
export const periodsOf = (r: Result, type: string, parent: "claimant" | "other" = "claimant") => r.periods.filter((p) => p.type === type && p.parent === parent);
export const payableDays = (r: Result, type: string, parent: "claimant" | "other" = "claimant") => periodsOf(r, type, parent).filter((p) => p.status === "payable").reduce((a, p) => a + p.days, 0);
