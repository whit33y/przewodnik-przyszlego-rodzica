import { connection } from "next/server";
import { alertText, leaveShort, reasonText } from "@/content/pl";
import { compareCase, type FieldResult } from "@/server/case-compare";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { AlertList } from "../../_shell/AlertList";
import { TraceList } from "../../_shell/Trace";
import { formatDateShort, formatMoney } from "@/lib/format";
import s from "./Case.module.css";

const outcomeWord = { granted: "przyznano", refused: "odmowa", partial: "częściowo", withheld: "wstrzymano wypłatę" } as const;

const statusLabel: Record<FieldResult["status"], { tone: "positive" | "negative" | "neutral" | "info"; label: string }> = {
  match: { tone: "positive", label: "zgodne" },
  mismatch: { tone: "negative", label: "różnica" },
  reported: { tone: "neutral", label: "wartość wywnioskowana" },
  knownDivergence: { tone: "info", label: "opisana rozbieżność" },
};

const tierLabel: Record<string, string> = { outcome: "Rozstrzygnięcie", duration: "Okres", amount: "Kwota", alerts: "Ostrzeżenie" };

function show(v: unknown, path: string): string {
  if (v === null || v === undefined) return "nie podano w aktach";
  if (typeof v === "number") {
    if (/base|daily|gross|net|amount/i.test(path)) return formatMoney(v);
    if (/rate/i.test(path)) return `${(v / 100).toLocaleString("pl-PL")}%`;
    if (/days/i.test(path)) return `${v} dni`;
    return String(v);
  }
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDateShort(v);
    return (outcomeWord as Record<string, string>)[v] ?? (leaveShort as Record<string, string>)[v] ?? v;
  }
  if (typeof v === "boolean") return v ? "tak" : "nie";
  return JSON.stringify(v);
}

function pathLabel(path: string): string {
  return path
    .replace(/^outcome\.value$/, "Rozstrzygnięcie")
    .replace(/^outcome\.reasonCodes$/, "Powód")
    .replace(/benefits\[(\d+)\]\./, "")
    .replace(/^(\w+)\((\w+)\)\./, (_, t: string, p: string) => `${(leaveShort as Record<string, string>)[t] ?? t} (${p === "claimant" ? "wnioskodawca" : "drugi rodzic"}) — `)
    .replace(/days$/, "liczba dni")
    .replace(/rateBps$/, "stawka")
    .replace(/daily$/, "kwota dzienna")
    .replace(/base$/, "podstawa")
    .replace(/from$/, "od")
    .replace(/to$/, "do")
    .replace(/status$/, "status");
}

export async function CompareContent({ id }: { id: string }) {
  await connection();
  const out = await compareCase(id);
  if (!out) return null;
  const { result, expected, fields, summary, error } = out;
  if (!result) {
    return (
      <Notice tone="caution" title="Silnik obliczeń jest chwilowo niedostępny" role="alert">
        <p>{error}</p>
      </Notice>
    );
  }
  const ours = result.outcome.value;
  const theirs = expected.outcome.value;
  const same = ours === theirs || (theirs === "refused" && ours === "withheld");
  const firedExpected = result.alerts.filter((a) => expected.expectedAlerts.includes(a.code));
  return (
    <div className={s.layout}>
      <section className={s.verdicts} aria-labelledby="cmp-title">
        <h2 id="cmp-title" className="visually-hidden">
          Porównanie rozstrzygnięć
        </h2>
        <Card compact heading="Nasz wynik" headingLevel={3}>
          <StatusBadge tone={ours === "granted" ? "positive" : ours === "refused" ? "negative" : "caution"} label={outcomeWord[ours]} size="lg" />
          {result.outcome.reasonCodes.map((r) => (
            <p key={r}>{reasonText[r]}</p>
          ))}
        </Card>
        <Card compact heading="Rozstrzygnięcie ZUS" headingLevel={3}>
          <StatusBadge tone={theirs === "granted" ? "positive" : theirs === "refused" ? "negative" : "caution"} label={outcomeWord[theirs]} size="lg" />
          {expected.outcome.reversedOnAppeal ? <p className={s.muted}>Po odwołaniu ZUS zmienił decyzję.</p> : null}
          {expected.legalBasisCited.length ? <p className={s.muted}>Podstawa: {expected.legalBasisCited.join("; ")}</p> : null}
        </Card>
      </section>
      <Notice tone={same && summary.mismatch === 0 ? "positive" : summary.mismatch ? "caution" : "info"} hideToneWord title={same && summary.mismatch === 0 ? "Wynik zgodny z rozstrzygnięciem ZUS" : summary.mismatch ? `Różnice: ${summary.mismatch}` : "Rozstrzygnięcie zgodne"}>
        <p>
          Zgodnych pól: {summary.match}, różnic: {summary.mismatch}, wartości wywnioskowanych (porównywane, ale nie wydrukowane w aktach): {summary.reported}
          {summary.knownDivergence ? `, opisanych rozbieżności: ${summary.knownDivergence}` : ""}.
        </p>
        {expected.knownDivergence ? <p>{expected.knownDivergence.explanation}</p> : null}
      </Notice>

      {fields.length ? (
        <section aria-labelledby="fields-title" className={s.section}>
          <h2 id="fields-title">Pole po polu</h2>
          <div className={s.tableWrap} tabIndex={0} role="region" aria-labelledby="fields-title">
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Pole</th>
                  <th scope="col">Nasz wynik</th>
                  <th scope="col">ZUS</th>
                  <th scope="col">Ocena</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={i} data-status={f.status}>
                    <th scope="row">
                      <span className={s.tierTag}>{tierLabel[f.tier] ?? f.tier}</span> {pathLabel(f.path)}
                    </th>
                    <td className="tabular">{show(f.actual, f.path)}</td>
                    <td className="tabular">{show(f.expected, f.path)}</td>
                    <td>
                      <StatusBadge tone={statusLabel[f.status].tone} label={statusLabel[f.status].label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {expected.expectedAlerts.length ? (
        <section aria-labelledby="alerts-title" className={s.section}>
          <h2 id="alerts-title">Co aplikacja pokazałaby wcześniej</h2>
          <p className={s.muted}>Te ostrzeżenia nasz silnik wyświetliłby jeszcze przed porodem — z terminem i sposobem naprawy.</p>
          {firedExpected.length ? <AlertList alerts={firedExpected} /> : expected.expectedAlerts.map((code) => <Notice key={code} tone="caution" title={alertText(code as never).title} />)}
        </section>
      ) : null}

      <details className={s.trace}>
        <summary>Jak to policzyliśmy — wszystkie kroki ({result.trace.length})</summary>
        <TraceList steps={result.trace} />
      </details>
    </div>
  );
}
