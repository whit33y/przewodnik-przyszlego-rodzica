import { z } from "zod";
import { apiError, json, parseJson } from "@/server/api";
import {
  adminConfigured,
  checkAdminPassword,
  clearFailures,
  clientIp,
  getMutableAdminSession,
  LOGIN_MAX_FAILURES,
  LOGIN_MAX_FAILURES_GLOBAL,
  LOGIN_WINDOW_MS,
  newAdminSid,
  rateLimit,
  recordFailure,
  sameOrigin,
} from "@/server/admin-auth";
import { audit } from "@/server/admin-repo";

const body = z.object({ password: z.string().min(1, { error: "Wpisz hasło." }).max(200) }).strict();

/** POST /api/v1/admin/login — constant-time password check, 5 failures / 10 min per address → 429. */
export async function POST(req: Request) {
  if (!adminConfigured()) return apiError(503, "ADMIN_DISABLED", "Panel administracyjny jest wyłączony (brak hasła w konfiguracji).");
  if (!sameOrigin(req)) return apiError(403, "BAD_ORIGIN", "Żądanie z innej domeny zostało odrzucone.");
  const ipKey = `admin-login:${clientIp(req)}`;
  const perIp = rateLimit(ipKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, { record: false });
  const global = rateLimit("admin-login:*", LOGIN_MAX_FAILURES_GLOBAL, LOGIN_WINDOW_MS, { record: false });
  if (!perIp.ok || !global.ok) {
    const retry = Math.max(perIp.retryAfter, global.retryAfter);
    return Response.json(
      { error: { code: "RATE_LIMITED", message: `Zbyt wiele nieudanych prób. Spróbuj ponownie za ${Math.ceil(retry / 60)} min.` } },
      { status: 429, headers: { "Retry-After": String(retry), "Cache-Control": "no-store" } },
    );
  }
  const parsed = await parseJson(req, body);
  if (parsed instanceof Response) return parsed;
  if (!checkAdminPassword(parsed.password)) {
    recordFailure(ipKey);
    recordFailure("admin-login:*");
    audit("login_failed", "admin", undefined, "admin");
    return apiError(401, "BAD_PASSWORD", "Nieprawidłowe hasło.", { password: "Nieprawidłowe hasło." });
  }
  clearFailures(ipKey);
  const session = await getMutableAdminSession();
  session.admin = true;
  session.sid = newAdminSid();
  session.since = new Date().toISOString();
  await session.save();
  audit("login", "admin", undefined, "admin");
  return json({ ok: true });
}
