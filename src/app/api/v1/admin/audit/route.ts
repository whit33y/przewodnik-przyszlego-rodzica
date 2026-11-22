import { z } from "zod";
import { apiError } from "@/server/api";
import { adminRoute, json, setIdSchema } from "@/server/admin-api";
import { AUDIT_ACTIONS, describeAudit, listAudit } from "@/server/admin-repo";

const query = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityId: z.union([setIdSchema, z.literal("*")]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

/** GET /api/v1/admin/audit?action=&entityId=&limit= — append-only log, newest first. */
export const GET = adminRoute((req) => {
  const sp = new URL(req.url).searchParams;
  const parsed = query.safeParse(Object.fromEntries([...sp.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return apiError(422, "VALIDATION", "Nieprawidłowy filtr.");
  const entries = listAudit(parsed.data).map((r) => ({ ...r, summary: describeAudit(r), diff: r.action === "regression" ? undefined : r.diff }));
  return json({ entries });
});
