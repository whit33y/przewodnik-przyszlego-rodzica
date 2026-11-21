import { sourceById } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { apiError, json, requireContext } from "@/server/api";

/** "Pobranie danych z systemów ZUS" — the raw simulated payload of one registry, with provenance. */
export async function GET(_req: Request, { params }: RouteContext<"/api/v1/integrations/[source]">) {
  const { source } = await params;
  if (!(source in sourceById)) return apiError(404, "UNKNOWN_SOURCE", "Nieznany rejestr.");
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const status = ctx.statuses.find((s) => s.source === source)!;
  if (status.state !== "ok") return apiError(409, "SOURCE_NOT_READY", `Rejestr: ${status.state}`);
  const value = ctx.persona?.systems[source as SystemId] ?? null;
  return json({ value, source, asOf: status.asOf, fetchedAt: ctx.state.fetchStartedAt });
}
