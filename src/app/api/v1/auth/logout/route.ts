import { getMutableSession } from "@/server/session";

export async function POST() {
  const session = await getMutableSession();
  session.destroy();
  // Relative Location: behind Railway's proxy request.url may carry the internal host.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
