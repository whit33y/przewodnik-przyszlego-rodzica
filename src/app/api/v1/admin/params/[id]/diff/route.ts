import { adminRoute, idParam, json } from "@/server/admin-api";
import { diffFor } from "@/server/admin-repo";

/** GET /api/v1/admin/params/{id}/diff — changed parameters vs the published set it replaces or follows. */
export const GET = adminRoute<RouteContext<"/api/v1/admin/params/[id]/diff">>(async (_req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  return json(diffFor(id));
});
