import { z } from "zod";
import { SOURCES } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { json, parseJson, requireContext } from "@/server/api";
import { updateState } from "@/server/session-state";

const body = z.object({ source: z.enum(SOURCES.map((s) => s.id) as [SystemId, ...SystemId[]]) });

export async function POST(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  updateState(ctx.state.sid, { retries: { ...ctx.state.retries, [data.source]: Date.now() } });
  return json({ ok: true });
}
