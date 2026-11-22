/** Admin parameter schema (plan 06 §3): seed files validate, the form spec covers every leaf, units round-trip. */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fromInput, formatParam, toInput } from "@/lib/param-units";
import { diffSets, fieldSpecs, getPath, issuesToFields, parameterSetSchema, setPath } from "@/server/params-schema";

const dir = path.resolve(__dirname, "../../data/params");
const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
const load = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const current = load("2026-01-01.json");

function leaves(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  const o = obj as Record<string, unknown>;
  if ("num" in o && "den" in o) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

describe("parameter schema", () => {
  it.each(files)("statutory set %s validates", (f) => {
    const r = parameterSetSchema.safeParse(load(f));
    expect(r.success ? [] : issuesToFields(r.error)).toEqual([]);
  });

  it("the generated form covers every parameter of the seed file", () => {
    const header = new Set(["id", "validFrom", "label", "sources"]);
    const expected = leaves(current).filter((p) => !header.has(p.split(".")[0])).sort();
    const specs = fieldSpecs();
    expect(specs.map((s) => s.path).sort()).toEqual(expected);
    for (const s of specs) {
      expect(s.label.length, s.path).toBeGreaterThan(3);
      expect(s.group, s.path).toBeTruthy();
    }
    expect(specs.filter((s) => s.unit === "interpretation").every((s) => s.readings?.yes && s.readings.no && s.readings.support)).toBe(true);
    expect(specs.find((s) => s.path === "rates.parental")).toMatchObject({ unit: "bps", min: 0, max: 10000, group: "rates" });
  });

  it("rejects out-of-range values with field errors in the person's units", () => {
    const bad = setPath(setPath(setPath(current, "rates.parental", 12000), "parental.weeks.single", -1), "deductions.employeeSocialBps", 0);
    const r = parameterSetSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const fields = issuesToFields(r.error!);
    expect(fields["rates.parental"]).toBe("Najwyżej 100%.");
    expect(fields["parental.weeks.single"]).toBe("Wartość nie może być ujemna.");
    expect(fields["deductions.employeeSocialBps"]).toMatch(/Najmniej 0,01%/);
  });

  it("rejects unknown keys and inconsistent combinations", () => {
    expect(parameterSetSchema.safeParse({ ...current, extra: 1 }).success).toBe(false);
    const r = parameterSetSchema.safeParse(setPath(current, "maternity.weeksByChildren.2", 10));
    expect(issuesToFields(r.error!)["maternity.weeksByChildren.2"]).toMatch(/krótszy/);
  });

  it("diff lists changed parameters only, with formatted values", () => {
    const draft = { ...setPath(current, "rates.parental", 7500), id: "ps-x", validFrom: "2027-01-01", label: "Projekt" };
    expect(diffSets(current, draft)).toEqual([expect.objectContaining({ path: "rates.parental", fromText: "70%", toText: "75%" })]);
    expect(getPath(draft, "rates.parental")).toBe(7500);
    expect(getPath(current, "rates.parental")).toBe(7000);
  });
});

describe("parameter units", () => {
  it("złote ↔ grosze", () => {
    expect(toInput("grosze", 480600)).toBe("4806,00");
    expect(fromInput("grosze", "4 806,00")).toEqual({ ok: true, value: 480600 });
    expect(fromInput("grosze", "4806.5")).toEqual({ ok: true, value: 480650 });
    expect(fromInput("grosze", "48,061").ok).toBe(false);
    expect(formatParam("grosze", 480600)).toBe("4806,00 zł".replace("4806", "4 806"));
  });
  it("percent ↔ basis points", () => {
    expect(toInput("bps", 8150)).toBe("81,5");
    expect(fromInput("bps", "75")).toEqual({ ok: true, value: 7500 });
    expect(fromInput("bps", "81,5%")).toEqual({ ok: true, value: 8150 });
    expect(fromInput("bps", "abc").ok).toBe(false);
  });
  it("fractions, integers, nullable dates", () => {
    expect(fromInput("fraction", "1/2")).toEqual({ ok: true, value: { num: 1, den: 2 } });
    expect(toInput("fraction", { num: 3, den: 8 })).toBe("3/8");
    expect(fromInput("weeks", "20,5").ok).toBe(false);
    expect(fromInput("dateOrNull", "")).toEqual({ ok: true, value: null });
    expect(formatParam("weeks", 20)).toBe("20 tyg.");
  });
});
