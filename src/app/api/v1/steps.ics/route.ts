import { requireContext } from "@/server/api";
import { loadGuidance } from "@/server/guidance";
import { buildIcs } from "@/server/ics";

/** Dated steps as an iCalendar file — titles only, no personal data. */
export async function GET() {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const g = await loadGuidance(ctx);
  return new Response(buildIcs(g.steps, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="przewodnik-rodzica-terminy.ics"',
      "Cache-Control": "no-store",
    },
  });
}
