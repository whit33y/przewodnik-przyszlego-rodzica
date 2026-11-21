/**
 * Rules engine — pure TypeScript, no framework, I/O or clock access (lint-enforced).
 * Spec: docs/plan/02-phase-1-engine.md. Public API (§3): evaluate, insuredOn, computeBase, selectParameterSet,
 * supplementaryWeeks, plus compare (golden-case comparison, reused by /sprawy).
 *
 * Mode: `facts.mode` when given; otherwise `adjudication` when a plan is given and the event has happened
 * (birth date known or `occurred`, or a care event), else `prospective`. With `plan === null` the engine builds
 * `defaultPlan` (the claimant's maximum entitlement) and evaluates it.
 */
import { addTrace, TYPE_ORDER, type Ctx } from "./context";
import { floorTimes } from "./money";
import { selectParameterSet } from "./params";
import * as allocation from "./stages/allocation";
import * as alerts from "./stages/alerts";
import * as amount from "./stages/amount";
import * as base from "./stages/base";
import * as event from "./stages/event";
import * as gating from "./stages/gating";
import * as insurance from "./stages/insurance";
import * as lengths from "./stages/lengths";
import * as outcome from "./stages/outcome";
import * as rate from "./stages/rate";
import * as routing from "./stages/routing";
import type { Facts, InsuranceCheck, ISODate, ParameterSet, Period, Person, Plan, Result } from "./types";

export const ENGINE_VERSION = "1.0.0";

export { selectParameterSet } from "./params";
export { computeBase, type BaseContext } from "./stages/base";
export { supplementaryWeeks } from "./stages/lengths";
export { compare, applyJsonPatch, applyVariant, type FieldResult, type FieldStatus, type Tier } from "./compare";
export type * from "./types";
export type * from "./case-types";

/** Sickness-insurance check on a date (plan 02 §3). */
export function insuredOn(person: Person, date: ISODate, params: ParameterSet): InsuranceCheck {
  void params;
  const c = insurance.insuredOnTitles(person, date, undefined, true);
  return { onDate: c.onDate, purpose: c.purpose, insured: c.insured, titleId: c.titleId, mode: c.mode, reasonCode: c.reasonCode };
}

function deriveMode(facts: Facts, plan: Plan | null): Result["mode"] {
  if (facts.mode) return facts.mode;
  if (!plan) return "prospective";
  const e = facts.event;
  const happened = e.kind === "birth" ? !!e.date || e.occurred === true : e.takenIntoCareOn <= facts.asOf;
  return happened ? "adjudication" : "prospective";
}

function primaryDate(facts: Facts, plan: Plan | null): ISODate {
  if (facts.parameterDate) return facts.parameterDate;
  const e = facts.event;
  const motherLike = facts.claimant.role !== "father" && !(facts.claimant.sex === "M" && facts.claimant.role !== "adoptive" && facts.claimant.role !== "foster");
  const eventDate = e.kind === "birth" ? e.date ?? e.expectedDate : e.takenIntoCareOn;
  const firstBlock = plan?.blocks.filter((b) => b.parent === "claimant").map((b) => b.from).sort()[0];
  if (motherLike) return eventDate ?? firstBlock ?? facts.asOf;
  return firstBlock ?? eventDate ?? facts.asOf;
}

export function evaluate(facts: Facts, plan: Plan | null, params: ParameterSet[]): Result {
  const primary = selectParameterSet(params, primaryDate(facts, plan));
  const mode = deriveMode(facts, plan);
  const ctx: Ctx = {
    facts, inputPlan: plan, plan: plan ?? { rateOption: "averaged81_5", blocks: [] }, sets: params, params: primary, mode,
    ev: event.classifyEvent(facts, primary),
    lengths: undefined as never,
    insurance: [], entitlements: [], segments: [], bases: [],
    pools: undefined as never, routing: undefined as never,
    documents: [], deadlines: [], alerts: [], violations: [], trace: [], baseMemo: new Map(),
  };
  addTrace(ctx, "params", "PARAMS-SELECT", {
    factPaths: facts.parameterDate ? ["facts.parameterDate"] : ["facts.event"],
    paramKeys: ["id", "validFrom"],
    inputs: { date: primaryDate(facts, plan), parameterDate: facts.parameterDate, mode },
    output: { parameterSetId: primary.id, validFrom: primary.validFrom },
  });
  insurance.run(ctx);
  event.run(ctx);
  lengths.run(ctx);
  if (!plan) ctx.plan = allocation.buildDefaultPlan(ctx);
  allocation.run(ctx);
  rate.run(ctx);
  base.run(ctx);
  gating.run(ctx);
  amount.run(ctx);
  routing.run(ctx);
  alerts.run(ctx);
  outcome.run(ctx);

  const segs = [...ctx.segments].sort((a, b) =>
    a.from < b.from ? -1 : a.from > b.from ? 1 : TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.parent.localeCompare(b.parent) || a.key.localeCompare(b.key));
  const periods: Period[] = segs.map((s) => ({
    blockId: s.block.id, parent: s.parent, type: s.type, from: s.from, to: s.to, days: s.days, status: s.status,
    reasonCode: s.reasonCode, base: s.base, rateBps: s.rateBps, workReductionBps: s.workReductionBps,
    extensionDays: s.type === "parental" && s.block.workFraction ? floorTimes(s.days, s.block.workFraction) : undefined,
    daily: s.daily, gross: s.gross, months: s.months, paidBy: s.paidBy,
  }));
  const counted = periods.filter((p) => p.status !== "refused");
  const byParent = { claimant: 0, other: 0 };
  for (const p of counted) byParent[p.parent] += p.gross;
  return {
    parameterSetId: primary.id,
    mode,
    outcome: ctx.outcome ?? { value: "refused", reasonCodes: [] },
    insurance: ctx.insurance,
    entitlements: ctx.entitlements,
    pools: ctx.pools,
    periods,
    bases: ctx.bases,
    totals: {
      gross: counted.reduce((a, p) => a + p.gross, 0),
      netEstimate: counted.reduce((a, p) => a + p.months.reduce((x, m) => x + m.net + m.topUp, 0), 0),
      days: counted.reduce((a, p) => a + p.days, 0),
      byParent,
    },
    routing: ctx.routing,
    documents: ctx.documents,
    deadlines: ctx.deadlines,
    alerts: ctx.alerts,
    violations: ctx.violations,
    defaultPlan: plan ? undefined : ctx.plan,
    trace: ctx.trace,
  };
}
