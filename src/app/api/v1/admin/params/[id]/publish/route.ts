import { z } from "zod";
import { adminRoute, heavyLimit, idParam, json, parseJson } from "@/server/admin-api";
import { publishDraft } from "@/server/admin-repo";

const body = z.object({ confirmValidFrom: z.iso.date({ error: "Wpisz datę wejścia w życie." }) }).strict();

/**
 * POST /api/v1/admin/params/{id}/publish { confirmValidFrom } — the typed date must equal the draft's validFrom.
 * Publishing invalidates tag 'params': the next calculator request uses the new list.
 */
export const POST = adminRoute<RouteContext<"/api/v1/admin/params/[id]/publish">>(async (req, session, ctx) => {
  const id = await idParam(ctx);
  if (id instanceof Response) return id;
  const limited = heavyLimit(session, "publish");
  if (limited) return limited;
  const parsed = await parseJson(req, body);
  if (parsed instanceof Response) return parsed;
  const { set, replaced, diff } = publishDraft(id, parsed.confirmValidFrom);
  return json({ set: { ...set, payload: undefined }, replaced, changes: diff.length });
});
