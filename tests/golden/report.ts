/**
 * Scoreboard (plan 02 §8): evaluates every golden case (and its variants), replays the alert checks and writes
 * data/cases/_report.json — per case { id, title, tiers, counts, divergences, alerts } plus totals.
 * Deterministic (no timestamps), so the committed file only changes when results change.
 */
import fs from "node:fs";
import path from "node:path";
import { applyVariant, compare, evaluate, type FieldResult, type ParameterSet } from "@/engine";
import { loadCases, loadParams, type GoldenCase } from "./load";
import { preEventFacts } from "./pre-event";

/** Post-event alerts: full facts, evaluated with the plan as filed and with plan = null (union of codes). */
export function postEventAlertCodes(input: GoldenCase["input"], sets: ParameterSet[]): string[] {
  return [...new Set([...evaluate(input.facts, input.plan, sets).alerts, ...evaluate(input.facts, null, sets).alerts].map((a) => a.code))];
}

export const SEVERITY_RANK = { info: 0, warning: 1, high: 2, blocking: 3 } as const;

export interface CaseRun {
  id: string;
  fields: FieldResult[];
  variants: { name: string; fields: FieldResult[] }[];
  alerts: { code: string; found: boolean; severity?: string }[];
  alertsPostEvent: { code: string; found: boolean; severity?: string }[];
  error?: string;
}

export function runCase(c: GoldenCase, sets: ParameterSet[]): CaseRun {
  try {
    const result = evaluate(c.input.facts, c.input.plan, sets);
    const fields = compare(result, c.expected);
    const variants = (c.expected.variants ?? []).map((v) => {
      const x = applyVariant(c.input, c.expected, v);
      return { name: v.name, fields: compare(evaluate(x.facts, x.plan, sets), x.expected) };
    });
    let alerts: CaseRun["alerts"] = [];
    if (c.expected.expectedAlerts.length) {
      const pre = evaluate(preEventFacts(c.input), null, sets);
      alerts = c.expected.expectedAlerts.map((code) => {
        const a = pre.alerts.find((x) => x.code === code);
        return { code, found: !!a, severity: a?.severity };
      });
    }
    let alertsPostEvent: CaseRun["alertsPostEvent"] = [];
    if (c.expected.expectedAlertsPostEvent?.length) {
      const post = [...evaluate(c.input.facts, c.input.plan, sets).alerts, ...evaluate(c.input.facts, null, sets).alerts];
      alertsPostEvent = c.expected.expectedAlertsPostEvent.map((code) => {
        const a = post.find((x) => x.code === code);
        return { code, found: !!a, severity: a?.severity };
      });
    }
    return { id: c.id, fields, variants, alerts, alertsPostEvent };
  } catch (e) {
    return { id: c.id, fields: [], variants: [], alerts: [], alertsPostEvent: [], error: (e as Error).message };
  }
}

function counts(fields: FieldResult[]) {
  const by = (tier: string) => {
    const f = fields.filter((x) => x.tier === tier);
    return { match: f.filter((x) => x.status === "match").length, mismatch: f.filter((x) => x.status === "mismatch").length, reported: f.filter((x) => x.status === "reported").length, knownDivergence: f.filter((x) => x.status === "knownDivergence").length };
  };
  return { outcome: by("outcome"), duration: by("duration"), amount: by("amount") };
}

export function buildReport(cases = loadCases(), sets = loadParams()) {
  const rows = cases.map((c) => {
    const run = runCase(c, sets);
    const all = [...run.fields, ...run.variants.flatMap((v) => v.fields)];
    return {
      id: c.id,
      title: c.input.title,
      scenario: c.input.scenario,
      outcome: c.expected.outcome.value,
      tiers: c.expected.tiers,
      counts: counts(all),
      status: run.error ? "error" : all.some((f) => f.status === "mismatch") ? "mismatch" : "match",
      divergences: all.filter((f) => f.status === "mismatch" || f.status === "reported" || f.status === "knownDivergence").map((f) => ({ path: f.path, status: f.status, expected: f.expected, actual: f.actual })),
      knownDivergence: c.expected.knownDivergence?.explanation,
      alerts: [...run.alerts, ...run.alertsPostEvent],
      variants: run.variants.map((v) => ({ name: v.name, status: v.fields.some((f) => f.status === "mismatch") ? "mismatch" : "match" })),
      error: run.error,
    };
  });
  const refusals = rows.filter((r) => r.outcome === "refused");
  const totals = {
    cases: rows.length,
    matching: rows.filter((r) => r.status === "match").length,
    outcomeTier: { asserted: rows.length, match: rows.filter((r) => r.counts.outcome.mismatch === 0 && !r.error).length },
    durationFields: { match: rows.reduce((a, r) => a + r.counts.duration.match, 0), mismatch: rows.reduce((a, r) => a + r.counts.duration.mismatch, 0) },
    amountFields: { match: rows.reduce((a, r) => a + r.counts.amount.match, 0), mismatch: rows.reduce((a, r) => a + r.counts.amount.mismatch, 0) },
    reported: rows.reduce((a, r) => a + r.counts.outcome.reported + r.counts.duration.reported + r.counts.amount.reported, 0),
    knownDivergences: rows.filter((r) => r.knownDivergence).length,
    alertRecallRefusals: { refusals: refusals.length, recalled: refusals.filter((r) => r.alerts.length > 0 && r.alerts.every((a) => a.found)).length },
  };
  return { schemaVersion: 1, totals, cases: rows };
}

export function writeReport(report = buildReport()): string {
  const file = path.resolve(__dirname, "../../data/cases/_report.json");
  const text = JSON.stringify(report, null, 2) + "\n";
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) fs.writeFileSync(file, text);
  return file;
}
