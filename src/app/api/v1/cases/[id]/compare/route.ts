import { connection } from "next/server";
import { apiError } from "@/server/api";
import { compareCase } from "@/server/case-compare";

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/cases/[id]/compare">) {
  await connection();
  const { id } = await params;
  const out = await compareCase(id);
  if (!out) return apiError(404, "NOT_FOUND", "Nie ma takiej sprawy.");
  return Response.json(out);
}
