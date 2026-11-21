import type { TraceStep } from "@/engine/types";
import { citationText } from "@/content/pl";
import s from "./Trace.module.css";

const stageLabel: Record<string, string> = {
  params: "Parametry prawne",
  insurance: "Ubezpieczenie",
  event: "Zdarzenie",
  lengths: "Wymiar urlopu",
  allocation: "Podział urlopu",
  rate: "Stawka zasiłku",
  base: "Podstawa wymiaru",
  amount: "Kwota",
  gating: "Warunki wypłaty",
  routing: "Kto wypłaca i gdzie złożyć",
  alerts: "Ostrzeżenia",
  outcome: "Rozstrzygnięcie",
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return String(v);
  const j = JSON.stringify(v);
  return j.length > 140 ? `${j.slice(0, 140)}…` : j;
}

/** "Dlaczego tyle?" — the engine's reasoning, step by step, with the article of law for each step. */
export function TraceList({ steps, stages }: { steps: TraceStep[]; stages?: string[] }) {
  const shown = stages ? steps.filter((t) => stages.includes(t.stage)) : steps;
  if (!shown.length) return <p>Brak kroków do pokazania.</p>;
  return (
    <ol className={s.list}>
      {shown.map((t, i) => (
        <li key={i} className={s.step}>
          <span className={s.stage}>{stageLabel[t.stage] ?? t.stage}</span>
          <code className={s.rule}>{t.ruleId}</code>
          {Object.keys(t.inputs ?? {}).length ? (
            <dl className={s.kv}>
              {Object.entries(t.inputs).slice(0, 6).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{fmt(v)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className={s.out}>
            Wynik: <strong>{fmt(t.output)}</strong>
          </p>
          {t.citations?.length ? <p className={s.cite}>Podstawa: {t.citations.map(citationText).join("; ")}</p> : null}
          {t.paramKeys?.length ? <p className={s.cite}>Parametry: {t.paramKeys.join(", ")}</p> : null}
        </li>
      ))}
    </ol>
  );
}
