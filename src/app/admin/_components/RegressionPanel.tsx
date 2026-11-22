"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateShort, formatMoney } from "@/lib/format";
import type { CaseRow, PersonaVariant, RegressionSummary, Snapshot } from "@/server/regression";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Field, TextInput } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { adminFetch } from "./client-api";
import s from "../Admin.module.css";

export interface RegressionPanelProps {
  id: string;
  isDraft: boolean;
  validFrom: string;
  window: { from: string; to: string | null };
  diffCount: number;
  baseLabel: string | null;
  replaces: boolean;
  today: string;
  /** Last stored summary for the current payload (null when never run or the draft changed since). */
  initial: RegressionSummary | null;
  stale: boolean;
}

const outcomeLabel: Record<string, string> = { granted: "przyznany", refused: "odmowa", partial: "częściowo", withheld: "wstrzymany", error: "błąd" };
const goldenLabel = { match: "zgodny", mismatch: "niezgodny", error: "błąd" } as const;

function changes(a: Snapshot, b: Snapshot): string[] {
  const out: string[] = [];
  if (a.outcome !== b.outcome) out.push(`rozstrzygnięcie: ${outcomeLabel[a.outcome] ?? a.outcome} → ${outcomeLabel[b.outcome] ?? b.outcome}`);
  if (a.days !== b.days) out.push(`dni: ${a.days} → ${b.days}`);
  if (a.gross !== b.gross) out.push(`kwota brutto: ${formatMoney(a.gross)} → ${formatMoney(b.gross)} (${b.gross > a.gross ? "+" : "−"}${formatMoney(Math.abs(b.gross - a.gross))})`);
  return out;
}

const changed = (a: Snapshot, b: Snapshot) => a.outcome !== b.outcome || a.gross !== b.gross || a.days !== b.days || a.golden !== b.golden;

export function headline(r: RegressionSummary) {
  const t = r.totals;
  return {
    inWindow: `Zmiana wpływa na ${t.inWindow.affected} z ${t.cases} spraw · zgodność z rozstrzygnięciami ZUS: ${t.inWindow.goldenBefore} → ${t.inWindow.goldenAfter}`,
    whatIf: `${t.whatIf.affected} z ${t.cases} spraw · zgodność z ZUS: ${t.inWindow.goldenBefore} → ${t.whatIf.goldenAfter}`,
  };
}

function CaseTable({ rows, mode, caption }: { rows: CaseRow[]; mode: "after" | "whatIf"; caption: string }) {
  return (
    <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
      <table className={s.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Sprawa</th>
            <th scope="col">Co się zmienia</th>
            <th scope="col">Zgodność z decyzją ZUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const b = c[mode];
            const list = changes(c.before, b);
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/sprawy/${c.id}`}>{c.id}</Link>
                  <br />
                  <span className={s.muted}>{c.title}</span>
                </td>
                <td>{list.length ? list.map((x) => <div key={x}>{x}</div>) : "bez zmian w kwocie i długości"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {goldenLabel[c.before.golden]} → <strong>{goldenLabel[b.golden]}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const pct = (bps: number | null) => (bps === null ? "—" : `${(bps / 100).toLocaleString("pl-PL")}%`);
function variantCell(a: PersonaVariant | null, b: PersonaVariant | null) {
  if (!a || !b || a.parentalMonthly === null || b.parentalMonthly === null) return <span className={s.muted}>brak urlopu rodzicielskiego</span>;
  const same = a.parentalMonthly === b.parentalMonthly && a.parentalRateBps === b.parentalRateBps;
  return (
    <span className={s.delta}>
      {formatMoney(a.parentalMonthly)} ({pct(a.parentalRateBps)}){same ? " — bez zmian" : <> → <strong>{formatMoney(b.parentalMonthly)} ({pct(b.parentalRateBps)})</strong></>}
    </span>
  );
}

export function RegressionPanel(props: RegressionPanelProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<RegressionSummary | null>(props.initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const r = await adminFetch<{ summary: RegressionSummary }>(`/api/v1/admin/params/${props.id}/regression`, { method: "POST", body: {} });
    setBusy(false);
    if (r.ok) setSummary(r.data.summary);
    else setError(r.message);
  }

  const h = summary ? headline(summary) : null;
  const whatIfRows = summary?.cases.filter((c) => changed(c.before, c.whatIf)) ?? [];
  const inWindowRows = summary?.cases.filter((c) => changed(c.before, c.after)) ?? [];
  const governed = summary?.cases.filter((c) => c.inWindow) ?? [];
  const windowText = `od ${formatDateShort(props.window.from)}${props.window.to ? ` do ${formatDateShort(props.window.to)} (wyłącznie)` : " bez daty końcowej"}`;

  return (
    <div className={s.stack}>
      <Card heading="Sprawdź na 86 sprawach">
        <div className={s.stack}>
          <p>
            Każdą z przykładowych spraw ZUS liczymy dwa razy — z obecnie opublikowanymi parametrami i z tym szkicem — i porównujemy z decyzją ZUS. Sprawdzamy też dziewięć przykładowych osób z terminem porodu w przyszłości.
          </p>
          {props.stale && !summary ? <p className={s.muted}>Szkic zmienił się od ostatniego sprawdzenia — uruchom je ponownie.</p> : null}
          <div className={s.row}>
            <Button onClick={run} loading={busy} disabled={busy} icon="refresh" variant={summary ? "secondary" : "primary"}>
              {summary ? "Sprawdź ponownie" : "Sprawdź na 86 sprawach"}
            </Button>
            {summary ? <span className={s.muted}>Ostatnio: {new Date(summary.ranAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })} · {summary.durationMs} ms</span> : null}
          </div>
          {error ? (
            <Notice tone="negative" title="Nie udało się uruchomić sprawdzenia" role="alert" hideToneWord>
              {error}
            </Notice>
          ) : null}
          <div aria-live="polite">
            {summary && h ? (
              <div className={s.stack}>
                <div className={s.headline}>
                  <div className={s.metric}>
                    <span className={s.small}>W okresie obowiązywania szkicu ({windowText})</span>
                    <span className={s.metricBig}>{h.inWindow}</span>
                    <span className={s.muted}>Sprawy objęte okresem: {summary.totals.inWindow.governed}. Pozostałe dotyczą wcześniejszych dat i z założenia się nie zmieniają.</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.small}>Symulacja: gdyby zmiana obowiązywała w datach spraw</span>
                    <span className={s.metricBig}>{h.whatIf}</span>
                    <span className={s.muted}>Zmienione parametry nałożone na każdy opublikowany zestaw — pokazuje, jak reguła działa na znanych decyzjach.</span>
                  </div>
                </div>

                {inWindowRows.length ? (
                  <CaseTable rows={inWindowRows} mode="after" caption={`Sprawy zmienione w okresie obowiązywania (${inWindowRows.length})`} />
                ) : (
                  <p>
                    <strong>W okresie obowiązywania:</strong> żadna sprawa nie zmienia rozstrzygnięcia, długości ani kwoty.
                    {governed.length ? ` Okresem objęte: ${governed.map((c) => c.id).join(", ")}.` : ""}
                  </p>
                )}
                {whatIfRows.length ? (
                  <CaseTable rows={whatIfRows} mode="whatIf" caption={`Symulacja — sprawy, które by się zmieniły (${whatIfRows.length})`} />
                ) : (
                  <p>
                    <strong>Symulacja:</strong> żadna sprawa by się nie zmieniła.
                  </p>
                )}

                <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela — można przewijać w poziomie">
                  <table className={s.table}>
                    <caption>Przykładowe osoby — co zmieni się dla rodzica składającego wniosek w przyszłości</caption>
                    <thead>
                      <tr>
                        <th scope="col">Osoba</th>
                        <th scope="col">Termin</th>
                        <th scope="col">Zestaw</th>
                        <th scope="col">Urlop rodzicielski miesięcznie, wariant 100%/70%</th>
                        <th scope="col">Plan domyślny: miesięcznie w urlopie rodzicielskim</th>
                        <th scope="col" className={s.num}>
                          Suma brutto (plan domyślny)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.personas.map((p) => (
                        <tr key={p.id} data-current={p.inWindow ? "" : undefined}>
                          <td>{p.label}</td>
                          <td className="tabular">{p.eventDate ? formatDateShort(p.eventDate) : "—"}</td>
                          <td>
                            {p.before.default?.setId ?? "—"}
                            {p.after.default && p.after.default.setId !== p.before.default?.setId ? <> → <strong>{p.after.default.setId}</strong></> : ""}
                          </td>
                          {p.error ? (
                            <td colSpan={3}>Nie udało się policzyć ({p.error})</td>
                          ) : (
                            <>
                              <td>{variantCell(p.before.split, p.after.split)}</td>
                              <td>{variantCell(p.before.default, p.after.default)}</td>
                              <td className={s.num}>
                                {p.before.default ? formatMoney(p.before.default.gross) : "—"}
                                {p.after.default && p.before.default && p.after.default.gross !== p.before.default.gross ? <> → <strong>{formatMoney(p.after.default.gross)}</strong></> : ""}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {props.isDraft ? <PublishCard {...props} summary={summary} onPublished={() => router.push(`/admin/parametry/${props.id}`)} /> : null}
    </div>
  );
}

/** Accepts "01.01.2027" or "2027-01-01". */
function normalizeDate(text: string): string | null {
  const t = text.trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function PublishCard({ id, validFrom, diffCount, baseLabel, replaces, today, summary, onPublished }: RegressionPanelProps & { summary: RegressionSummary | null; onPublished: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = diffCount === 0 ? "Szkic nie różni się od obowiązującego zestawu — nie ma czego publikować." : !summary ? "Najpierw uruchom sprawdzenie na 86 sprawach dla aktualnej wersji szkicu." : null;
  const h = summary ? headline(summary) : null;

  async function publish() {
    const iso = normalizeDate(typed);
    if (iso !== validFrom) {
      setError(`Wpisz datę wejścia w życie: ${formatDateShort(validFrom)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await adminFetch(`/api/v1/admin/params/${id}/publish`, { method: "POST", body: { confirmValidFrom: iso } });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      onPublished();
    } else setError(r.fields?.confirmValidFrom ?? r.message);
  }

  return (
    <Card heading="Publikacja">
      <div className={s.stack}>
        <p>
          Po publikacji kalkulator od razu zacznie stosować ten zestaw do zdarzeń od {formatDateShort(validFrom)}
          {replaces ? `, zastępując zestaw „${baseLabel}” z tą samą datą` : ""}. Opublikowanego zestawu nie można zmienić — poprawki to kolejny szkic.
        </p>
        {validFrom <= today ? (
          <Notice tone="caution" title="Data wejścia w życie nie jest w przyszłości" hideToneWord>
            Zmiana obejmie także obliczenia dla zdarzeń, które już nastąpiły od {formatDateShort(validFrom)}.
          </Notice>
        ) : null}
        {blocked ? <p className={s.muted}>{blocked}</p> : null}
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            setError(null);
          }}
          title="Opublikować zestaw parametrów?"
          trigger={
            <Button icon="check" disabled={Boolean(blocked)}>
              Opublikuj
            </Button>
          }
        >
          <div className={s.confirm}>
            <dl className={s.dl}>
              <dt>Obowiązuje od</dt>
              <dd>{formatDateShort(validFrom)}</dd>
              <dt>Zmienione parametry</dt>
              <dd>{diffCount}</dd>
              {h ? (
                <>
                  <dt>W okresie obowiązywania</dt>
                  <dd>{h.inWindow}</dd>
                  <dt>Symulacja na sprawach</dt>
                  <dd>{h.whatIf}</dd>
                </>
              ) : null}
            </dl>
            <Field label="Wpisz datę wejścia w życie, aby potwierdzić" hint={`Format DD.MM.RRRR, np. ${formatDateShort(validFrom)}`} error={error}>
              {({ id: fid, describedBy, invalid }) => (
                <TextInput id={fid} value={typed} onChange={(e) => setTyped(e.currentTarget.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined} autoComplete="off" inputMode="numeric" />
              )}
            </Field>
            <div className={s.row}>
              <Button onClick={publish} loading={busy} disabled={busy}>
                Opublikuj zestaw
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </Card>
  );
}
