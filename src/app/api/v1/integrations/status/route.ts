import { json, requireContext } from "@/server/api";

export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const active = ctx.statuses.filter((s) => s.state !== "skipped");
  return json({ done: active.every((s) => s.state === "ok" || s.state === "unavailable"), sources: ctx.statuses });
}
