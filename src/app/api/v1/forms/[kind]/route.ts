import { apiError, json, requireContext } from "@/server/api";
import { findForm, formPrefill } from "@/server/forms";
import { loadGuidance } from "@/server/guidance";

/** Pre-fill JSON for one form (slug as in /wnioski/{slug}). */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/forms/[kind]">) {
  const app = await requireContext();
  if (app instanceof Response) return app;
  const { kind } = await ctx.params;
  const g = await loadGuidance(app);
  const spec = findForm(g.forms, kind);
  if (!spec) return apiError(404, "NOT_APPLICABLE", "Ten wniosek nie dotyczy Twojej sytuacji.");
  return json(formPrefill(spec, g.input));
}
