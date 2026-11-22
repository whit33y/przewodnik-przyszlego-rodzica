import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { selectParameterSet, type CaseExpected, type Facts, type ParameterSet, type Plan } from "@/engine";
import { getDb } from "./db/client";
import { auditLog, parameterSets } from "./db/schema";
import { readParameterFiles } from "./params-files";
import { diffSets, issuesToFields, parameterSetSchema, type DiffEntry } from "./params-schema";
import { baseSetFor, draftWindow, runRegression, type RegressionCase, type RegressionPersona, type RegressionSummary } from "./regression";
import { caseIds, readExpected } from "./cases-repo";
import { listPersonaFiles, readCaseInput } from "./persona-store";
import { assemble } from "./assemble";

/**
 * Parameter-set administration (plan 06 §2–§6). All writes go through here and each one appends to audit_log.
 * Published sets are immutable; corrections are new drafts. Every change to the published list calls
 * revalidateTag('params', { expire: 0 }) so the next request (calculator, planner, /api/v1/params/current)
 * loads the new list — Route Handlers cannot use updateTag, and { expire: 0 } means no stale read.
 */

export type SetStatus = "draft" | "published" | "archived";

export interface SetRow {
  id: string;
  validFrom: string;
  status: SetStatus;
  label: string;
  createdAt: string;
  publishedAt: string | null;
  author: string;
}

export interface SetDetail extends SetRow {
  payload: ParameterSet;
}

export class AdminError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

const ACTOR = "admin";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function payloadHash(p: unknown): string {
  return createHash("sha256").update(JSON.stringify(p)).digest("hex").slice(0, 12);
}

function toRow(r: typeof parameterSets.$inferSelect): SetRow {
  return { id: r.id, validFrom: r.validFrom, status: r.status, label: r.label, createdAt: r.createdAt, publishedAt: r.publishedAt, author: r.author };
}

function invalidateParams() {
  revalidateTag("params", { expire: 0 });
}

export function audit(action: string, entityId: string, diff?: unknown, entity = "parameter_set") {
  getDb()
    .insert(auditLog)
    .values({ at: new Date().toISOString(), actor: ACTOR, action, entity, entityId, diff: diff === undefined ? null : JSON.stringify(diff) })
    .run();
}

export function listSets(): SetRow[] {
  return getDb()
    .select()
    .from(parameterSets)
    .all()
    .map(toRow)
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.createdAt.localeCompare(a.createdAt));
}

export function getSet(id: string): SetDetail | null {
  const r = getDb().select().from(parameterSets).where(eq(parameterSets.id, id)).get();
  return r ? { ...toRow(r), payload: JSON.parse(r.payload) as ParameterSet } : null;
}

function requireSet(id: string): SetDetail {
  const s = getSet(id);
  if (!s) throw new AdminError(404, "NOT_FOUND", "Nie ma takiego zestawu parametrów.");
  return s;
}

/** Published payloads straight from the database (never cached: admin must see what it just wrote). */
export function publishedSets(): ParameterSet[] {
  return getDb()
    .select()
    .from(parameterSets)
    .where(eq(parameterSets.status, "published"))
    .all()
    .map((r) => JSON.parse(r.payload) as ParameterSet)
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
}

/** The published set in force on a date (the dashboard marker). */
export function inForceOn(date: string): string | null {
  const sets = publishedSets();
  const earlier = sets.filter((s) => s.validFrom <= date);
  return (earlier.at(-1) ?? sets[0])?.id ?? null;
}

export function createDraft(fromId: string): SetDetail {
  const src = requireSet(fromId);
  const id = `ps-${randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const label = `Projekt na podstawie: ${src.label}`.slice(0, 120);
  const payload: ParameterSet = { ...structuredClone(src.payload), id, label };
  getDb().insert(parameterSets).values({ id, validFrom: payload.validFrom, status: "draft", label, payload: JSON.stringify(payload), createdAt: now, publishedAt: null, author: ACTOR }).run();
  audit("create_draft", id, { from: fromId });
  return requireSet(id);
}

/** Validate and save a draft. Errors map to field paths ("rates.parental"). */
export function updateDraft(id: string, input: unknown): SetDetail {
  const cur = requireSet(id);
  if (cur.status !== "draft") throw new AdminError(409, "IMMUTABLE", "Opublikowanego ani zarchiwizowanego zestawu nie można zmieniać. Utwórz nowy szkic.");
  const candidate = input && typeof input === "object" ? { ...(input as Record<string, unknown>), id } : input;
  const parsed = parameterSetSchema.safeParse(candidate);
  if (!parsed.success) throw new AdminError(422, "VALIDATION", "Popraw zaznaczone pola.", issuesToFields(parsed.error));
  const payload = parsed.data as ParameterSet;
  const changes = diffSets(cur.payload, payload).map((d) => ({ path: d.path, from: d.fromText, to: d.toText }));
  const header: { path: string; from: string; to: string }[] = (["validFrom", "label"] as const).filter((k) => cur.payload[k] !== payload[k]).map((k) => ({ path: k, from: cur.payload[k], to: payload[k] }));
  if (JSON.stringify(cur.payload.sources) !== JSON.stringify(payload.sources)) header.push({ path: "sources", from: cur.payload.sources.join("; "), to: payload.sources.join("; ") });
  getDb().update(parameterSets).set({ payload: JSON.stringify(payload), validFrom: payload.validFrom, label: payload.label }).where(eq(parameterSets.id, id)).run();
  if (changes.length || header.length) audit("update_draft", id, { changes: [...header, ...changes] });
  return requireSet(id);
}

export interface DiffView {
  base: SetRow | null;
  replaces: boolean;
  window: { from: string; to: string | null };
  entries: DiffEntry[];
}

export function diffFor(id: string): DiffView {
  const s = requireSet(id);
  const published = publishedSets().filter((p) => p.id !== id);
  const base = baseSetFor(s.payload, published);
  const baseRow = base ? getSet(base.id) : null;
  return {
    base: baseRow ? { id: baseRow.id, validFrom: baseRow.validFrom, status: baseRow.status, label: baseRow.label, createdAt: baseRow.createdAt, publishedAt: baseRow.publishedAt, author: baseRow.author } : null,
    replaces: Boolean(base && base.validFrom === s.payload.validFrom),
    window: draftWindow(s.payload, published),
    entries: base ? diffSets(base, s.payload) : [],
  };
}

// ───────── Regression ─────────

function regressionInputs(published: ParameterSet[]): { cases: RegressionCase[]; personas: RegressionPersona[] } {
  const cases = caseIds().flatMap((cid) => {
    const input = readCaseInput(cid);
    const expected = readExpected(cid);
    if (!input || !expected) return [];
    return [{ id: cid, title: input.title, scenario: input.scenario, facts: input.facts as Facts, plan: input.plan as Plan, expected: expected as unknown as CaseExpected }];
  });
  const personas = listPersonaFiles().flatMap((p) => {
    try {
      const deductionBps = selectParameterSet(published, p.asOf).deductions.employeeSocialBps;
      const a = assemble({ payloads: p.systems, meta: {}, answers: { ...(p.presetAnswers ?? {}), ...(p.sampleAnswers ?? {}) }, overrides: [], asOf: p.asOf, mode: "mobywatel", deductionBps });
      return [{ id: p.id, label: p.label, facts: a.facts }];
    } catch {
      return [];
    }
  });
  return { cases, personas };
}

export function runDraftRegression(id: string): RegressionSummary {
  const s = requireSet(id);
  if (s.status === "archived") throw new AdminError(409, "ARCHIVED", "Zestaw jest zarchiwizowany.");
  const published = publishedSets().filter((p) => p.id !== id);
  const { cases, personas } = regressionInputs(published);
  const summary = runRegression({ draft: s.payload, published, cases, personas, payloadHash: payloadHash(s.payload), now: new Date() });
  // Stored with the draft as an append-only audit entry (the latest one for the id is "the" summary).
  audit("regression", id, summary);
  return summary;
}

export function latestRegression(id: string): RegressionSummary | null {
  const r = getDb()
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.action, "regression"), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.id))
    .limit(1)
    .get();
  return r?.diff ? (JSON.parse(r.diff) as RegressionSummary) : null;
}

export function regressionHeadline(r: RegressionSummary): string {
  const t = r.totals;
  return `W oknie obowiązywania: zmiana wpływa na ${t.inWindow.affected} z ${t.cases} spraw (zgodność z ZUS ${t.inWindow.goldenBefore} → ${t.inWindow.goldenAfter}). Gdyby obowiązywała w datach spraw: ${t.whatIf.affected} z ${t.cases} (zgodność ${t.inWindow.goldenBefore} → ${t.whatIf.goldenAfter}).`;
}

// ───────── Publish / archive / reset ─────────

export function publishDraft(id: string, confirmValidFrom: string): { set: SetDetail; replaced: string | null; diff: DiffEntry[] } {
  const s = requireSet(id);
  if (s.status !== "draft") throw new AdminError(409, "NOT_DRAFT", "Opublikować można tylko szkic.");
  if (confirmValidFrom !== s.payload.validFrom) throw new AdminError(422, "CONFIRM_MISMATCH", "Wpisana data nie zgadza się z datą „obowiązuje od” szkicu.", { confirmValidFrom: "Wpisz datę wejścia w życie dokładnie tak, jak w szkicu." });
  const check = parameterSetSchema.safeParse(s.payload);
  if (!check.success) throw new AdminError(422, "VALIDATION", "Szkic zawiera nieprawidłowe wartości. Popraw je przed publikacją.", issuesToFields(check.error));
  const view = diffFor(id);
  if (view.entries.length === 0) throw new AdminError(409, "EMPTY_DIFF", "Szkic nie różni się od obowiązującego zestawu — nie ma czego publikować.");
  const replaced = view.replaces ? view.base?.id ?? null : null;
  const regression = latestRegression(id);
  const now = new Date().toISOString();
  getDb().transaction((tx) => {
    if (replaced) tx.update(parameterSets).set({ status: "archived" }).where(eq(parameterSets.id, replaced)).run();
    tx.update(parameterSets).set({ status: "published", publishedAt: now }).where(eq(parameterSets.id, id)).run();
  });
  if (replaced) audit("archive", replaced, { reason: "replaced", by: id });
  audit("publish", id, {
    validFrom: s.payload.validFrom,
    base: view.base?.id ?? null,
    replaced,
    changes: view.entries.map((d) => ({ path: d.path, label: d.label, from: d.fromText, to: d.toText })),
    regression: regression && regression.payloadHash === payloadHash(s.payload) ? regressionHeadline(regression) : null,
  });
  invalidateParams();
  return { set: requireSet(id), replaced, diff: view.entries };
}

export function archiveSet(id: string): SetDetail {
  const s = requireSet(id);
  if (s.status === "archived") throw new AdminError(409, "ARCHIVED", "Zestaw jest już zarchiwizowany.");
  if (s.status === "published") {
    const rest = publishedSets().filter((p) => p.id !== id);
    if (rest.length === 0) throw new AdminError(409, "LAST_SET", "To jedyny opublikowany zestaw — kalkulator nie miałby parametrów.");
    if (!rest.some((p) => p.validFrom <= today())) throw new AdminError(409, "COVERS_TODAY", "To jedyny zestaw obowiązujący dziś. Najpierw opublikuj zestaw, który go zastąpi.");
  }
  getDb().update(parameterSets).set({ status: "archived" }).where(eq(parameterSets.id, id)).run();
  audit("archive", id, { previousStatus: s.status });
  if (s.status === "published") invalidateParams();
  return requireSet(id);
}

/** Archive everything and restore the statutory sets from data/params/*.json. */
export function resetToStatutory(): { restored: string[]; archived: string[] } {
  const files = readParameterFiles() as unknown as ParameterSet[];
  const db = getDb();
  const now = new Date().toISOString();
  const before = db.select().from(parameterSets).where(inArray(parameterSets.status, ["draft", "published"])).all().map((r) => r.id);
  db.transaction((tx) => {
    tx.update(parameterSets).set({ status: "archived" }).run();
    for (const set of files) {
      const values = { validFrom: set.validFrom, status: "published" as const, label: set.label, payload: JSON.stringify(set), publishedAt: now, author: "seed" };
      tx.insert(parameterSets)
        .values({ id: set.id, createdAt: now, ...values })
        .onConflictDoUpdate({ target: parameterSets.id, set: values })
        .run();
    }
  });
  const restored = files.map((f) => f.id);
  const archived = before.filter((id) => !restored.includes(id));
  audit("reset", "*", { restored, archived });
  invalidateParams();
  return { restored, archived };
}

// ───────── Audit log ─────────

export interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  diff: unknown;
}

export const AUDIT_ACTIONS = ["login", "login_failed", "logout", "create_draft", "update_draft", "regression", "publish", "archive", "reset", "seed"] as const;

export function listAudit(filter: { action?: string; entityId?: string; limit?: number } = {}): AuditRow[] {
  const where: SQL[] = [];
  if (filter.action) where.push(eq(auditLog.action, filter.action));
  if (filter.entityId) where.push(eq(auditLog.entityId, filter.entityId));
  return getDb()
    .select()
    .from(auditLog)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLog.id))
    .limit(Math.min(filter.limit ?? 200, 500))
    .all()
    .map((r) => {
      let diff: unknown = null;
      try {
        diff = r.diff ? JSON.parse(r.diff) : null;
      } catch {
        diff = r.diff;
      }
      return { id: r.id, at: r.at, actor: r.actor, action: r.action, entity: r.entity, entityId: r.entityId, diff };
    });
}

/** One-line Polish summary of an audit entry (the regression summary is too big to print). */
export function describeAudit(r: AuditRow): string {
  const d = r.diff as Record<string, unknown> | null;
  switch (r.action) {
    case "create_draft":
      return `Nowy szkic na podstawie ${String(d?.from ?? "")}`;
    case "update_draft": {
      const ch = (d?.changes as { path: string; from: unknown; to: unknown }[] | undefined) ?? [];
      return ch.length ? ch.map((c) => `${c.path}: ${String(c.from)} → ${String(c.to)}`).join("; ") : "Zapisano szkic";
    }
    case "regression":
      return d ? regressionHeadline(d as unknown as RegressionSummary) : "Uruchomiono sprawdzenie";
    case "publish": {
      const ch = (d?.changes as { label: string; from: string; to: string }[] | undefined) ?? [];
      return `Opublikowano, obowiązuje od ${String(d?.validFrom ?? "")}${d?.replaced ? ` (zastępuje ${String(d.replaced)})` : ""}: ${ch.map((c) => `${c.label}: ${c.from} → ${c.to}`).join("; ")}`;
    }
    case "archive":
      return d?.reason === "replaced" ? `Zarchiwizowano — zastąpiony przez ${String(d.by)}` : "Zarchiwizowano";
    case "reset":
      return `Przywrócono stan ustawowy: ${((d?.restored as string[]) ?? []).join(", ")}`;
    case "login":
      return "Zalogowano";
    case "login_failed":
      return "Nieudana próba logowania";
    case "logout":
      return "Wylogowano";
    case "seed":
      return "Załadowano parametry ustawowe";
    default:
      return r.action;
  }
}
