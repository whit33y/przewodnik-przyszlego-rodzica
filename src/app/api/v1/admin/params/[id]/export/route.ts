import { apiError } from "@/server/api";
import { adminRoute, idParam } from "@/server/admin-api";
import { getSet } from "@/server/admin-repo";

/** GET /api/v1/admin/params/{id}/export — the payload as a JSON file in the shape of data/params/*.json. */
export const GET = adminRoute<RouteContext<"/api/v1/admin/params/[id]/export">>(async (_req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const set = getSet(id);
  if (!set) return apiError(404, "NOT_FOUND", "Nie ma takiego zestawu parametrów.");
  return new Response(JSON.stringify(set.payload, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="parametry-${set.payload.validFrom}-${set.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
