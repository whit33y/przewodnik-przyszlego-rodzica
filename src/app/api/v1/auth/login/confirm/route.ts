import { randomUUID } from "node:crypto";
import { safeNext } from "@/lib/safe-next";
import { seeOther } from "@/server/api";
import { resolvePersona } from "@/server/persona-store";
import { getMutableSession } from "@/server/session";
import { createState } from "@/server/session-state";

/**
 * Form POST (never fetch): a full navigation after login keeps the privately cached session fresh.
 * Fields: personaId | caseId | mode=manual.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const mode = String(form.get("mode") ?? "mobywatel");
  const caseId = form.get("caseId") ? String(form.get("caseId")) : null;
  const personaId = mode === "manual" ? "manual" : caseId ? `case:${caseId}` : String(form.get("personaId") ?? "");
  if (mode !== "manual" && !resolvePersona(personaId)) return seeOther("/logowanie?krok=3&blad=profil");

  const sid = randomUUID();
  const resolvedMode = mode === "manual" ? "manual" : caseId ? "case" : "mobywatel";
  createState({ sid, personaId, mode: resolvedMode, consents: [], fetchStartedAt: null, answers: {} });
  const session = await getMutableSession();
  session.sid = sid;
  session.personaId = personaId;
  session.mode = resolvedMode;
  session.since = new Date().toISOString();
  await session.save();
  const next = safeNext(form.get("next"));
  if (next) return seeOther(next);
  return seeOther(resolvedMode === "mobywatel" ? "/zgoda" : "/sytuacja");
}

