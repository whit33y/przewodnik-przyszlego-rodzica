import { listCases } from "@/server/cases-repo";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scenario = url.searchParams.get("scenario");
  const outcome = url.searchParams.get("outcome");
  const q = url.searchParams.get("q")?.toUpperCase();
  const items = (await listCases()).filter((c) => (!scenario || c.scenario.startsWith(scenario)) && (!outcome || c.outcome === outcome) && (!q || c.id.includes(q) || c.title.toUpperCase().includes(q)));
  return Response.json({ total: items.length, items });
}
