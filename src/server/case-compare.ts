import "server-only";
import { compare, evaluate, type FieldResult } from "@/engine";
import { preEventFacts } from "@/engine/pre-event";
import type { Alert } from "@/engine/types";
import { evaluateFacts } from "./engine-facade";
import { readCaseInput } from "./persona-store";
import { readExpected } from "./cases-repo";

export type { FieldResult };

/**
 * Re-adjudicate a sample case with the engine and compare field by field with ZUS's decision.
 * `preEvent` is the replay the golden alert-recall suite runs: the facts as they stood 60 days before the decisive
 * date, evaluated prospectively. Only alerts that actually fire there are shown as "what the app would have shown".
 */
export async function compareCase(id: string) {
  const input = readCaseInput(id);
  const expected = readExpected(id);
  if (!input || !expected) return null;
  const { result, paramsVersion, sets, error } = await evaluateFacts(input.facts, input.plan);
  const fields = result ? compare(result, expected) : [];
  const summary = { match: 0, mismatch: 0, reported: 0, knownDivergence: 0 };
  for (const f of fields) summary[f.status]++;
  let preEvent: { asOf: string; alerts: Alert[] } | null = null;
  try {
    const facts = preEventFacts({ facts: input.facts, plan: input.plan });
    preEvent = { asOf: facts.asOf, alerts: evaluate(facts, null, sets).alerts };
  } catch (err) {
    console.error("[engine] pre-event replay failed", id, err);
  }
  return { id, input: { title: input.title, scenario: input.scenario, tags: input.tags, extractionNotes: input.extractionNotes }, expected, result, fields, summary, preEvent, paramsVersion, error };
}
