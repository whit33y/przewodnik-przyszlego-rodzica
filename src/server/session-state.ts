import "server-only";
import { eq, lt } from "drizzle-orm";
import type { Plan } from "@/engine/types";
import type { Answers, SystemId } from "@/integrations/types";
import type { Override } from "./assemble";
import { getDb } from "./db/client";
import { sessionState } from "./db/schema";

export interface SessionStateData {
  sid: string;
  personaId: string;
  mode: "mobywatel" | "manual" | "case";
  consents: SystemId[];
  fetchStartedAt: string | null;
  retries: Partial<Record<SystemId, number>>;
  answers: Answers;
  overrides: Override[];
  plan: Plan | null;
}

let cleaned = false;

export function readState(sid: string): SessionStateData | null {
  const db = getDb();
  if (!cleaned) {
    cleaned = true;
    db.delete(sessionState).where(lt(sessionState.updatedAt, new Date(Date.now() - 24 * 3600 * 1000).toISOString())).run();
  }
  const row = db.select().from(sessionState).where(eq(sessionState.sid, sid)).get();
  if (!row) return null;
  return {
    sid: row.sid,
    personaId: row.personaId,
    mode: row.mode as SessionStateData["mode"],
    consents: JSON.parse(row.consents),
    fetchStartedAt: row.fetchStartedAt,
    retries: JSON.parse(row.retries),
    answers: JSON.parse(row.answers),
    overrides: JSON.parse(row.overrides),
    plan: row.plan ? JSON.parse(row.plan) : null,
  };
}

export function createState(data: Omit<SessionStateData, "retries" | "overrides" | "plan"> & Partial<SessionStateData>) {
  getDb()
    .insert(sessionState)
    .values({
      sid: data.sid,
      personaId: data.personaId,
      mode: data.mode,
      consents: JSON.stringify(data.consents),
      fetchStartedAt: data.fetchStartedAt,
      retries: JSON.stringify(data.retries ?? {}),
      answers: JSON.stringify(data.answers ?? {}),
      overrides: JSON.stringify(data.overrides ?? []),
      plan: data.plan ? JSON.stringify(data.plan) : null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();
}

export function updateState(sid: string, patch: Partial<Omit<SessionStateData, "sid">>) {
  const set: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (patch.consents) set.consents = JSON.stringify(patch.consents);
  if (patch.fetchStartedAt !== undefined) set.fetchStartedAt = patch.fetchStartedAt;
  if (patch.retries) set.retries = JSON.stringify(patch.retries);
  if (patch.answers) set.answers = JSON.stringify(patch.answers);
  if (patch.overrides) set.overrides = JSON.stringify(patch.overrides);
  if (patch.plan !== undefined) set.plan = patch.plan ? JSON.stringify(patch.plan) : null;
  getDb().update(sessionState).set(set).where(eq(sessionState.sid, sid)).run();
}
