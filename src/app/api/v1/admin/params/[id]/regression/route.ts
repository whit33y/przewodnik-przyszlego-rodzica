import { adminRoute, heavyLimit, idParam, json } from "@/server/admin-api";
import { latestRegression, runDraftRegression } from "@/server/admin-repo";

type Ctx = RouteContext<"/api/v1/admin/params/[id]/regression">;

/** GET — the last stored regression summary for this set (null when never run). */
export const GET = adminRoute<Ctx>(async (_req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  return json({ summary: latestRegression(id) });
});

/** POST — run all sample cases and demo personas against the published list and the list with this draft. */
export const POST = adminRoute<Ctx>(async (_req, session, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const limited = heavyLimit(session, "regression");
  if (limited) return limited;
  return json({ summary: runDraftRegression(id) });
});
