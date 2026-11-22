import "server-only";
import type { Plan, Result } from "@/engine/types";
import type { AppContext } from "./context";
import { evaluateFacts } from "./engine-facade";
import { requiredForms, type FormSpec, type GuidanceInput, type SourceRef } from "./forms";
import { initialPlan } from "./plan-service";
import { buildSteps, type Step } from "./steps";
import { listSubmissions, type SubmissionRecord } from "./submissions-repo";

export interface Guidance {
  input: GuidanceInput;
  plan: Plan | null;
  result: Result | null;
  forms: FormSpec[];
  steps: Step[];
  submissions: SubmissionRecord[];
  /** The expected date (or care details) is still missing — dates are incomplete. */
  missingEvent: boolean;
}

/** Plan (saved → case → default), its evaluation, stored submissions, forms and steps for one session. */
export async function loadGuidance(ctx: AppContext): Promise<Guidance> {
  const facts = ctx.assembled.facts;
  const init = await initialPlan(facts, ctx.state.plan, ctx.state.mode === "case" ? ctx.answers.plan : undefined);
  const evaluated = await evaluateFacts(facts, init.plan);
  const result = evaluated.result ?? init.result;
  const submissions = listSubmissions(ctx.state.sid);
  const sources = Object.fromEntries(Object.entries(ctx.assembled.provenance).map(([k, v]) => [k, (v.overridden ? "user" : v.source) as SourceRef]));
  const dateSource = ctx.assembled.provenance["facts.event.date"]?.source;
  const careSource = ctx.assembled.provenance["facts.event.takenIntoCareOn"]?.source;
  const registered = facts.event.kind === "birth" ? Boolean(facts.event.date && (dateSource === "rsc" || dateSource === "sprawa")) : careSource === "rsc" || careSource === "sprawa";
  const input: GuidanceInput = {
    facts,
    plan: init.plan,
    result,
    submissions,
    registered,
    displayName: ctx.persona?.systems.mobywatel?.displayName,
    today: facts.asOf,
    sources,
  };
  const forms = requiredForms(input);
  const steps = buildSteps({ ...input, forms });
  return { input, plan: init.plan, result, forms, steps, submissions, missingEvent: ctx.assembled.missing.some((q) => q.required) };
}
