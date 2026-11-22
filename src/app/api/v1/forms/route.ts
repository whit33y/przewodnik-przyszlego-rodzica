import { json, requireContext } from "@/server/api";
import { loadGuidance } from "@/server/guidance";

/** Forms this person needs, with recipient and status. */
export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const g = await loadGuidance(ctx);
  return json({ routing: g.result?.routing ?? null, forms: g.forms });
}
