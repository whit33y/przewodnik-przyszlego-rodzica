import { z } from "zod";
import { adminRoute, json, parseJson } from "@/server/admin-api";
import { resetToStatutory } from "@/server/admin-repo";
import { RESET_PHRASE } from "@/lib/admin-constants";

const body = z.object({ confirm: z.literal(RESET_PHRASE, { error: `Wpisz ${RESET_PHRASE}, aby potwierdzić.` }) }).strict();

/** POST /api/v1/admin/params/reset { confirm: "PRZYWRÓĆ" } — archive all sets, restore data/params/*.json. */
export const POST = adminRoute(async (req) => {
  const parsed = await parseJson(req, body);
  if (parsed instanceof Response) return parsed;
  return json(resetToStatutory());
});
