import { z } from "zod";
import { adminRoute, json, parseJson, setIdSchema } from "@/server/admin-api";
import { createDraft, inForceOn, listSets, today } from "@/server/admin-repo";

/** GET /api/v1/admin/params — every set (draft, published, archived) and the one in force today. */
export const GET = adminRoute(() => json({ sets: listSets(), inForceToday: inForceOn(today()) }));

const body = z.object({ fromId: setIdSchema }).strict();

/** POST /api/v1/admin/params { fromId } — new draft copied from an existing set. */
export const POST = adminRoute(async (req) => {
  const parsed = await parseJson(req, body);
  if (parsed instanceof Response) return parsed;
  const set = createDraft(parsed.fromId);
  return json({ set }, { status: 201 });
});
