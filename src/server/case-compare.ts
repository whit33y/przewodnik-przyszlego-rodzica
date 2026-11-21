import "server-only";
import * as engine from "@/engine";
import type { Result } from "@/engine/types";
import { evaluateFacts } from "./engine-facade";
import { readCaseInput } from "./persona-store";
import { readExpected } from "./cases-repo";

export interface FieldResult {
  path: string;
  tier: string;
  status: "match" | "mismatch" | "reported" | "knownDivergence";
  expected: unknown;
  actual: unknown;
}

type Compare = (result: Result, expected: unknown) => FieldResult[];

/** Re-adjudicate a sample case with the engine and compare field by field with ZUS's decision. */
export async function compareCase(id: string) {
  const input = readCaseInput(id);
  const expected = readExpected(id);
  if (!input || !expected) return null;
  const { result, paramsVersion, error } = await evaluateFacts(input.facts, input.plan);
  const compare = (engine as unknown as { compare?: Compare }).compare;
  const fields = result && typeof compare === "function" ? compare(result, expected) : [];
  const summary = { match: 0, mismatch: 0, reported: 0, knownDivergence: 0 };
  for (const f of fields) summary[f.status]++;
  return { id, input: { title: input.title, scenario: input.scenario, tags: input.tags, extractionNotes: input.extractionNotes }, expected, result, fields, summary, paramsVersion, error };
}
