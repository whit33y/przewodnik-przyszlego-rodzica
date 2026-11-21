import "server-only";
import { connection } from "next/server";
import { selectParameterSet } from "@/engine";
import type { Bps } from "@/engine/types";
import { SOURCES, sourceById } from "@/integrations/sources";
import type { Answers, SourceId, SystemId, SystemPayloads } from "@/integrations/types";
import { assemble, type Assembled } from "./assemble";
import { engineParams } from "./engine-facade";
import { resolvePersona, type ResolvedPersona } from "./persona-store";
import { getSession, type SessionData } from "./session";
import { readState, type SessionStateData } from "./session-state";

export type SourceState = "pending" | "ok" | "unavailable" | "skipped" | "notStarted";

export interface SourceStatus {
  source: SystemId;
  label: string;
  state: SourceState;
  asOf?: string;
  required: boolean;
}

export interface AppContext {
  session: SessionData;
  state: SessionStateData;
  persona: ResolvedPersona | null;
  statuses: SourceStatus[];
  assembled: Assembled;
  answers: Answers;
  /** Employee social deduction of the parameter set in force on the session's "today". */
  deductionBps: Bps;
}

const latencyFactor = () => (process.env.SIM_LATENCY === "0" ? 0 : 1);

export function sourceStatuses(state: SessionStateData, persona: ResolvedPersona | null, now = Date.now()): SourceStatus[] {
  return SOURCES.map((meta) => {
    const base = { source: meta.id, label: meta.label, required: meta.required };
    if (state.mode === "manual" || !persona) return { ...base, state: "skipped" as const };
    if (state.mode === "case") return { ...base, state: "ok" as const, asOf: persona.asOf };
    if (!state.consents.includes(meta.id)) return { ...base, state: "skipped" as const };
    if (!state.fetchStartedAt) return { ...base, state: "notStarted" as const };
    const latency = meta.latencyMs * latencyFactor();
    const retriedAt = state.retries[meta.id];
    if (persona.unavailable.includes(meta.id)) {
      if (!retriedAt) return { ...base, state: now - Date.parse(state.fetchStartedAt) >= latency ? ("unavailable" as const) : ("pending" as const) };
      return { ...base, state: now - retriedAt >= latency ? ("ok" as const) : ("pending" as const), asOf: persona.asOf };
    }
    return { ...base, state: now - Date.parse(state.fetchStartedAt) >= latency ? ("ok" as const) : ("pending" as const), asOf: persona.asOf };
  });
}

/** Payloads the user consented to and that have "arrived". */
export function availablePayloads(statuses: SourceStatus[], persona: ResolvedPersona | null): Partial<SystemPayloads> {
  if (!persona) return {};
  const out: Partial<SystemPayloads> = {};
  for (const s of statuses) {
    if (s.state !== "ok") continue;
    const payload = persona.systems[s.source];
    if (payload !== undefined) (out as Record<string, unknown>)[s.source] = payload;
  }
  return out;
}

export function buildAssembled(state: SessionStateData, persona: ResolvedPersona | null, statuses: SourceStatus[], deductionBps: Bps): { assembled: Assembled; answers: Answers } {
  const answers: Answers = { ...(persona?.presetAnswers ?? {}), ...state.answers };
  const payloads = availablePayloads(statuses, persona);
  const meta = Object.fromEntries(statuses.filter((s) => s.asOf).map((s) => [s.source, { asOf: s.asOf! }])) as Partial<Record<SourceId, { asOf: string }>>;
  const asOf = persona?.asOf ?? new Date().toISOString().slice(0, 10);
  let otherParentPerson;
  if (persona?.otherParent?.consented && answers.otherParent?.mode === "consent") {
    const op = persona.otherParent;
    const sub = assemble({ payloads: op.systems, meta: {}, answers: {}, overrides: [], asOf, mode: "mobywatel", deductionBps });
    otherParentPerson = { ...sub.facts.claimant, role: op.role };
  }
  const checked = statuses.filter((s) => s.state === "ok").map((s) => s.source);
  const assembled = assemble({ payloads, meta, answers, overrides: state.overrides, asOf, mode: state.mode, otherParentPerson, checked, deductionBps });
  return { assembled, answers };
}

/** Everything a logged-in screen needs. Returns null when there is no simulated session. */
export async function loadContext(sessionArg?: SessionData): Promise<AppContext | null> {
  const session = sessionArg ?? (await getSession());
  await connection(); // statuses depend on the clock (simulated latency)
  if (!session.sid || !session.personaId) return null;
  const state = readState(session.sid);
  if (!state) return null;
  const persona = state.mode === "manual" ? null : resolvePersona(state.personaId);
  const statuses = sourceStatuses(state, persona);
  const asOf = persona?.asOf ?? new Date().toISOString().slice(0, 10);
  const deductionBps = selectParameterSet(await engineParams(), asOf).deductions.employeeSocialBps;
  const { assembled, answers } = buildAssembled(state, persona, statuses, deductionBps);
  return { session, state, persona, statuses, assembled, answers, deductionBps };
}

export { sourceById };
