import "server-only";
import { z } from "zod";
import type { Facts, Plan, Result, YearMonth, Grosze } from "@/engine/types";
import { evaluateFacts } from "./engine-facade";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planSchema = z.object({
  rateOption: z.enum(["split100_70", "averaged81_5"]),
  applicationDate: isoDate.optional(),
  singleTitleStatement: z.boolean().optional(),
  blocks: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        parent: z.enum(["claimant", "other"]),
        type: z.enum(["sickPay", "sickness", "rehabilitation", "art30PreBirth", "maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"]),
        titleId: z.string().max(20).optional(),
        from: isoDate,
        days: z.number().int().min(1).max(1000),
        workFraction: z.object({ num: z.number().int().min(0).max(8), den: z.number().int().min(1).max(8) }).optional(),
        pool: z.enum(["shared", "ownNineWeeks"]).optional(),
        claimedSeparatelyOn: isoDate.optional(),
        takeover: z.enum(["afterResignation", "motherHospital", "motherIncapacity", "motherDeath", "motherAbandonment"]).optional(),
      }),
    )
    .max(24),
}) satisfies z.ZodType<Plan>;

export interface AltSummary {
  rateOption: Plan["rateOption"];
  available: boolean;
  deadline?: string;
  totals: Result["totals"];
  months: { month: YearMonth; gross: Grosze; net: Grosze }[];
}

function monthsOf(r: Result) {
  const m = new Map<string, { gross: number; net: number }>();
  for (const p of r.periods) for (const x of p.months) {
    const cur = m.get(x.month) ?? { gross: 0, net: 0 };
    cur.gross += x.gross + x.topUp;
    cur.net += x.net + x.topUp;
    m.set(x.month, cur);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
}

/** Evaluate a plan and the same plan under the other rate option (for the comparison card). */
export async function evaluatePlan(facts: Facts, plan: Plan): Promise<{ result: Result | null; alt: AltSummary | null; error?: string }> {
  const main = await evaluateFacts(facts, plan);
  if (!main.result) return { result: null, alt: null, error: main.error };
  const otherOption: Plan["rateOption"] = plan.rateOption === "averaged81_5" ? "split100_70" : "averaged81_5";
  const other = await evaluateFacts(facts, { ...plan, rateOption: otherOption });
  const alt: AltSummary | null = other.result
    ? {
        rateOption: otherOption,
        // Only the late-81.5% violation (it carries `deadline` + `applicationDate`) makes the option unavailable.
        available: !other.result.violations.some((v) => v.code === "DEADLINE_PASSED" && "applicationDate" in (v.values ?? {})),
        deadline: other.result.deadlines.find((d) => d.code === "RATE_OPTION_21_DAYS")?.date,
        totals: other.result.totals,
        months: monthsOf(other.result),
      }
    : null;
  return { result: main.result, alt };
}

export function planAnchor(facts: Facts): string {
  const ev = facts.event;
  return ev.kind === "birth" ? (ev.date ?? ev.expectedDate ?? facts.asOf) : ev.takenIntoCareOn;
}

/** A plan as stored: the plan plus the event date it was laid out against. */
export type StoredPlan = Plan & { anchor?: string };

function shiftDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** When the due date moved after the plan was saved, move the leave blocks with it. */
export function rebase(saved: StoredPlan, anchor: string): Plan {
  const { anchor: was, ...plan } = saved;
  if (!was || was === anchor) return plan;
  const [a, b] = [was, anchor].map((x) => Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)));
  const delta = Math.round((b - a) / 86_400_000);
  const leave = new Set(["maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"]);
  return { ...plan, blocks: plan.blocks.map((x) => (leave.has(x.type) ? { ...x, from: shiftDays(x.from, delta) } : x)) };
}

/** Initial plan: saved (rebased to the current event date) → claim from the case file → engine's default. */
export async function initialPlan(facts: Facts, saved: StoredPlan | null, fromAnswers?: Plan): Promise<{ plan: Plan | null; origin: "saved" | "case" | "default"; result: Result | null; error?: string }> {
  if (saved) return { plan: rebase(saved, planAnchor(facts)), origin: "saved", result: null };
  if (fromAnswers) return { plan: fromAnswers, origin: "case", result: null };
  const { result, error } = await evaluateFacts(facts, null);
  return { plan: result?.defaultPlan ?? null, origin: "default", result, error };
}
