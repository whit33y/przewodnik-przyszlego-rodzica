import { getMutableSession } from "@/server/session";
import { deleteState } from "@/server/session-state";

export async function POST() {
  const session = await getMutableSession();
  if (session.sid) deleteState(session.sid);
  session.destroy();
  // Relative Location: behind Railway's proxy request.url may carry the internal host.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
