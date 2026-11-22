import "server-only";
import { evaluate } from "@/engine";
import type { Facts, ParameterSet, Plan, Result } from "@/engine/types";
import { getPublishedParams } from "./params-repo";

/** Single seam between the app and the rules engine. Errors are logged here; callers show a generic message. */
export async function evaluateFacts(facts: Facts, plan: Plan | null): Promise<{ result: Result | null; paramsVersion: string; sets: ParameterSet[]; error?: string }> {
  const { sets, version } = await getPublishedParams();
  const typed = sets as unknown as ParameterSet[];
  try {
    return { result: evaluate(facts, plan, typed), paramsVersion: version, sets: typed };
  } catch (err) {
    console.error("[engine] evaluation failed", err);
    return { result: null, paramsVersion: version, sets: typed, error: "engine-error" };
  }
}

/** Published parameter sets typed for the engine (the files are validated at publish time). */
export async function engineParams(): Promise<ParameterSet[]> {
  const { sets } = await getPublishedParams();
  return sets as unknown as ParameterSet[];
}
