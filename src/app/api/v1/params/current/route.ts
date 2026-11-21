import { connection } from "next/server";
import { getPublishedParams } from "@/server/params-repo";

/**
 * Published parameter sets. Read at request time (the volume's database survives redeploys,
 * so nothing that depends on published parameters may sit in the prerendered shell);
 * the loader itself is cached and invalidated by revalidateTag('params').
 */
export async function GET() {
  await connection();
  const params = await getPublishedParams();
  return Response.json(params);
}
