import type { Entitlement, Plan, Result, TraceStep } from "@/engine/types";
import { citationText } from "@/content/pl";
import { stageLabel, traceSentence, traceValue } from "@/content/pl-trace";
import { lookupProvenance, type Provenance } from "@/server/assemble";
import { SourceBadge, type SourceId } from "@/ui/components/SourceBadge/SourceBadge";
import s from "./Trace.module.css";

type Benefit = Entitlement["benefit"];

/** Rules that explain a benefit even when no plan block of that type exists (lengths, event, payer). */
const ruleBenefits: Record<string, Benefit[]> = {
  "B5-B10-EVENT": ["maternity", "parental", "supplementary", "paternity", "funeralGrant", "parentalBenefitMunicipal"],
  "B6-CARE-EVENT": ["maternityOnAdoption", "parental"],
  "KP-180-1-TABLE": ["maternity"],
  "KP-180-1": ["maternity"],
  "KP-183-ADOPTION": ["maternityOnAdoption"],
  "KP-182-1A-POOL": ["parental"],
  "KP-180-2-SUPPLEMENTARY": ["supplementary"],
  "KP-182-3-PATERNITY": ["paternity"],
};

const PREGNANCY = new Set<Benefit>(["sickPay", "sickness", "rehabilitation", "art30PreBirth"]);

function blockIdsOf(step: TraceStep): string[] {
  const i = step.inputs ?? {};
  const ids = [i.blockId, ...(Array.isArray(i.blockIds) ? i.blockIds : [])].filter((x): x is string => typeof x === "string");
  return ids;
}

/** The steps that explain one benefit card: its own plan blocks, its length rules, insurance on the decisive day, payer. */
export function stepsForBenefit(result: Result, benefit: Benefit, plan: Plan | null): TraceStep[] {
  const blocks = [...(plan?.blocks ?? []), ...(result.defaultPlan?.blocks ?? [])];
  const typeOf = new Map<string, string>([...blocks.map((b) => [b.id, b.parent === "claimant" ? b.type : `other:${b.type}`] as const), ...result.periods.map((p) => [p.blockId, p.parent === "claimant" ? p.type : `other:${p.type}`] as const)]);
  return result.trace.filter((t) => {
    if (t.stage === "alerts" || t.stage === "outcome") return false;
    const ids = blockIdsOf(t);
    if (ids.length) return ids.some((id) => typeOf.get(id) === benefit);
    if (ruleBenefits[t.ruleId]) return ruleBenefits[t.ruleId].includes(benefit);
    if (t.stage === "insurance") {
      const purpose = t.inputs?.purpose;
      return PREGNANCY.has(benefit) ? purpose === "sickness" : purpose === "event" || purpose === "dueDate";
    }
    return t.stage === "params" || t.stage === "routing";
  });
}

function Badges({ paths, provenance }: { paths: string[]; provenance?: Provenance }) {
  if (!provenance) return null;
  const seen = new Set<string>();
  const badges = paths
    .filter((p) => p.startsWith("facts."))
    .map((p) => lookupProvenance(provenance, p))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .filter((e) => {
      const k = `${e.source}|${Boolean(e.overridden)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  if (!badges.length) return null;
  return (
    <p className={s.sources}>
      <span className={s.sourcesLabel}>Dane:</span>
      {badges.map((e) => (
        <SourceBadge key={`${e.source}${e.overridden ? "-o" : ""}`} source={e.source as SourceId} asOf={e.asOf} overridden={Boolean(e.overridden)} wrap />
      ))}
    </p>
  );
}

/** "Dlaczego?" — the engine's reasoning as sentences, with sources of the data and the article of law; raw values under "Szczegóły techniczne". */
export function TraceList({ steps, provenance }: { steps: TraceStep[]; provenance?: Provenance }) {
  if (!steps.length) return <p>Brak kroków do pokazania.</p>;
  return (
    <ol className={s.list}>
      {steps.map((t, i) => (
        <li key={i} className={s.step}>
          <span className={s.stage}>{stageLabel[t.stage] ?? t.stage}</span>
          <p className={s.sentence}>{traceSentence(t)}</p>
          <Badges paths={t.factPaths ?? []} provenance={provenance} />
          {t.citations?.length ? <p className={s.cite}>Podstawa prawna: {t.citations.map(citationText).join("; ")}</p> : null}
          <details className={s.tech}>
            <summary>Szczegóły techniczne</summary>
            <dl className={s.kv}>
              <div>
                <dt>Reguła</dt>
                <dd>
                  <code>{t.ruleId}</code>
                </dd>
              </div>
              {t.paramKeys?.length ? (
                <div>
                  <dt>Parametry</dt>
                  <dd>{t.paramKeys.join(", ")}</dd>
                </div>
              ) : null}
              {Object.entries(t.inputs ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{traceValue(k, v)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </li>
      ))}
    </ol>
  );
}
