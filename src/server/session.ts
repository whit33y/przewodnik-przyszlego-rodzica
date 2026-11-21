import "server-only";
import { cookies } from "next/headers";
import { getIronSession, unsealData, type SessionOptions } from "iron-session";

export interface SessionData {
  /** Server-side session_state row id. */
  sid?: string;
  /** Persona (demo profile or sample case) whose simulated registry data is shown. */
  personaId?: string;
  mode?: "mobywatel" | "manual" | "case";
  /** ISO timestamp of the simulated login. */
  since?: string;
}

export const SESSION_COOKIE = "pr_session";

export function sessionConfigured(): boolean {
  const p = process.env.SESSION_PASSWORD;
  return Boolean(p && p.length >= 32) || process.env.NODE_ENV !== "production";
}

function password(): string {
  const p = process.env.SESSION_PASSWORD;
  if (p && p.length >= 32) return p;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    // Fail loudly in production rather than silently using a guessable key.
    throw new Error("SESSION_PASSWORD (min. 32 znaki) nie jest ustawione");
  }
  return "dev-only-insecure-password-change-me-0123456789";
}

export function sessionOptions(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE,
    password: password(),
    ttl: 60 * 60 * 8,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
  };
}

/** Read-only session access for Server Components. Callers must sit under <Suspense>. */
export async function getSession(): Promise<SessionData> {
  "use cache: private";
  const pw = password(); // throws loudly when misconfigured in production
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return {};
  try {
    return await unsealData<SessionData>(raw, { password: pw, ttl: 60 * 60 * 8 });
  } catch {
    return {};
  }
}

/** Mutable session — only for Route Handlers (login, logout, overrides). */
export async function getMutableSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
