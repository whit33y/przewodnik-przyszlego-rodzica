import "server-only";
import type { z } from "zod";
import { loadContext, type AppContext } from "./context";
import { getMutableSession } from "./session";

export function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

/** 303 with a relative Location (safe behind Railway's proxy). */
export function seeOther(location: string) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

/** Route-handler variant of loadContext (reads the session without the private cache). */
export async function requireContext(): Promise<AppContext | Response> {
  const session = await getMutableSession();
  const ctx = await loadContext({ sid: session.sid, personaId: session.personaId, mode: session.mode, since: session.since });
  return ctx ?? apiError(401, "NO_SESSION", "Zaloguj się (symulacja) albo wybierz tryb bez logowania.");
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "BAD_JSON", "Nieprawidłowe dane.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return apiError(422, "VALIDATION", "Sprawdź wprowadzone dane.", fields);
  }
  return parsed.data;
}
