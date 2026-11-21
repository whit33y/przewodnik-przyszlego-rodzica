"use client";

import type { Plan, PlanBlock, Result } from "@/engine/types";
import { leaveShort } from "@/content/pl";
import { formatDateLong, formatDateShort, formatDuration } from "@/lib/format";
import { addDays, daysBetween, endOf, isLeave, MONTHS_SHORT } from "./plan-utils";
import s from "./Plan.module.css";

interface Props {
  plan: Plan;
  result: Result;
  lanes: { parent: PlanBlock["parent"]; title: string }[];
  anchor: string;
  anchorLabel: string;
  today: string;
  selected: string | null;
  onSelect: (id: string) => void;
}

/**
 * Read-only visualisation. Every block carries a text label, a border and a pattern, so it never
 * relies on colour; the periods table in the summary is the full text alternative.
 */
export function Timeline({ plan, result, lanes, anchor, anchorLabel, today, selected, onSelect }: Props) {
  const spans = plan.blocks.filter(isLeave).map((b) => ({ b, from: b.from, to: result.periods.find((p) => p.blockId === b.id)?.to ?? endOf(b) }));
  if (!spans.length) return <p className={s.muted}>Plan jest pusty — dodaj urlop.</p>;
  const start = [anchor, ...spans.map((x) => x.from)].sort()[0];
  const end = spans.map((x) => x.to).sort().pop()!;
  const first = `${start.slice(0, 7)}-01`;
  const total = Math.max(30, daysBetween(first, end) + 1);
  const pos = (iso: string) => `${(Math.max(0, daysBetween(first, iso)) / total) * 100}%`;
  const width = (a: string, b: string) => `${Math.max(0.8, ((daysBetween(a, b) + 1) / total) * 100)}%`;
  const months: string[] = [];
  for (let d = first; d <= end; d = addDays(`${d.slice(0, 7)}-01`, 32).slice(0, 7) + "-01") months.push(d);
  const quarterOnly = months.length > 14;
  const rateDeadline = result.deadlines.find((d) => d.code === "RATE_OPTION_21_DAYS")?.date;
  const paternityEnd = result.pools.paternityDays.total ? result.pools.paternityDays.expiresOn : undefined;
  const markers = [
    { at: anchor, label: anchorLabel },
    ...(rateDeadline && rateDeadline <= end ? [{ at: rateDeadline, label: "21 dni na wniosek" }] : []),
    ...(paternityEnd && paternityEnd <= end ? [{ at: paternityEnd, label: "Koniec ojcowskiego" }] : []),
    ...(today >= first && today <= end ? [{ at: today, label: "Dziś (symulacja)" }] : []),
  ];
  const violating = new Set(result.violations.map((v) => v.blockId));
  const summary = lanes
    .map((l) => {
      const own = spans.filter((x) => x.b.parent === l.parent);
      return `${l.title}: ${own.map((x) => `${leaveShort[x.b.type]} od ${formatDateLong(x.from)} do ${formatDateLong(x.to)}`).join(", ") || "brak urlopu"}`;
    })
    .join(". ");
  return (
    <div className={s.timeline}>
      <p className="visually-hidden">Oś czasu urlopów. {summary}.</p>
      <div className={`${s.tlScroll} ${s.tlDesktop}`}>
        <div className={s.tlInner}>
          <div className={s.axis} aria-hidden="true">
            {months.map((m, i) => {
              const mm = Number(m.slice(5, 7));
              const show = !quarterOnly || mm % 3 === 1;
              return (
                <span key={m} className={s.tick} style={{ left: pos(m) }}>
                  {show ? `${MONTHS_SHORT[mm - 1]}${mm === 1 || i === 0 ? ` ${m.slice(0, 4)}` : ""}` : ""}
                </span>
              );
            })}
          </div>
          {lanes.map((l) => (
            <div key={l.parent} className={s.lane}>
              <p className={s.laneLabel}>{l.title}</p>
              <ol className={s.track} aria-label={l.title}>
                {spans
                  .filter((x) => x.b.parent === l.parent)
                  .map(({ b, from, to }) => (
                    <li key={b.id} className={s.tlItem} style={{ left: pos(from), width: width(from, to) }}>
                      <button
                        type="button"
                        className={s.tlBlock}
                        data-type={b.type}
                        data-part={b.workFraction && b.workFraction.num > 0 ? true : undefined}
                        data-invalid={violating.has(b.id) || undefined}
                        aria-current={selected === b.id ? "true" : undefined}
                        onClick={() => onSelect(b.id)}
                        title={`${leaveShort[b.type]}: ${formatDateShort(from)} – ${formatDateShort(to)}`}
                      >
                        <span className={s.tlText}>
                          {leaveShort[b.type]}
                          {b.workFraction && b.workFraction.num > 0 ? " · praca" : ""} · {formatDuration(daysBetween(from, to) + 1)}
                        </span>
                        <span className="visually-hidden">
                          , od {formatDateLong(from)} do {formatDateLong(to)}
                          {violating.has(b.id) ? ", wymaga poprawy" : ""}. Przejdź do edycji.
                        </span>
                      </button>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
          {markers.map((m) => (
            <span key={m.label} className={s.marker} style={{ left: pos(m.at) }} aria-hidden="true">
              <span>{m.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={s.tlMobile}>
        {lanes.map((l) => (
          <div key={l.parent} className={s.tlMobileLane}>
            <p className={s.laneLabel}>{l.title}</p>
            <ol className={s.tlMobileList}>
              {spans
                .filter((x) => x.b.parent === l.parent)
                .map(({ b, from, to }) => (
                  <li key={b.id}>
                    <button type="button" className={s.tlMobileItem} aria-current={selected === b.id ? "true" : undefined} onClick={() => onSelect(b.id)}>
                      <span className={s.swatch} data-type={b.type} aria-hidden="true" />
                      <span className={s.tlMobileText}>
                        <strong>{leaveShort[b.type]}</strong>
                        <span className={s.muted}>
                          {formatDateShort(from)} – {formatDateShort(to)} · {formatDuration(daysBetween(from, to) + 1)}
                        </span>
                        <span className={s.miniTrack} aria-hidden="true">
                          <i data-type={b.type} style={{ left: pos(from), width: width(from, to) }} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
      <ul className={s.legend} aria-label="Legenda">
        {(["maternity", "supplementary", "parental", "paternity"] as const)
          .filter((t) => plan.blocks.some((b) => b.type === t || (t === "maternity" && b.type === "maternityOnAdoption")))
          .map((t) => (
            <li key={t}>
              <span className={s.swatch} data-type={t} aria-hidden="true" /> {leaveShort[t]}
            </li>
          ))}
      </ul>
    </div>
  );
}
