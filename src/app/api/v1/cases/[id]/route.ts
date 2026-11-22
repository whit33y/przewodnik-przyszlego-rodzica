import { apiError } from "@/server/api";
import { readCaseInput } from "@/server/persona-store";

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/cases/[id]">) {
  const { id } = await params;
  const c = readCaseInput(id);
  if (!c) return apiError(404, "NOT_FOUND", "Nie ma takiej sprawy.");
  // Summary only: the structured facts of a case are not published (the source files are "do not distribute");
  // the compare view renders them server-side.
  return Response.json({ id: c.id, title: c.title, scenario: c.scenario, tags: c.tags, extractionNotes: c.extractionNotes });
}
