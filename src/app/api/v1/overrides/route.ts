import { z } from "zod";
import { apiError, json, parseJson, requireContext } from "@/server/api";
import { getPath, isOverridable } from "@/server/assemble";
import { updateState } from "@/server/session-state";

const body = z.object({ path: z.string().max(120), value: z.union([z.string().max(40), z.number(), z.boolean()]), note: z.string().max(500).optional() });

/** A correction never deletes the source value: it is stored as an override and shown as such. */
export async function POST(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const data = await parseJson(req, body);
  if (data instanceof Response) return data;
  if (!isOverridable(data.path)) return apiError(422, "NOT_OVERRIDABLE", "Tej wartości nie można poprawić w serwisie.");
  const current = getPath(ctx.assembled.facts, data.path);
  if (current !== undefined && typeof current !== typeof data.value) return apiError(422, "TYPE", "Nieprawidłowy typ wartości.");
  const overrides = [...ctx.state.overrides.filter((o) => o.path !== data.path), { path: data.path, value: data.value, note: data.note, at: new Date().toISOString() }];
  updateState(ctx.state.sid, { overrides });
  return json({ path: data.path, overridden: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  updateState(ctx.state.sid, { overrides: ctx.state.overrides.filter((o) => o.path !== path) });
  return json({ path, overridden: false });
}
