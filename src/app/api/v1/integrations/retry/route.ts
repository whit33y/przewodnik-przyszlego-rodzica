import { z } from "zod";
import { SOURCES } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { safeNext } from "@/lib/safe-next";
import { json, parseJson, requireContext, seeOther } from "@/server/api";
import { updateState } from "@/server/session-state";

const body = z.object({ source: z.enum(SOURCES.map((s) => s.id) as [SystemId, ...SystemId[]]) });

/** JSON `{ source }` → 200; a plain form POST (`source`, `next`) → 303 back to the page. */
export async function POST(req: Request) {
  const isForm = (req.headers.get("content-type") ?? "").includes("form");
  const ctx = await requireContext();
  if (ctx instanceof Response) return isForm ? seeOther("/logowanie") : ctx;
  if (isForm) {
    const form = await req.formData();
    const parsed = body.safeParse({ source: String(form.get("source") ?? "") });
    if (parsed.success) updateState(ctx.state.sid, { retries: { ...ctx.state.retries, [parsed.data.source]: Date.now() } });
    return seeOther(safeNext(form.get("next")) ?? "/sytuacja");
  }
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  updateState(ctx.state.sid, { retries: { ...ctx.state.retries, [data.source]: Date.now() } });
  return json({ ok: true });
}
