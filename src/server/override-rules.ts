/**
 * Corrections a user may make to registry data: a whitelist of fact paths, each with its own value schema.
 * Anything else is rejected before it reaches the engine's Facts. Spec: plan 03 §2 ("overridable paths are a
 * whitelist with a zod schema each").
 */
import { z } from "zod";
import type { Facts, ISODate } from "@/engine/types";
import { getPath } from "./assemble";

const shiftYears = (iso: ISODate, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

function isoDateBetween(min: ISODate, max: ISODate) {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD.")
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, "Taka data nie istnieje.")
    .refine((v) => v >= min && v <= max, `Data musi mieścić się między ${min} a ${max}.`);
}

/** Non-negative grosze, capped at 1 000 000 zł — far above any contribution base. */
const grosze = z.number().int("Kwota w groszach musi być liczbą całkowitą.").min(0, "Kwota nie może być ujemna.").max(100_000_000, "Kwota jest zbyt wysoka.");

interface Rule {
  re: RegExp;
  /** Path whose value must already exist (e.g. the title being corrected). */
  parent?: (path: string) => string;
  schema: (asOf: ISODate) => z.ZodType<string | number | boolean>;
}

const upTo = (re: RegExp) => (path: string) => path.match(re)?.[0] ?? path;

export const OVERRIDE_RULES: Rule[] = [
  { re: /^facts\.event\.expectedDate$/, schema: (a) => isoDateBetween(shiftYears(a, -1), shiftYears(a, 1)) },
  { re: /^facts\.event\.date$/, schema: (a) => isoDateBetween(shiftYears(a, -6), a) },
  { re: /^facts\.claimant\.titles\[\d+\]\.(from|to|registeredOn)$/, parent: upTo(/^facts\.claimant\.titles\[\d+\]/), schema: (a) => isoDateBetween("1960-01-01", shiftYears(a, 2)) },
  { re: /^facts\.claimant\.titles\[\d+\]\.statedBenefitBase$/, parent: upTo(/^facts\.claimant\.titles\[\d+\]/), schema: () => grosze },
  { re: /^facts\.claimant\.titles\[\d+\]\.payer\.over20Insured$/, parent: upTo(/^facts\.claimant\.titles\[\d+\]/), schema: () => z.boolean() },
  { re: /^facts\.claimant\.titles\[\d+\]\.months\[\d+\]\.contributionBase$/, parent: upTo(/^facts\.claimant\.titles\[\d+\]\.months\[\d+\]/), schema: () => grosze },
  { re: /^facts\.claimant\.titles\[\d+\]\.sickness\.mode$/, parent: upTo(/^facts\.claimant\.titles\[\d+\]/), schema: () => z.enum(["mandatory", "voluntary", "none"]) },
  { re: /^facts\.claimant\.arrears\[\d+\]\.amount$/, parent: upTo(/^facts\.claimant\.arrears\[\d+\]/), schema: () => grosze },
  { re: /^facts\.claimant\.arrears\[\d+\]\.repaidOn$/, parent: upTo(/^facts\.claimant\.arrears\[\d+\]/), schema: (a) => isoDateBetween(shiftYears(a, -6), shiftYears(a, 2)) },
];

export function isOverridable(path: string): boolean {
  return OVERRIDE_RULES.some((r) => r.re.test(path));
}

export type OverrideCheck = { ok: true; value: string | number | boolean } | { ok: false; code: "NOT_OVERRIDABLE" | "NO_TARGET" | "VALUE"; message: string };

/** Validates one correction against the whitelist, the path's value schema and the current facts. */
export function validateOverride(path: string, value: unknown, facts: Facts): OverrideCheck {
  const rule = OVERRIDE_RULES.find((r) => r.re.test(path));
  if (!rule) return { ok: false, code: "NOT_OVERRIDABLE", message: "Tej wartości nie można poprawić w serwisie." };
  if (rule.parent) {
    const target = getPath(facts, rule.parent(path));
    if (target === undefined || target === null || typeof target !== "object") return { ok: false, code: "NO_TARGET", message: "Nie ma takiej pozycji do poprawienia." };
  }
  const parsed = rule.schema(facts.asOf).safeParse(value);
  if (!parsed.success) return { ok: false, code: "VALUE", message: parsed.error.issues[0]?.message ?? "Nieprawidłowa wartość." };
  return { ok: true, value: parsed.data };
}
