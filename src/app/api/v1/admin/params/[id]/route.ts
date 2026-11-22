import { z } from "zod";
import { apiError } from "@/server/api";
import { adminRoute, idParam, json, parseJson } from "@/server/admin-api";
import { getSet, updateDraft } from "@/server/admin-repo";

type Ctx = RouteContext<"/api/v1/admin/params/[id]">;

/** GET /api/v1/admin/params/{id} — status, metadata and payload. */
export const GET = adminRoute<Ctx>(async (_req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const set = getSet(id);
  return set ? json({ set }) : apiError(404, "NOT_FOUND", "Nie ma takiego zestawu parametrów.");
});

// Shape is checked loosely here; the full ParameterSet schema (bounds, units, cross-field rules) runs in updateDraft
// so that errors come back mapped to field paths.
const body = z.object({ payload: z.record(z.string(), z.unknown()) }).strict();

/** PUT /api/v1/admin/params/{id} { payload } — save a draft (published and archived sets are immutable). */
export const PUT = adminRoute<Ctx>(async (req, _s, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const parsed = await parseJson(req, body);
  if (parsed instanceof Response) return parsed;
  return json({ set: updateDraft(id, parsed.payload) });
});
