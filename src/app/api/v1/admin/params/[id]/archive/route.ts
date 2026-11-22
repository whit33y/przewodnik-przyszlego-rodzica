import { adminRoute, idParam, json } from "@/server/admin-api";
import { archiveSet } from "@/server/admin-repo";

/** POST /api/v1/admin/params/{id}/archive — remove a set from selection (not the only one covering today). */
export const POST = adminRoute<RouteContext<"/api/v1/admin/params/[id]/archive">>(async (_req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const set = archiveSet(id);
  return json({ set: { ...set, payload: undefined } });
});
