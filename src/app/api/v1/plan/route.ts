import { apiError, json, parseJson, requireContext } from "@/server/api";
import { evaluatePlan, initialPlan, planSchema } from "@/server/plan-service";
import { updateState } from "@/server/session-state";
import { z } from "zod";

/** Current plan with its evaluation under both rate options. */
export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const init = await initialPlan(ctx.assembled.facts, ctx.state.plan, ctx.state.mode === "case" ? ctx.answers.plan : undefined);
  if (!init.plan) return apiError(409, "NO_PLAN", "Nie można ułożyć planu dla tej sytuacji.");
  const out = await evaluatePlan(ctx.assembled.facts, init.plan);
  return json({ plan: init.plan, origin: init.origin, ...out });
}

/** Save and evaluate in one call — no save/evaluate race. */
export async function PUT(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, z.object({ plan: planSchema }));
  if (data instanceof Response) return data;
  updateState(ctx.state.sid, { plan: data.plan });
  const out = await evaluatePlan(ctx.assembled.facts, data.plan);
  if (!out.result) return apiError(503, "ENGINE", "Nie udało się przeliczyć planu. Spróbuj ponownie.");
  return json({ ...out, savedAt: new Date().toISOString() });
}

/** Reset to the default plan (case mode: the claim as filed). */
export async function DELETE() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  updateState(ctx.state.sid, { plan: null });
  const init = await initialPlan(ctx.assembled.facts, null, ctx.state.mode === "case" ? ctx.answers.plan : undefined);
  if (!init.plan) return apiError(409, "NO_PLAN", "Nie można ułożyć planu dla tej sytuacji.");
  const out = await evaluatePlan(ctx.assembled.facts, init.plan);
  return json({ plan: init.plan, origin: init.origin, ...out });
}
