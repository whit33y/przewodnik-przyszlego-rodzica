import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { submissions } from "./db/schema";

/** Simulated sending: stored per session, never transmitted anywhere. */
export interface SubmissionPayload {
  title?: string;
  recipient?: "employer" | "zus" | "usc";
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export interface SubmissionRecord {
  id: string;
  kind: string;
  createdAt: string;
  payload: SubmissionPayload;
}

export function listSubmissions(sid: string): SubmissionRecord[] {
  return getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.sessionId, sid))
    .orderBy(desc(submissions.createdAt))
    .all()
    .map((r) => ({ id: r.id, kind: r.kind, createdAt: r.createdAt, payload: safeParse(r.payload) }));
}

export function getSubmission(sid: string, id: string): SubmissionRecord | null {
  const r = getDb().select().from(submissions).where(and(eq(submissions.sessionId, sid), eq(submissions.id, id))).get();
  return r ? { id: r.id, kind: r.kind, createdAt: r.createdAt, payload: safeParse(r.payload) } : null;
}

/** Confirmation number like "ZUS-2026-4F1A9C". */
export function createSubmission(sid: string, kind: string, payload: SubmissionPayload, prefix: string): SubmissionRecord {
  const createdAt = new Date().toISOString();
  const id = `${prefix}-${createdAt.slice(0, 4)}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  getDb().insert(submissions).values({ id, sessionId: sid, kind, payload: JSON.stringify(payload), createdAt }).run();
  return { id, kind, createdAt, payload };
}

function safeParse(s: string): SubmissionPayload {
  try {
    return JSON.parse(s) as SubmissionPayload;
  } catch {
    return {};
  }
}
