import { z } from "zod";
import { apiError, json, parseJson, requireContext } from "@/server/api";
import { isOverridable, validateOverride } from "@/server/override-rules";
import { updateState } from "@/server/session-state";

const body = z.object({ path: z.string().max(120), value: z.union([z.string().max(40), z.number(), z.boolean()]), note: z.string().max(500).optional() }).strict();

/** A correction never deletes the source value: it is stored as an override and shown as such. */
export async function POST(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  const check = validateOverride(data.path, data.value, ctx.assembled.facts);
  if (!check.ok) return apiError(422, check.code, check.message, check.code === "VALUE" ? { value: check.message } : undefined);
  if (ctx.state.overrides.length >= 50 && !ctx.state.overrides.some((o) => o.path === data.path)) return apiError(422, "TOO_MANY", "Za dużo poprawek w jednej sesji.");
  const overrides = [...ctx.state.overrides.filter((o) => o.path !== data.path), { path: data.path, value: check.value, note: data.note, at: new Date().toISOString() }];
  updateState(ctx.state.sid, { overrides });
  return json({ path: data.path, overridden: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (path.length > 120 || !isOverridable(path)) return apiError(422, "NOT_OVERRIDABLE", "Tej wartości nie można poprawić w serwisie.");
  updateState(ctx.state.sid, { overrides: ctx.state.overrides.filter((o) => o.path !== path) });
  return json({ path, overridden: false });
}
