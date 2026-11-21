"use client";

import type { Plan, PlanBlock, Result } from "@/engine/types";
import { alertText, leaveShort, ratePct } from "@/content/pl";
import { formatDateLong, formatDateShort, formatDuration, formatMoney } from "@/lib/format";
import type { AltSummary } from "@/server/plan-service";
import { Button } from "@/ui/components/Button/Button";
import { cashFlow, monthLabel } from "./plan-utils";
import s from "./Plan.module.css";

const planAlerts = new Set(["RATE_DEADLINE_21_DAYS", "PARTS_LIMIT_NEAR", "DAY_COUNT_MISMATCH", "TOP_UP_STATEMENT_NEEDED", "REREGISTER_AFTER_MATERNITY", "PATERNITY_EXPIRES", "NO_PARENTAL_IN_FIRST_YEAR"]);

function Meter({ label, used, total, note }: { label: string; used: number; total: number; note?: string }) {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className={s.meter}>
      <div className={s.meterHead}>
        <span>{label}</span>
        <span className={s.value}>
          {formatDuration(used)} <span className={s.muted}>z {formatDuration(total)}</span>
        </span>
      </div>
      <div className={s.meterBar} aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      {note ? <p className={s.muted}>{note}</p> : null}
    </div>
  );
}

export function Summary({ result, alt, plan, status, onPickRate, showOther, otherHasData, laneTitle }: { result: Result; alt: AltSummary | null; plan: Plan; status: string; onPickRate: (r: Plan["rateOption"]) => void; showOther: boolean; otherHasData: boolean; laneTitle: (p: PlanBlock["parent"]) => string }) {
  const p = result.pools;
  const rows = cashFlow(result);
  const max = Math.max(1, ...rows.map((r) => r.claimant.net + r.claimant.topUp + r.other.net + r.other.topUp));
  const alerts = result.alerts.filter((a) => planAlerts.has(a.code));
  const reservedOtherUnused = showOther ? Math.max(0, p.parentalDays.reservedPerParent - p.parentalDays.usedByOther) : 0;
  const cur = { option: plan.rateOption, gross: result.totals.gross, net: result.totals.netEstimate };
  const diff = alt ? alt.totals.gross - cur.gross : 0;
  // Monthly view of the current option (gross incl. top-up), same shape as alt.months.
  const curMonths = rows.map((r) => ({ month: r.month, gross: r.claimant.gross + r.claimant.topUp + r.other.gross + r.other.topUp, net: 0 }));
  /** n-th full month of leave (skips the partial first month), gross. */
  const fullMonth = (m: { gross: number }[], n: number) => {
    const full = m.slice(1);
    return full[n] ? formatMoney(full[n].gross, { whole: true }) : "—";
  };
  const hasPregnancy = result.periods.some((x) => ["sickPay", "sickness", "art30PreBirth", "rehabilitation"].includes(x.type));
  return (
    <aside className={s.summary} aria-labelledby="sum-title" aria-busy={status === "calculating" || undefined}>
      <div className={`${s.sumCard} ${s.sticky}`}>
        <div className={s.laneHead}>
          <h2 id="sum-title" className={s.h3}>
            Podsumowanie
          </h2>
          {status === "calculating" ? <span className={s.muted}>Przeliczamy…</span> : null}
        </div>
        <p className={s.total}>
          <span className={s.big}>{formatMoney(result.totals.gross)}</span>
          <span className={s.muted}>
            brutto razem{hasPregnancy ? " (z zasiłkiem chorobowym w ciąży)" : ""} · ok. {formatMoney(result.totals.netEstimate)} na rękę · {formatDuration(result.totals.days)}
          </span>
        </p>
        {showOther ? (
          <dl className={s.split}>
            <div>
              <dt>{laneTitle("claimant")}</dt>
              <dd>{formatMoney(result.totals.byParent.claimant)}</dd>
            </div>
            <div>
              <dt>{laneTitle("other")}</dt>
              <dd>{otherHasData ? formatMoney(result.totals.byParent.other) : "—"}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className={s.sumCard}>
        <h3 className={s.h4}>Wykorzystanie urlopu</h3>
        <Meter label="Macierzyński" used={p.maternityDays.used} total={p.maternityDays.total} note={p.maternityDays.motherMandatory ? `Matka musi wykorzystać co najmniej ${formatDuration(p.maternityDays.motherMandatory)}.` : undefined} />
        {p.supplementaryDays.total ? <Meter label="Uzupełniający" used={p.supplementaryDays.used ?? 0} total={p.supplementaryDays.total} /> : null}
        {p.parentalDays.total ? <Meter label="Rodzicielski" used={p.parentalDays.used} total={p.parentalDays.total} note={p.parentalDays.extensionDays ? `Praca w trakcie urlopu wydłuża go o ${formatDuration(p.parentalDays.extensionDays)}.` : undefined} /> : null}
        {showOther && p.parentalDays.total ? (
          <p className={reservedOtherUnused ? s.warn : s.muted}>
            9 tygodni drugiego rodzica: wykorzystane {formatDuration(Math.min(p.parentalDays.usedByOther, p.parentalDays.reservedPerParent))} z {formatDuration(p.parentalDays.reservedPerParent)}
            {reservedOtherUnused ? " — niewykorzystane przepadną." : "."}
          </p>
        ) : null}
        {p.paternityDays.total ? <Meter label="Ojcowski" used={p.paternityDays.used} total={p.paternityDays.total} note={p.paternityDays.expiresOn ? `Do ${formatDateLong(p.paternityDays.expiresOn)}.` : undefined} /> : null}
        {p.parentalDays.total ? (
          <p className={p.parentalParts.used >= 4 ? s.warn : undefined}>
            Części urlopu rodzicielskiego: <strong>{p.parentalParts.used} z {p.parentalParts.max}</strong> (wspólnie dla obojga)
          </p>
        ) : null}
      </div>

      {alt ? (
        <div className={s.sumCard}>
          <h3 className={s.h4}>81,5% czy 100% i 70%?</h3>
          <table className={s.compare}>
            <caption className="visually-hidden">Porównanie wariantów wysokości zasiłku</caption>
            <thead>
              <tr>
                <th scope="col">Wariant</th>
                <th scope="col">1. pełny miesiąc</th>
                <th scope="col">7. miesiąc</th>
                <th scope="col">Razem brutto</th>
              </tr>
            </thead>
            <tbody>
              {[
                { o: cur.option, g: cur.gross, m: curMonths, now: true },
                { o: alt.rateOption, g: alt.totals.gross, m: alt.months, now: false },
              ]
                .sort((a, b) => (a.o === "averaged81_5" ? 0 : 1) - (b.o === "averaged81_5" ? 0 : 1))
                .map((r) => (
                  <tr key={r.o} data-current={r.now || undefined}>
                    <th scope="row">
                      {r.o === "averaged81_5" ? "81,5% cały czas" : "100%, potem 70%"}
                      {r.now ? <span className={s.tag}>wybrany</span> : null}
                    </th>
                    <td className="tabular">{fullMonth(r.m, 0)}</td>
                    <td className="tabular">{fullMonth(r.m, 6)}</td>
                    <td className="tabular">{formatMoney(r.g)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className={s.muted}>
            {diff === 0 ? "Oba warianty dają tę samą kwotę." : `Drugi wariant to ${diff > 0 ? "o " + formatMoney(diff) + " więcej" : "o " + formatMoney(-diff) + " mniej"} w sumie.`} 81,5% daje równe kwoty przez cały rok; 100% i 70% opłaca się, gdy wracasz do pracy po urlopie macierzyńskim.
          </p>
          {alt.available ? (
            <Button size="sm" variant="secondary" onClick={() => onPickRate(alt.rateOption)}>
              Wybierz {alt.rateOption === "averaged81_5" ? "81,5%" : "100% i 70%"}
            </Button>
          ) : (
            <p className={s.muted}>Wariantu 81,5% nie można już wybrać{alt.deadline ? ` — termin minął ${formatDateLong(alt.deadline)}` : ""}.</p>
          )}
        </div>
      ) : null}

      {alerts.length ? (
        <div className={s.sumCard}>
          <h3 className={s.h4}>Pamiętaj</h3>
          <ul className={s.alertList}>
            {alerts.map((a, i) => {
              const v = Object.fromEntries(Object.entries(a.values ?? {}).map(([k, x]) => [k, typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? formatDateLong(x) : x]));
              return <li key={i}>{alertText(a.code, { ...v, deadline: a.deadline ? formatDateLong(a.deadline) : undefined, onDate: a.onDate ? formatDateLong(a.onDate) : undefined }).title}</li>;
            })}
          </ul>
        </div>
      ) : null}

      <details className={s.sumCard} open>
        <summary className={s.h4}>Okresy i kwoty</summary>
        <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabela okresów zasiłku">
          <table className={s.table}>
            <caption className="visually-hidden">Okresy zasiłku w planie</caption>
            <thead>
              <tr>
                <th scope="col">Urlop</th>
                <th scope="col">Od – do</th>
                <th scope="col">Dni</th>
                <th scope="col">Stawka</th>
                <th scope="col">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {result.periods.map((x, i) => (
                <tr key={i} data-status={x.status}>
                  <th scope="row">
                    {leaveShort[x.type]}
                    {showOther ? <span className={s.muted}> · {x.parent === "claimant" ? "Ty" : "drugi rodzic"}</span> : null}
                  </th>
                  <td>
                    {formatDateShort(x.from)} – {formatDateShort(x.to)}
                  </td>
                  <td className="tabular">{x.days}</td>
                  <td className="tabular">{ratePct(x.rateBps)}</td>
                  <td className="tabular">{x.status === "refused" ? "odmowa" : x.parent === "other" && !otherHasData ? "—" : formatMoney(x.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className={s.sumCard}>
        <summary className={s.h4}>Miesiąc po miesiącu</summary>
        <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Wypłaty w kolejnych miesiącach">
          <table className={s.table}>
            <caption className="visually-hidden">Zasiłek w kolejnych miesiącach (na rękę, po zaliczce na podatek)</caption>
            <thead>
              <tr>
                <th scope="col">Miesiąc</th>
                <th scope="col">Na rękę</th>
                <th scope="col">
                  <span className="visually-hidden">Wykres</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = r.claimant.net + r.claimant.topUp + r.other.net + r.other.topUp;
                return (
                  <tr key={r.month}>
                    <th scope="row">{monthLabel(r.month)}</th>
                    <td className="tabular">
                      {/* engine: months[].net excludes the top-up; it is added once here */}
                      {formatMoney(net)}
                      {r.claimant.topUp + r.other.topUp ? <span className={s.muted}> (w tym wyrównanie {formatMoney(r.claimant.topUp + r.other.topUp)})</span> : null}
                    </td>
                    <td className={s.barCell} aria-hidden="true">
                      <i style={{ width: `${Math.round((net / max) * 100)}%` }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </aside>
  );
}
