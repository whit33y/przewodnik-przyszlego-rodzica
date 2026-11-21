import { z } from "zod";
import { SOURCES } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { json, requireContext, seeOther } from "@/server/api";
import { updateState } from "@/server/session-state";

const ids = SOURCES.map((s) => s.id) as [SystemId, ...SystemId[]];

export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  return json({ sources: SOURCES.map((s) => ({ source: s.id, label: s.label, reads: s.reads, purpose: s.purpose, required: s.required, granted: ctx.state.consents.includes(s.id) })) });
}

/** Form POST from /zgoda: store consents and start the (simulated) fetch. */
export async function POST(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return seeOther("/logowanie");
  const form = await req.formData();
  const picked = z.array(z.enum(ids)).safeParse(form.getAll("sources").map(String));
  const consents = picked.success ? picked.data : [];
  if (form.get("manual") === "1" || consents.length === 0) {
    updateState(ctx.state.sid, { consents: [], fetchStartedAt: new Date().toISOString() });
    return seeOther("/sytuacja");
  }
  updateState(ctx.state.sid, { consents, fetchStartedAt: new Date().toISOString(), retries: {} });
  return seeOther("/pobieranie");
}
