import { apiError, json, requireContext } from "@/server/api";
import { evaluateFacts } from "@/server/engine-facade";
import { STATELESS_LIMITS as LIMITS, statelessBody as body } from "@/server/evaluate-input";

/** Evaluate the session's facts (default) or a stateless { facts, plan } body. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) return apiError(413, "TOO_LARGE", "Zbyt duże dane wejściowe.");
  let parsedJson: unknown;
  try {
    parsedJson = raw ? JSON.parse(raw) : {};
  } catch {
    return apiError(400, "BAD_JSON", "Nieprawidłowe dane.");
  }
  const parsed = body.safeParse(parsedJson);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.slice(0, 20).map((i) => [i.path.join("."), i.message]));
    return apiError(422, "VALIDATION", "Sprawdź wprowadzone dane.", fields);
  }
  let facts = parsed.data.facts;
  let plan = parsed.data.plan ?? null;
  if (!facts) {
    const ctx = await requireContext();
    if (ctx instanceof Response) return ctx;
    facts = ctx.assembled.facts;
    plan = plan ?? ctx.answers.plan ?? null;
  }
  const { result, paramsVersion } = await evaluateFacts(facts, plan);
  // The detail is logged by the facade; clients get a generic message.
  if (!result) return apiError(500, "ENGINE", "Nie udało się wykonać obliczeń. Spróbuj ponownie później.");
  return json({ result, paramsVersion });
}
