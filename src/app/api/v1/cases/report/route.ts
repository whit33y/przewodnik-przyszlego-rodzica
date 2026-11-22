import { connection } from "next/server";
import { readReport } from "@/server/cases-repo";

export async function GET() {
  await connection();
  return Response.json(readReport() ?? { totals: null });
}
