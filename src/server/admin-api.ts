import "server-only";
import { z } from "zod";
import { apiError, json, parseJson } from "./api";
import { rateLimit, requireAdmin, type AdminSession } from "./admin-auth";
import { AdminError } from "./admin-repo";

export const setIdSchema = z.string().regex(/^[A-Za-z0-9._~-]{1,40}$/);

/** Wraps an admin Route Handler: admin cookie + Origin check, AdminError → JSON error, no-store. */
export function adminRoute<C>(fn: (req: Request, session: AdminSession, ctx: C) => Promise<Response> | Response) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const session = await requireAdmin(req);
    if (session instanceof Response) return session;
    try {
      return await fn(req, session, ctx);
    } catch (err) {
      if (err instanceof AdminError) return apiError(err.status, err.code, err.message, err.fields);
      console.error("[admin] request failed", err);
      return apiError(500, "INTERNAL", "Operacja nie powiodła się.");
    }
  };
}

/** CPU-heavy calls (regression, publish) are limited per admin session. */
export function heavyLimit(session: AdminSession, what: string): Response | null {
  const r = rateLimit(`admin:${what}:${session.sid ?? "-"}`, 20, 60_000);
  return r.ok ? null : apiError(429, "RATE_LIMITED", "Zbyt wiele operacji. Spróbuj za chwilę.");
}

export async function idParam(ctx: { params: Promise<{ id: string }> }): Promise<string | Response> {
  const { id } = await ctx.params;
  const parsed = setIdSchema.safeParse(id);
  return parsed.success ? parsed.data : apiError(404, "NOT_FOUND", "Nie ma takiego zestawu parametrów.");
}

export { json, parseJson };
