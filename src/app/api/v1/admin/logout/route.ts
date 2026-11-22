import { apiError, json } from "@/server/api";
import { getMutableAdminSession, sameOrigin } from "@/server/admin-auth";
import { audit } from "@/server/admin-repo";

/** POST /api/v1/admin/logout — always succeeds; JSON for fetch, 303 for a plain form post. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "BAD_ORIGIN", "Żądanie z innej domeny zostało odrzucone.");
  const session = await getMutableAdminSession();
  const was = Boolean(session.admin);
  session.destroy();
  if (was) audit("logout", "admin", undefined, "admin");
  if ((req.headers.get("accept") ?? "").includes("application/json")) return json({ ok: true });
  return new Response(null, { status: 303, headers: { Location: "/admin/logowanie" } });
}
