import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getIronSession, unsealData, type SessionOptions } from "iron-session";
import { apiError } from "./api";

/**
 * Admin access (plan 06 §1, §9). A separate iron-session cookie `pr_admin` (httpOnly, sameSite=strict, 2 h),
 * unlocked by ADMIN_PASSWORD compared in constant time. The admin cookie never unlocks citizen data and the
 * citizen cookie never unlocks admin. The password is never logged, echoed or rendered.
 */

export const ADMIN_COOKIE = "pr_admin";
const TTL = 60 * 60 * 2;

export interface AdminSession {
  admin?: true;
  /** Random per-login id (rate limits per session). */
  sid?: string;
  since?: string;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Seal key derived from both secrets: changing ADMIN_PASSWORD logs every admin out. */
function sealPassword(): string {
  return createHash("sha256")
    .update(`pr_admin|${process.env.SESSION_PASSWORD ?? "dev-only"}|${process.env.ADMIN_PASSWORD ?? ""}`)
    .digest("hex");
}

export function adminSessionOptions(): SessionOptions {
  return {
    cookieName: ADMIN_COOKIE,
    password: sealPassword(),
    ttl: TTL,
    cookieOptions: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL },
  };
}

export async function getMutableAdminSession() {
  return getIronSession<AdminSession>(await cookies(), adminSessionOptions());
}

/** Constant-time comparison of fixed-length digests (length of the input leaks nothing). */
export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function newAdminSid(): string {
  return randomBytes(12).toString("hex");
}

// ───────── Rate limiting (in memory: a single Node process serves the app) ─────────

const buckets = new Map<string, number[]>();

function hits(key: string, windowMs: number, now: number): number[] {
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  buckets.set(key, list);
  return list;
}

/** Sliding-window limiter. `peek` checks without recording. */
export function rateLimit(key: string, limit: number, windowMs: number, opts: { record?: boolean } = {}): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const list = hits(key, windowMs, now);
  if (list.length >= limit) return { ok: false, retryAfter: Math.ceil((windowMs - (now - list[0])) / 1000) };
  if (opts.record !== false) list.push(now);
  return { ok: true, retryAfter: 0 };
}

export function recordFailure(key: string) {
  const list = buckets.get(key) ?? [];
  list.push(Date.now());
  buckets.set(key, list);
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;
/** Global ceiling: rotating client addresses cannot buy unlimited guesses. */
export const LOGIN_MAX_FAILURES_GLOBAL = 50;

/** Client address as seen by the last (trusted) proxy hop: the rightmost X-Forwarded-For entry. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const last = xff?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return last ?? req.headers.get("x-real-ip") ?? "local";
}

/** Mutations must come from our own pages (sameSite=strict is the first line, this is the second). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients cannot ride the cookie cross-site
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Guard for every /api/v1/admin/* handler. Returns the session, or the error Response to send. */
export async function requireAdmin(req: Request): Promise<AdminSession | Response> {
  if (!adminConfigured()) return apiError(503, "ADMIN_DISABLED", "Panel administracyjny jest wyłączony (brak hasła w konfiguracji).");
  if (req.method !== "GET" && !sameOrigin(req)) return apiError(403, "BAD_ORIGIN", "Żądanie z innej domeny zostało odrzucone.");
  const session = await getMutableAdminSession();
  if (!session.admin) return apiError(401, "ADMIN_REQUIRED", "Zaloguj się do panelu administracyjnego.");
  return { admin: true, sid: session.sid, since: session.since };
}

/** Admin session for Server Components (inside <Suspense>): never cached, redirects to the login page. */
export async function requireAdminPage(): Promise<AdminSession> {
  await connection(); // the seal check compares against the clock: request time only, never prerendered
  if (!adminConfigured()) redirect("/admin/logowanie");
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) redirect("/admin/logowanie");
  let data: AdminSession = {};
  try {
    data = await unsealData<AdminSession>(raw, { password: sealPassword(), ttl: TTL });
  } catch {
    data = {};
  }
  if (!data.admin) redirect("/admin/logowanie");
  return data;
}

/** Whether the current request carries a valid admin cookie (login page: skip the form). */
export async function isAdmin(): Promise<boolean> {
  await connection();
  if (!adminConfigured()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  try {
    return Boolean((await unsealData<AdminSession>(raw, { password: sealPassword(), ttl: TTL })).admin);
  } catch {
    return false;
  }
}
