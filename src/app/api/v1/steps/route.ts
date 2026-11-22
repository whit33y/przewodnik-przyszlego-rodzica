import { json, requireContext } from "@/server/api";
import { loadGuidance } from "@/server/guidance";
import { groupSteps } from "@/server/steps";

/** Dated checklist ("Co i kiedy") for the current session. */
export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const g = await loadGuidance(ctx);
  return json({ routing: g.result?.routing ?? null, missingEvent: g.missingEvent, groups: groupSteps(g.steps) });
}
