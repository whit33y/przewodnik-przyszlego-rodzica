import { z } from "zod";
import { apiError, json, requireContext } from "@/server/api";
import { evaluateFacts } from "@/server/engine-facade";
import type { Facts, Plan } from "@/engine/types";

const body = z.object({ facts: z.record(z.string(), z.unknown()).optional(), plan: z.record(z.string(), z.unknown()).nullable().optional() });

/** Evaluate the session's facts (default) or a stateless { facts, plan } body. */
export async function POST(req: Request) {
  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(await req.json());
  } catch {
    return apiError(400, "BAD_REQUEST", "Nieprawidłowe dane.");
  }
  let facts = parsed.facts as unknown as Facts | undefined;
  if (!facts) {
    const ctx = await requireContext();
    if (ctx instanceof Response) return ctx;
    facts = ctx.assembled.facts;
  }
  const { result, paramsVersion, error } = await evaluateFacts(facts, (parsed.plan as unknown as Plan) ?? null);
  if (!result) return apiError(503, "ENGINE", error ?? "Silnik obliczeń jest niedostępny.");
  return json({ result, paramsVersion });
}
