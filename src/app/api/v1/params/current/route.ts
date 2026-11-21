import { getPublishedParams } from "@/server/params-repo";

/** Published parameter sets (reference data, identical for every user — cacheable). */
export async function GET() {
  const params = await getPublishedParams();
  return Response.json(params);
}
