import "server-only";
import * as engine from "@/engine";
import type { Facts, ParameterSet, Plan, Result } from "@/engine/types";
import { getPublishedParams } from "./params-repo";

type Evaluate = (facts: Facts, plan: Plan | null, params: ParameterSet[]) => Result;

/** Single seam between the app and the rules engine. */
export async function evaluateFacts(facts: Facts, plan: Plan | null): Promise<{ result: Result | null; paramsVersion: string; error?: string }> {
  const { sets, version } = await getPublishedParams();
  const evaluate = (engine as unknown as { evaluate?: Evaluate }).evaluate;
  if (typeof evaluate !== "function") return { result: null, paramsVersion: version, error: "engine-not-ready" };
  try {
    return { result: evaluate(facts, plan, sets as unknown as ParameterSet[]), paramsVersion: version };
  } catch (err) {
    console.error("[engine] evaluation failed", err);
    return { result: null, paramsVersion: version, error: (err as Error).message };
  }
}
