import { json, requireContext } from "@/server/api";

export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  return json({ facts: ctx.assembled.facts, provenance: ctx.assembled.provenance, questions: ctx.assembled.missing, sources: ctx.statuses });
}
