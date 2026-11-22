/**
 * Units of the admin parameter form. Values are stored as the engine needs them (grosze, basis points,
 * integers, fractions) and edited as people think of them (złote, percent, "1/2"). Pure, client-safe.
 */

export type ParamUnit =
  | "grosze" | "bps" | "weeks" | "days" | "months" | "years" | "count" | "grams"
  | "fraction" | "bool" | "interpretation" | "dateOrNull" | "enum" | "fixed";

export const unitSuffix: Partial<Record<ParamUnit, string>> = {
  grosze: "zł",
  bps: "%",
  weeks: "tyg.",
  days: "dni",
  months: "mies.",
  years: "lat",
  grams: "g",
};

const nf = new Intl.NumberFormat("pl-PL", { useGrouping: "always", maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("pl-PL", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FractionValue { num: number; den: number }

/** Stored value → text shown in an input. */
export function toInput(unit: ParamUnit, value: unknown): string {
  if (value === null || value === undefined) return "";
  switch (unit) {
    case "grosze":
      return (Number(value) / 100).toFixed(2).replace(".", ",");
    case "bps":
      return String(Number(value) / 100).replace(".", ",");
    case "fraction": {
      const f = value as FractionValue;
      return `${f.num}/${f.den}`;
    }
    case "bool":
    case "interpretation":
      return value ? "true" : "false";
    default:
      return String(value);
  }
}

export type Parsed = { ok: true; value: unknown } | { ok: false; error: string };

function parseDecimal(text: string): number | null {
  const t = text.replace(/\s| /g, "").replace(/zł|%/gi, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Text from an input → stored value, or a Polish error in the units the person typed. */
export function fromInput(unit: ParamUnit, text: string): Parsed {
  const t = text.trim();
  switch (unit) {
    case "grosze": {
      const n = parseDecimal(t);
      if (n === null) return { ok: false, error: "Wpisz kwotę w złotych, np. 4806,00." };
      if (!/^-?\d+([.,]\d{1,2})?$/.test(t.replace(/\s| |zł/gi, ""))) return { ok: false, error: "Kwota może mieć najwyżej 2 miejsca po przecinku." };
      return { ok: true, value: Math.round(n * 100) };
    }
    case "bps": {
      const n = parseDecimal(t);
      if (n === null) return { ok: false, error: "Wpisz wartość w procentach, np. 70 albo 81,5." };
      const bps = Math.round(n * 100);
      if (Math.abs(n * 100 - bps) > 1e-6) return { ok: false, error: "Procent może mieć najwyżej 2 miejsca po przecinku." };
      return { ok: true, value: bps };
    }
    case "fraction": {
      const m = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
      if (!m) return { ok: false, error: "Wpisz ułamek, np. 1/2." };
      return { ok: true, value: { num: Number(m[1]), den: Number(m[2]) } };
    }
    case "bool":
    case "interpretation":
      return { ok: true, value: t === "true" };
    case "dateOrNull":
      if (t === "") return { ok: true, value: null };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false, error: "Wpisz datę w formacie RRRR-MM-DD albo zostaw puste." };
      return { ok: true, value: t };
    case "enum":
      return { ok: true, value: t };
    case "fixed":
      return { ok: true, value: Number(t) };
    default: {
      if (!/^-?\d+$/.test(t.replace(/\s| /g, ""))) return { ok: false, error: "Wpisz liczbę całkowitą." };
      return { ok: true, value: Number(t.replace(/\s| /g, "")) };
    }
  }
}

/** Stored value → human text with its unit (diffs, read-only views, the audit log). */
export function formatParam(unit: ParamUnit, value: unknown, options?: { value: string; label: string }[]): string {
  if (value === null || value === undefined) return "brak";
  switch (unit) {
    case "grosze":
      return `${money.format(Number(value) / 100)} zł`;
    case "bps":
      return `${nf.format(Number(value) / 100)}%`;
    case "fraction": {
      const f = value as FractionValue;
      return `${f.num}/${f.den}`;
    }
    case "bool":
    case "interpretation":
      return value ? "Tak" : "Nie";
    case "enum":
      return options?.find((o) => o.value === value)?.label ?? String(value);
    case "dateOrNull":
    case "fixed":
      return String(value);
    default: {
      const s = unitSuffix[unit];
      return s ? `${nf.format(Number(value))} ${s}` : nf.format(Number(value));
    }
  }
}

/** Bound of a stored number shown in the person's units (for "Najwyżej 100%"). */
export function formatBound(unit: ParamUnit, value: number): string {
  return formatParam(unit, value);
}
