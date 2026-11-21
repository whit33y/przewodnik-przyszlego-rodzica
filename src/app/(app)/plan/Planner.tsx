"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { LeaveType, Plan, PlanBlock, Result, Role, Violation } from "@/engine/types";
import { citationText, leaveShort, ratePct, reasonText, roleLabel } from "@/content/pl";
import { formatDateLong, formatDateShort, formatDuration, formatMoney } from "@/lib/format";
import type { AltSummary } from "@/server/plan-service";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup, DateInput, Field, Select } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { Stepper } from "@/ui/components/Stepper/Stepper";
import { Icon } from "@/ui/icons/Icon";
import { addDays, buildPreset, endOf, initChain, isLeave, laneOf, newId, presetLabel, reflow, type Chain, type PresetId } from "./plan-utils";
import { Summary } from "./Summary";
import { Timeline } from "./Timeline";
import { WhatIfBar, type WhatIfState } from "./WhatIfBar";
import s from "./Plan.module.css";

export interface PlannerProps {
  initial: { plan: Plan; origin: "saved" | "case" | "default"; result: Result; alt: AltSummary | null };
  claimantRole: Role;
  otherRole: Role | null;
  otherHasData: boolean;
  anchor: string;
  anchorLabel: string;
  adoption: boolean;
  caseMode: boolean;
  today: string;
  whatIf: WhatIfState;
}

interface State {
  plan: Plan;
  origin: PlannerProps["initial"]["origin"];
  chain: Chain;
  result: Result;
  alt: AltSummary | null;
  status: "idle" | "calculating" | "error";
  seq: number;
  undo: Plan | null;
  selected: string | null;
  dirty: boolean;
  savedAt: string | null;
}

type Action =
  | { t: "edit"; plan: Plan; chain?: Chain }
  | { t: "replace"; plan: Plan; origin?: State["origin"] }
  | { t: "link"; id: string; linked: boolean }
  | { t: "calc"; seq: number }
  | { t: "result"; seq: number; result: Result; alt: AltSummary | null; savedAt: string }
  | { t: "reset"; plan: Plan; result: Result; alt: AltSummary | null; origin: State["origin"] }
  | { t: "error"; seq: number }
  | { t: "select"; id: string | null }
  | { t: "undo" };

function reducer(st: State, a: Action): State {
  switch (a.t) {
    case "edit": {
      const chain = a.chain ?? st.chain;
      return { ...st, chain, plan: reflow(a.plan, chain), dirty: true };
    }
    case "replace": {
      const chain = initChain(a.plan);
      return { ...st, undo: st.plan, plan: a.plan, chain, dirty: true, origin: a.origin ?? st.origin };
    }
    case "link": {
      const chain = { ...st.chain, linked: { ...st.chain.linked, [a.id]: a.linked } };
      return { ...st, chain, plan: reflow(st.plan, chain), dirty: true };
    }
    case "calc":
      return { ...st, status: "calculating", seq: a.seq };
    case "result":
      if (a.seq !== st.seq) return st;
      return { ...st, status: "idle", result: a.result, alt: a.alt, savedAt: a.savedAt };
    case "reset":
      return { ...st, plan: a.plan, chain: initChain(a.plan), result: a.result, alt: a.alt, origin: a.origin, undo: st.plan, dirty: false, status: "idle" };
    case "error":
      return a.seq === st.seq ? { ...st, status: "error" } : st;
    case "select":
      return { ...st, selected: a.id };
    case "undo":
      return st.undo ? { ...st, plan: st.undo, chain: initChain(st.undo), undo: null, dirty: true } : st;
  }
}

const fractionValue = (b: PlanBlock) => (b.workFraction && b.workFraction.num > 0 ? `${b.workFraction.num}/${b.workFraction.den}` : "0");

export function Planner(props: PlannerProps) {
  const { initial, claimantRole, otherRole, adoption, anchor } = props;
  const [st, dispatch] = useReducer(reducer, {
    plan: initial.plan,
    origin: initial.origin,
    chain: initChain(initial.plan),
    result: initial.result,
    alt: initial.alt,
    status: "idle",
    seq: 0,
    undo: null,
    selected: null,
    dirty: false,
    savedAt: null,
  });
  const [announce, setAnnounce] = useState("");
  const abort = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const pending = useRef<Plan | null>(null);

  const roleOf = (parent: PlanBlock["parent"]): Role | null => (parent === "claimant" ? claimantRole : otherRole);
  const laneTitle = useCallback(
    (parent: PlanBlock["parent"]) => (parent === "claimant" ? `Ty — ${roleLabel[claimantRole].toLowerCase()}` : `Drugi rodzic — ${otherRole ? roleLabel[otherRole].toLowerCase() : "rodzic"}`),
    [claimantRole, otherRole],
  );
  const motherSide: "claimant" | "other" | null = claimantRole === "mother" || claimantRole === "adoptive" || claimantRole === "foster" ? "claimant" : otherRole === "mother" ? "other" : null;
  const fatherSide: "claimant" | "other" | null = claimantRole === "father" ? "claimant" : otherRole ? "other" : null;
  const pools = st.result.pools;
  const reservedWeeks = Math.round(pools.parentalDays.reservedPerParent / 7);
  const sharedWeeks = Math.max(0, Math.round((pools.parentalDays.total - (otherRole ? 2 : 1) * pools.parentalDays.reservedPerParent) / 7));

  // Debounced save + evaluate (one request per change; stale responses dropped by seq).
  useEffect(() => {
    if (!st.dirty) return;
    pending.current = st.plan;
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const seq = ++seqRef.current;
      dispatch({ t: "calc", seq });
      try {
        const res = await fetch("/api/v1/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: st.plan }), signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { result: Result; alt: AltSummary | null; savedAt: string };
        pending.current = null;
        dispatch({ t: "result", seq, result: data.result, alt: data.alt, savedAt: data.savedAt });
      } catch (e) {
        if ((e as Error).name !== "AbortError") dispatch({ t: "error", seq });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [st.plan, st.dirty]);

  // Do not lose the last edit when the user navigates away within the debounce window.
  useEffect(() => {
    const flush = () => {
      if (!pending.current) return;
      void fetch("/api/v1/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: pending.current }), keepalive: true });
      pending.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // One polite announcement after each recalculation, naming the first problem.
  useEffect(() => {
    if (st.status !== "idle" || !st.dirty) return;
    const t = setTimeout(() => {
      const v = st.result.violations;
      setAnnounce(`Przeliczono. Razem ${formatDuration(st.result.totals.days)}, ${formatMoney(st.result.totals.gross)} brutto.${v.length ? ` Do poprawy: ${v.length}. ${reasonText[v[0].code] ?? ""}` : ""}`);
    }, 800);
    return () => clearTimeout(t);
  }, [st.result, st.status, st.dirty]);

  const setBlock = useCallback((id: string, patch: Partial<PlanBlock>) => dispatch({ t: "edit", plan: { ...st.plan, blocks: st.plan.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) } }), [st.plan]);
  const removeBlock = (id: string) => dispatch({ t: "edit", plan: { ...st.plan, blocks: st.plan.blocks.filter((b) => b.id !== id) }, chain: { ...st.chain, order: st.chain.order.filter((x) => x !== id) } });
  const addBlock = (parent: PlanBlock["parent"], type: LeaveType, days?: number) => {
    const seq = st.chain.order.map((id) => st.plan.blocks.find((b) => b.id === id)).filter(Boolean) as PlanBlock[];
    const last = seq[seq.length - 1];
    const from = type === "paternity" ? anchor : last ? addDays(last.from, last.days) : anchor;
    const left = Math.max(7, pools.parentalDays.total - pools.parentalDays.used);
    const len = days ?? (type === "paternity" ? Math.max(7, pools.paternityDays.total - pools.paternityDays.used) : type === "parental" ? Math.min(pools.parentalDays.reservedPerParent || 63, left) : 7);
    const block: PlanBlock = { id: newId(st.plan, type, parent), parent, type, from, days: len, ...(type === "parental" ? { pool: parent === motherSide ? "shared" : "ownNineWeeks" } : {}) };
    const chain = type === "paternity" ? st.chain : { order: [...st.chain.order, block.id], linked: { ...st.chain.linked, [block.id]: true } };
    dispatch({ t: "edit", plan: { ...st.plan, blocks: [...st.plan.blocks, block] }, chain });
  };
  const applyPreset = (id: PresetId) => {
    const p = buildPreset(id, { anchor, motherSide, fatherSide, pools, adoption, rateOption: st.plan.rateOption, titleId: st.plan.blocks.find((b) => b.parent === "claimant")?.titleId });
    if (p) {
      dispatch({ t: "replace", plan: { ...p, singleTitleStatement: st.plan.singleTitleStatement, blocks: [...st.plan.blocks.filter((b) => !isLeave(b)), ...p.blocks] } });
      setAnnounce(`Zastosowano scenariusz: ${presetLabel[id].title}.`);
    }
  };
  const reset = useCallback(async () => {
    const res = await fetch("/api/v1/plan", { method: "DELETE" });
    if (res.ok) {
      const d = (await res.json()) as { plan: Plan; result: Result; alt: AltSummary | null; origin: State["origin"] };
      dispatch({ t: "reset", plan: d.plan, result: d.result, alt: d.alt, origin: d.origin });
      setAnnounce("Przywrócono plan.");
    }
  }, []);

  /** Two block-crossing fixes need the whole plan, not just a patch of one row. */
  const fixPlan = (v: Violation, b: PlanBlock): { label: string; run: () => void } | null => {
    const name = `${leaveShort[b.type].toLowerCase()} (${b.parent === "claimant" ? "Ty" : "drugi rodzic"})`;
    if (v.code === "PARTS_LIMIT") {
      const prev = laneOf(st.plan, b.parent).filter((x) => x.type === b.type && x.from < b.from).pop();
      if (!prev) return null;
      return {
        label: `Połącz: ${name} z poprzednią częścią`,
        run: () => dispatch({ t: "edit", plan: { ...st.plan, blocks: st.plan.blocks.filter((x) => x.id !== b.id).map((x) => (x.id === prev.id ? { ...x, days: x.days + b.days } : x)) }, chain: { ...st.chain, order: st.chain.order.filter((x) => x !== b.id) } }),
      };
    }
    if (v.code === "RESERVED_WEEKS" && typeof v.values?.allowedDays === "number") {
      const other: PlanBlock["parent"] = b.parent === "claimant" ? "other" : "claimant";
      const reserved = Number(v.values.reservedDays ?? pools.parentalDays.reservedPerParent);
      const canMove = otherRole && !st.plan.blocks.some((x) => x.parent === other && x.type === "parental" && x.pool === "ownNineWeeks");
      return {
        label: canMove ? `Przenieś ${formatDuration(reserved)} do drugiego rodzica` : `Skróć: ${name} do ${v.values.allowedDays} dni`,
        run: () => {
          const shortened = { ...st.plan, blocks: st.plan.blocks.map((x) => (x.id === b.id ? { ...x, days: Number(v.values.allowedDays) } : x)) };
          if (!canMove) return dispatch({ t: "edit", plan: shortened });
          const nb: PlanBlock = { id: newId(shortened, "parental", other), parent: other, type: "parental", from: addDays(b.from, Number(v.values.allowedDays)), days: reserved, pool: "ownNineWeeks" };
          dispatch({ t: "edit", plan: { ...shortened, blocks: [...shortened.blocks, nb] }, chain: { order: [...st.chain.order, nb.id], linked: { ...st.chain.linked, [nb.id]: true } } });
        },
      };
    }
    return null;
  };

  const violationsFor = (id: string) => st.result.violations.filter((v) => v.blockId === id);
  const general = st.result.violations.filter((v) => !v.blockId || !st.plan.blocks.some((b) => b.id === v.blockId));
  const periodFor = (id: string) => st.result.periods.find((p) => p.blockId === id);
  const lanes: PlanBlock["parent"][] = otherRole || st.plan.blocks.some((b) => b.parent === "other" && isLeave(b)) ? ["claimant", "other"] : ["claimant"];
  const pregnancy = st.result.periods.filter((p) => !isLeave(p));
  const rateDeadline = st.result.deadlines.find((d) => d.code === "RATE_OPTION_21_DAYS")?.date ?? st.alt?.deadline;
  const presets: PresetId[] = useMemo(() => (otherRole ? ["allMother", "equal", "fatherNine", "partTime"] : ["allMother", "partTime"]), [otherRole]);
  const motherMandatoryId = motherSide ? laneOf(st.plan, motherSide).find((b) => b.type === "maternity" || b.type === "maternityOnAdoption")?.id : undefined;

  const typeOptions = (parent: PlanBlock["parent"]): { value: LeaveType; label: string }[] => [
    { value: adoption ? "maternityOnAdoption" : "maternity", label: adoption ? "Urlop na warunkach macierzyńskiego" : "Urlop macierzyński" },
    ...(!adoption && pools.supplementaryDays.total > 0 ? [{ value: "supplementary" as const, label: "Urlop uzupełniający" }] : []),
    { value: "parental", label: "Urlop rodzicielski" },
    ...(roleOf(parent) === "father" && !adoption ? [{ value: "paternity" as const, label: "Urlop ojcowski" }] : []),
  ];

  return (
    <div className={s.planner}>
      <span className="visually-hidden" aria-live="polite">
        {announce}
      </span>
      {props.caseMode ? (
        <Notice tone="info" title="Plan z akt sprawy" hideToneWord actions={<Button size="sm" variant="secondary" onClick={reset} icon="refresh">Przywróć wniosek z akt</Button>}>
          <p>To urlopy, o które wnioskowała osoba z tej sprawy. Zmiany są tylko symulacją.</p>
        </Notice>
      ) : null}

      <WhatIfBar state={props.whatIf} dirty={st.dirty} onApplied={reset} />

      <section className={s.toolbar} aria-labelledby="presets-title">
        <h2 id="presets-title" className={s.h3}>
          Gotowe scenariusze
        </h2>
        <div className={s.presets}>
          {presets.map((p) => (
            <button key={p} type="button" className={s.preset} onClick={() => applyPreset(p)}>
              <strong>{presetLabel[p].title}</strong>
              <span>{p === "fatherNine" ? `Jego ${reservedWeeks} tygodni rodzicielskiego, których nie można przekazać` : presetLabel[p].hint}</span>
            </button>
          ))}
        </div>
        <div className={s.toolbarActions}>
          {st.undo ? (
            <Button variant="text" size="sm" icon="back" onClick={() => dispatch({ t: "undo" })}>
              Cofnij zmianę
            </Button>
          ) : null}
          {!props.caseMode ? (
            <Button variant="text" size="sm" icon="refresh" onClick={reset}>
              Przywróć plan domyślny
            </Button>
          ) : null}
          <Button variant="text" size="sm" icon="printer" onClick={() => window.print()}>
            Drukuj plan
          </Button>
          <span className={s.muted} aria-hidden="true">
            {st.status === "calculating" ? "Przeliczamy…" : st.savedAt ? "Zapisano" : ""}
          </span>
        </div>
      </section>

      <div className={s.columns}>
        <div className={s.main}>
          <section className={s.card} aria-labelledby="rate-title">
            <h2 id="rate-title" className={s.h3}>
              Jak chcesz otrzymywać zasiłek?
            </h2>
            <ChoiceGroup
              legend="Wysokość zasiłku"
              name="rateOption"
              value={st.plan.rateOption}
              onChange={(v) => dispatch({ t: "edit", plan: { ...st.plan, rateOption: v } })}
              options={[
                {
                  value: "averaged81_5",
                  label: "81,5% przez cały okres",
                  hint: `Wniosek o urlop macierzyński i rodzicielski razem${rateDeadline ? ` — najpóźniej ${formatDateLong(rateDeadline)}` : " — w terminie po porodzie"}.`,
                  disabled: st.plan.rateOption !== "averaged81_5" && st.alt?.rateOption === "averaged81_5" && !st.alt.available,
                },
                { value: "split100_70", label: "100% za urlop macierzyński, potem 70%", hint: "Wyższy zasiłek na początku, niższy w czasie urlopu rodzicielskiego." },
              ]}
            />
          </section>

          {pregnancy.length ? (
            <section className={s.card} aria-labelledby="preg-title">
              <h2 id="preg-title" className={s.h3}>
                W ciąży
              </h2>
              <ul className={s.pregList}>
                {pregnancy.map((p) => (
                  <li key={p.blockId}>
                    <strong>{leaveShort[p.type]}</strong>: {formatDateShort(p.from)} – {formatDateShort(p.to)} · {ratePct(p.rateBps)}
                    {p.daily ? ` · ${formatMoney(p.daily * 30)} miesięcznie` : ""} · wypłaci {p.paidBy === "payer" ? "pracodawca" : "ZUS"}
                  </li>
                ))}
              </ul>
              <p className={s.muted}>Na podstawie zwolnień lekarskich z e-ZLA. Tej części nie planujesz — zależy od lekarza.</p>
            </section>
          ) : null}

          {general.length ? (
            <div className={s.violations} role="group" aria-label="Do poprawy w planie">
              {general.map((v, i) => (
                <ViolationNotice key={i} v={v} />
              ))}
            </div>
          ) : null}

          {lanes.map((parent) => {
            const lane = laneOf(st.plan, parent);
            const options = typeOptions(parent);
            return (
              <section key={parent} className={s.card} aria-labelledby={`lane-${parent}`}>
                <div className={s.laneHead}>
                  <h2 id={`lane-${parent}`} className={s.h3}>
                    {laneTitle(parent)}
                  </h2>
                  <span className={s.muted}>{lane.length ? `${lane.length} ${lane.length === 1 ? "okres" : lane.length < 5 ? "okresy" : "okresów"}` : "brak urlopów"}</span>
                </div>
                {parent === "other" && !props.otherHasData ? (
                  <p className={s.muted}>
                    Nie znamy zarobków drugiego rodzica, więc nie pokazujemy kwot jego zasiłku. <a href="/sytuacja">Podaj je szacunkowo</a>.
                  </p>
                ) : null}
                <ol className={s.blocks}>
                  {lane.map((b) => {
                    const first = st.chain.order[0] === b.id;
                    const inChain = st.chain.order.includes(b.id);
                    return (
                      <BlockRow
                        key={b.id}
                        b={b}
                        selected={st.selected === b.id}
                        linked={inChain && !first && st.chain.linked[b.id] !== false}
                        canUnlink={inChain && !first}
                        removable={b.id !== motherMandatoryId}
                        options={options}
                        period={periodFor(b.id)}
                        violations={violationsFor(b.id)}
                        showMoney={parent === "claimant" || props.otherHasData}
                        pools={{ sharedWeeks, reservedWeeks, paternityMax: pools.paternityDays.total || 14, maxWeeks: Math.max(1, Math.ceil(Math.max(pools.parentalDays.total, pools.maternityDays.total + pools.supplementaryDays.total) / 7) * 2) }}
                        onChange={(patch) => setBlock(b.id, patch)}
                        onLink={(l) => dispatch({ t: "link", id: b.id, linked: l })}
                        onRemove={() => removeBlock(b.id)}
                        onFocus={() => dispatch({ t: "select", id: b.id })}
                        fixPlan={(v) => fixPlan(v, b)}
                      />
                    );
                  })}
                </ol>
                <AddBlock options={options} onAdd={(type) => addBlock(parent, type)} />
              </section>
            );
          })}

          <section className={s.card} aria-labelledby="tl-title">
            <h2 id="tl-title" className={s.h3}>
              Oś czasu
            </h2>
            <Timeline
              plan={st.plan}
              result={st.result}
              lanes={lanes.map((p) => ({ parent: p, title: laneTitle(p) }))}
              anchor={anchor}
              anchorLabel={props.anchorLabel}
              today={props.today}
              selected={st.selected}
              onSelect={(id) => {
                dispatch({ t: "select", id });
                document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                (document.getElementById(`row-${id}-title`) as HTMLElement | null)?.focus();
              }}
            />
          </section>
        </div>

        <Summary result={st.result} alt={st.alt} plan={st.plan} status={st.status} onPickRate={(r) => dispatch({ t: "edit", plan: { ...st.plan, rateOption: r } })} showOther={lanes.includes("other")} otherHasData={props.otherHasData} laneTitle={laneTitle} />
      </div>
      {st.status === "error" ? (
        <Notice tone="caution" title="Nie udało się przeliczyć planu" role="alert" actions={<Button size="sm" onClick={() => dispatch({ t: "edit", plan: { ...st.plan } })}>Spróbuj ponownie</Button>}>
          <p>Pokazujemy ostatni poprawnie przeliczony wynik.</p>
        </Notice>
      ) : null}
    </div>
  );
}

function ViolationNotice({ v, onFix, fixLabel, id }: { v: Violation; onFix?: () => void; fixLabel?: string; id?: string }) {
  return (
    <div id={id} role="alert">
      <Notice tone="negative" title={reasonText[v.code] ?? v.code} hideToneWord actions={onFix && fixLabel ? <Button size="sm" variant="secondary" onClick={onFix}>{fixLabel}</Button> : null}>
        {v.citations?.length ? <p className={s.cite}>{v.citations.map(citationText).join("; ")}</p> : null}
      </Notice>
    </div>
  );
}

interface RowProps {
  b: PlanBlock;
  selected: boolean;
  linked: boolean;
  canUnlink: boolean;
  removable: boolean;
  options: { value: LeaveType; label: string }[];
  period?: Result["periods"][number];
  violations: Violation[];
  showMoney: boolean;
  pools: { sharedWeeks: number; reservedWeeks: number; paternityMax: number; maxWeeks: number };
  onChange: (p: Partial<PlanBlock>) => void;
  onLink: (l: boolean) => void;
  onRemove: () => void;
  onFocus: () => void;
  fixPlan: (v: Violation) => { label: string; run: () => void } | null;
}

function fixFor(v: Violation, b: PlanBlock): { label: string; patch: Partial<PlanBlock> } | null {
  const val = v.values ?? {};
  const name = `${leaveShort[b.type].toLowerCase()} (${b.parent === "claimant" ? "Ty" : "drugi rodzic"})`;
  switch (v.code) {
    case "EXCESS_DAYS":
    case "POOL_EXCEEDED":
      return typeof val.allowedDays === "number" && val.allowedDays > 0 ? { label: `Skróć: ${name} do ${val.allowedDays} dni`, patch: { days: val.allowedDays } } : null;
    case "MOTHER_MINIMUM_WEEKS":
      return typeof val.requiredDays === "number" ? { label: `Ustaw ${formatDuration(val.requiredDays)}: ${name}`, patch: { days: val.requiredDays } } : null;
    case "NOT_CONTIGUOUS":
      return typeof val.requiredFrom === "string" ? { label: `Zacznij ${name} ${formatDateShort(val.requiredFrom)}`, patch: { from: val.requiredFrom } } : null;
    case "WORK_FRACTION_TOO_HIGH":
      return { label: `Ustaw pół etatu: ${name}`, patch: { workFraction: { num: Number(val.maxNum ?? 1), den: Number(val.maxDen ?? 2) } } };
    case "DEADLINE_PASSED":
      return typeof val.latestEnd === "string" ? { label: `Przesuń ${name} przed ${formatDateShort(val.latestEnd)}`, patch: { from: addDays(val.latestEnd, -(b.days - 1)) } } : null;
    default:
      return null;
  }
}

function BlockRow({ b, selected, linked, canUnlink, removable, options, period, violations, showMoney, pools, onChange, onLink, onRemove, onFocus, fixPlan }: RowProps) {
  const weeks = Math.floor(b.days / 7);
  const rest = b.days % 7;
  const errId = violations.length ? `row-${b.id}-err` : undefined;
  return (
    <li id={`row-${b.id}`} className={s.row} data-selected={selected || undefined} data-type={b.type} data-invalid={violations.length ? true : undefined} onFocusCapture={onFocus}>
      <div className={s.rowHead}>
        <h3 id={`row-${b.id}-title`} tabIndex={-1} className={s.rowTitle}>
          <span className={s.swatch} data-type={b.type} aria-hidden="true" />
          {leaveShort[b.type]}
          {b.pool === "ownNineWeeks" ? <span className={s.tag}>{pools.reservedWeeks} tygodni tylko dla tego rodzica</span> : null}
          {b.takeover ? <span className={s.tag}>przejęty od matki</span> : null}
        </h3>
        {removable ? (
          <Button variant="text" size="sm" icon="close" onClick={onRemove}>
            Usuń<span className="visually-hidden"> — {leaveShort[b.type]}</span>
          </Button>
        ) : null}
      </div>
      <div className={s.rowGrid}>
        <Field label="Rodzaj urlopu">
          {({ id }) => (
            <Select id={id} aria-describedby={errId} value={b.type} onChange={(e) => onChange({ type: e.currentTarget.value as LeaveType, ...(e.currentTarget.value !== "parental" ? { workFraction: undefined, pool: undefined } : { pool: b.pool ?? "shared" }) })}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {b.type === "paternity" ? (
          <Stepper label="Długość" unit="dni" value={b.days} min={1} max={pools.paternityMax} step={1} describedBy={errId} hint="Jednorazowo albo w 2 częściach po co najmniej 7 dni." onChange={(d) => onChange({ days: d })} />
        ) : (
          <Stepper label="Długość" unit="tyg." value={weeks} min={1} max={pools.maxWeeks} describedBy={errId} onChange={(w) => onChange({ days: w * 7 + rest })} hint={rest ? `oraz ${rest} dni` : undefined} />
        )}
        <div className={s.dates}>
          {linked ? (
            <p>
              <span className={s.label}>Od</span>
              <span className={s.value}>{formatDateLong(b.from)}</span>
              <span className={s.muted}>dzień po poprzednim urlopie</span>
            </p>
          ) : (
            <DateInput legend="Od" name={`from-${b.id}`} value={b.from} onChange={(iso) => (iso ? onChange({ from: iso }) : undefined)} />
          )}
          <p>
            <span className={s.label}>Do</span>
            <span className={s.value}>{formatDateLong(period?.to ?? endOf(b))}</span>
            <span className={s.muted}>
              {period?.days ?? b.days} dni{period?.extensionDays ? ` · w tym ${formatDuration(period.extensionDays)} wydłużenia przez pracę` : ""}
            </span>
          </p>
          {canUnlink ? (
            <label className={s.check}>
              <input type="checkbox" checked={!linked} onChange={(e) => onLink(!e.currentTarget.checked)} />
              Własna data rozpoczęcia
            </label>
          ) : null}
        </div>
        {b.type === "parental" ? (
          <>
            <Field label="Praca w trakcie urlopu" hint="Do połowy etatu. Urlop wydłuża się proporcjonalnie.">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={[describedBy, errId].filter(Boolean).join(" ") || undefined}
                  value={fractionValue(b)}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    onChange({ workFraction: v === "0" ? undefined : { num: Number(v.split("/")[0]), den: Number(v.split("/")[1]) } });
                  }}
                >
                  <option value="0">Nie pracuję</option>
                  <option value="1/4">1/4 etatu</option>
                  <option value="3/8">3/8 etatu</option>
                  <option value="1/2">1/2 etatu</option>
                </Select>
              )}
            </Field>
            <Field label="Z której puli">
              {({ id }) => (
                <Select id={id} value={b.pool ?? "shared"} onChange={(e) => onChange({ pool: e.currentTarget.value as PlanBlock["pool"] })}>
                  <option value="shared">{pools.sharedWeeks ? `Wspólna (${pools.sharedWeeks} tygodni do podziału)` : "Wspólna"}</option>
                  <option value="ownNineWeeks">{`Moje ${pools.reservedWeeks} tygodni`}</option>
                </Select>
              )}
            </Field>
          </>
        ) : null}
      </div>
      {period && showMoney ? (
        <p className={s.rowMoney}>
          <Icon name="coins" size={20} />
          <span>
            <strong>{formatMoney(period.daily * 30)}</strong> miesięcznie brutto ({ratePct(period.rateBps)}
            {period.workReductionBps ? ", pomniejszone o pracę" : ""}) · razem <strong>{formatMoney(period.gross)}</strong> · wypłaci {period.paidBy === "payer" ? "pracodawca" : "ZUS"}
          </span>
        </p>
      ) : null}
      {violations.length ? (
        <div id={errId} className={s.violations}>
          {(() => {
            const seen = new Set<string>();
            return violations.map((v, i) => {
              const fix = fixFor(v, b);
              const planFix = fix ? null : fixPlan(v);
              const label = fix?.label ?? planFix?.label;
              const dup = label ? seen.has(label) : false;
              if (label) seen.add(label);
              return <ViolationNotice key={i} v={v} onFix={dup ? undefined : fix ? () => onChange(fix.patch) : planFix?.run} fixLabel={dup ? undefined : label} />;
            });
          })()}
        </div>
      ) : null}
    </li>
  );
}

function AddBlock({ options, onAdd }: { options: { value: LeaveType; label: string }[]; onAdd: (t: LeaveType) => void }) {
  const [type, setType] = useState<LeaveType>(options.find((o) => o.value === "parental")?.value ?? options[0].value);
  return (
    <div className={s.add}>
      <Field label="Dodaj urlop">
        {({ id }) => (
          <Select id={id} value={type} onChange={(e) => setType(e.currentTarget.value as LeaveType)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button variant="secondary" icon="plus" onClick={() => onAdd(type)}>
        Dodaj
      </Button>
    </div>
  );
}
