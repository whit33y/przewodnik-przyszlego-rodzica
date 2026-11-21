/**
 * Validation for stateless evaluation (POST /api/v1/evaluate without a session, and the logged-out planning
 * check-up): the fixture schemas for facts and plan plus size caps, so unauthenticated input never reaches the
 * engine unchecked.
 */
import { z } from "zod";
import type { Facts, Plan } from "@/engine/types";
import { factsSchema, planSchema } from "@/integrations/case-schema";

export const STATELESS_LIMITS = { bodyBytes: 256_000, titles: 12, monthsPerTitle: 120, blocks: 40, children: 8, listItems: 200 } as const;
const L = STATELESS_LIMITS;

export const limitedFacts = factsSchema
  .refine((f) => f.claimant.titles.length <= L.titles, `Najwyżej ${L.titles} tytułów ubezpieczenia.`)
  .refine((f) => f.claimant.titles.every((t) => t.months.length <= L.monthsPerTitle), `Najwyżej ${L.monthsPerTitle} miesięcy na tytuł.`)
  .refine((f) => f.event.children.length <= L.children, `Najwyżej ${L.children} dzieci.`)
  .refine((f) => [f.claimant.sickNotes, f.claimant.paidBenefits, f.claimant.arrears, f.claimant.insuranceDecisions].every((l) => l.length <= L.listItems), "Zbyt długa lista.");

export const limitedPlan = planSchema.refine((p) => p.blocks.length <= L.blocks, `Najwyżej ${L.blocks} okresów w planie.`);

export const statelessBody = z.object({ facts: limitedFacts.optional(), plan: limitedPlan.nullable().optional() }).strict();

export type StatelessCheck = { ok: true; facts: Facts; plan: Plan | null } | { ok: false; fields: Record<string, string> };

/** Validates facts (and optionally a plan) assembled outside a session before they are evaluated. */
export function validateStateless(facts: unknown, plan: unknown = null): StatelessCheck {
  const parsed = statelessBody.safeParse({ facts, plan });
  if (!parsed.success || !parsed.data.facts) {
    const issues = parsed.success ? [] : parsed.error.issues;
    return { ok: false, fields: Object.fromEntries(issues.slice(0, 20).map((i) => [i.path.join("."), i.message])) };
  }
  return { ok: true, facts: parsed.data.facts, plan: parsed.data.plan ?? null };
}
