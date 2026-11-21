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
import { addDays, buildPreset, endOf, isLeave, laneOf, newId, presetLabel, reflow, type PresetId } from "./plan-utils";
import { Summary } from "./Summary";
import { Timeline } from "./Timeline";
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
}

interface State {
  plan: Plan;
  origin: PlannerProps["initial"]["origin"];
  linked: Record<string, boolean>;
  result: Result;
  alt: AltSummary | null;
  status: "idle" | "calculating" | "error";
  seq: number;
  undo: Plan | null;
  selected: string | null;
  dirty: boolean;
}

type Action =
  | { t: "edit"; plan: Plan; keepUndo?: boolean }
  | { t: "replace"; plan: Plan; origin?: State["origin"] }
  | { t: "link"; id: string; linked: boolean }
  | { t: "calc"; seq: number }
  | { t: "result"; seq: number; result: Result; alt: AltSummary | null }
  | { t: "reset"; plan: Plan; result: Result; alt: AltSummary | null; origin: State["origin"] }
  | { t: "error"; seq: number }
  | { t: "select"; id: string | null }
  | { t: "undo" };

function reducer(st: State, a: Action): State {
  switch (a.t) {
    case "edit":
      return { ...st, plan: reflow(a.plan, st.linked), dirty: true, undo: a.keepUndo ? st.undo : st.undo };
    case "replace":
      return { ...st, undo: st.plan, plan: a.plan, linked: {}, dirty: true, origin: a.origin ?? st.origin };
    case "link": {
      const linked = { ...st.linked, [a.id]: a.linked };
      return { ...st, linked, plan: reflow(st.plan, linked) };
    }
    case "calc":
      return { ...st, status: "calculating", seq: a.seq };
    case "result":
      if (a.seq !== st.seq) return st;
      return { ...st, status: "idle", result: a.result, alt: a.alt };
    case "reset":
      return { ...st, plan: a.plan, result: a.result, alt: a.alt, origin: a.origin, linked: {}, undo: st.plan, dirty: false, status: "idle" };
    case "error":
      return a.seq === st.seq ? { ...st, status: "error" } : st;
    case "select":
      return { ...st, selected: a.id };
    case "undo":
      return st.undo ? { ...st, plan: st.undo, undo: null, dirty: true } : st;
  }
}

const typeOptions = (adoption: boolean, isFather: boolean): { value: LeaveType; label: string }[] => [
  { value: adoption ? "maternityOnAdoption" : "maternity", label: adoption ? "Urlop na warunkach macierzyńskiego" : "Urlop macierzyński" },
  ...(adoption ? [] : [{ value: "supplementary" as const, label: "Urlop uzupełniający" }]),
  { value: "parental", label: "Urlop rodzicielski" },
  ...(isFather && !adoption ? [{ value: "paternity" as const, label: "Urlop ojcowski" }] : []),
];

const fractionValue = (b: PlanBlock) => (b.workFraction && b.workFraction.num > 0 ? `${b.workFraction.num}/${b.workFraction.den}` : "0");

export function Planner(props: PlannerProps) {
  const { initial, claimantRole, otherRole, adoption, anchor } = props;
  const [st, dispatch] = useReducer(reducer, {
    plan: initial.plan,
    origin: initial.origin,
    linked: {},
    result: initial.result,
    alt: initial.alt,
    status: "idle",
    seq: 0,
    undo: null,
    selected: null,
    dirty: false,
  });
  const [announce, setAnnounce] = useState("");
  const abort = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const first = useRef(true);

  const roleOf = (parent: PlanBlock["parent"]): Role | null => (parent === "claimant" ? claimantRole : otherRole);
  const isFather = (parent: PlanBlock["parent"]) => roleOf(parent) === "father";
  const laneTitle = (parent: PlanBlock["parent"]) => (parent === "claimant" ? `Ty — ${roleLabel[claimantRole].toLowerCase()}` : `Drugi rodzic — ${otherRole ? roleLabel[otherRole].toLowerCase() : "rodzic"}`);
  const motherSide: "claimant" | "other" | null = claimantRole === "mother" || claimantRole === "adoptive" || claimantRole === "foster" ? "claimant" : otherRole === "mother" ? "other" : null;
  const fatherSide: "claimant" | "other" | null = claimantRole === "father" ? "claimant" : otherRole === "father" ? "other" : otherRole ? "other" : null;

  // Debounced save + evaluate (one request per change; stale responses dropped by seq).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!st.dirty) return;
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const seq = ++seqRef.current;
      dispatch({ t: "calc", seq });
      try {
        const res = await fetch("/api/v1/plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: st.plan }), signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { result: Result; alt: AltSummary | null };
        dispatch({ t: "result", seq, result: data.result, alt: data.alt });
      } catch (e) {
        if ((e as Error).name !== "AbortError") dispatch({ t: "error", seq });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [st.plan, st.dirty]);

  // One polite announcement after each recalculation.
  useEffect(() => {
    if (st.status !== "idle" || !st.dirty) return;
    const t = setTimeout(() => {
      const v = st.result.violations.length;
      setAnnounce(`Przeliczono. Razem ${formatDuration(st.result.totals.days)}, ${formatMoney(st.result.totals.gross)} brutto.${v ? ` Do poprawy: ${v}.` : ""}`);
    }, 800);
    return () => clearTimeout(t);
  }, [st.result, st.status, st.dirty]);

  const setBlock = useCallback((id: string, patch: Partial<PlanBlock>) => dispatch({ t: "edit", plan: { ...st.plan, blocks: st.plan.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) } }), [st.plan]);
  const removeBlock = (id: string) => dispatch({ t: "edit", plan: { ...st.plan, blocks: st.plan.blocks.filter((b) => b.id !== id) } });
  const addBlock = (parent: PlanBlock["parent"], type: LeaveType) => {
    const lane = laneOf(st.plan, parent).filter((b) => b.type !== "paternity");
    const last = lane[lane.length - 1];
    const lastAny = laneOf(st.plan, motherSide ?? "claimant").filter((b) => b.type !== "paternity").pop();
    const from = type === "paternity" ? anchor : last ? addDays(last.from, last.days) : lastAny ? addDays(lastAny.from, lastAny.days) : anchor;
    const days = type === "paternity" ? 14 - st.result.pools.paternityDays.used || 7 : type === "parental" ? Math.max(7, Math.min(63, st.result.pools.parentalDays.total - st.result.pools.parentalDays.used)) : 7;
    const block: PlanBlock = { id: newId(st.plan, type, parent), parent, type, from, days, ...(type === "parental" ? { pool: parent === "claimant" ? "shared" : "ownNineWeeks" } : {}) };
    dispatch({ t: "edit", plan: { ...st.plan, blocks: [...st.plan.blocks, block] } });
  };
  const applyPreset = (id: PresetId) => {
    const p = buildPreset(id, { anchor, motherSide, fatherSide: otherRole ? fatherSide : claimantRole === "father" ? "claimant" : null, pools: st.result.pools, adoption, rateOption: st.plan.rateOption, titleId: st.plan.blocks.find((b) => b.parent === "claimant")?.titleId });
    if (p) dispatch({ t: "replace", plan: { ...p, blocks: [...st.plan.blocks.filter((b) => !isLeave(b)), ...p.blocks] } });
  };
  const reset = async () => {
    const res = await fetch("/api/v1/plan", { method: "DELETE" });
    if (res.ok) {
      const d = (await res.json()) as { plan: Plan; result: Result; alt: AltSummary | null; origin: State["origin"] };
      dispatch({ t: "reset", plan: d.plan, result: d.result, alt: d.alt, origin: d.origin });
      setAnnounce("Przywrócono plan.");
    }
  };

  const violationsFor = (id: string) => st.result.violations.filter((v) => v.blockId === id);
  const general = st.result.violations.filter((v) => !v.blockId || !st.plan.blocks.some((b) => b.id === v.blockId));
  const periodFor = (id: string) => st.result.periods.find((p) => p.blockId === id);
  const lanes: PlanBlock["parent"][] = otherRole || st.plan.blocks.some((b) => b.parent === "other" && isLeave(b)) ? ["claimant", "other"] : ["claimant"];
  const pregnancy = st.result.periods.filter((p) => !isLeave(p));
  const rateDeadline = st.result.deadlines.find((d) => d.code === "RATE_OPTION_21_DAYS")?.date ?? st.alt?.deadline;
  const presets: PresetId[] = useMemo(() => (otherRole ? ["allMother", "equal", "fatherNine", "partTime"] : ["allMother", "partTime"]), [otherRole]);

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

      <section className={s.toolbar} aria-labelledby="presets-title">
        <h2 id="presets-title" className={s.h3}>
          Gotowe scenariusze
        </h2>
        <div className={s.presets}>
          {presets.map((p) => (
            <button key={p} type="button" className={s.preset} onClick={() => applyPreset(p)}>
              <strong>{presetLabel[p].title}</strong>
              <span>{presetLabel[p].hint}</span>
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
                  hint: `Wniosek o urlop macierzyński i rodzicielski razem${rateDeadline ? ` — najpóźniej ${formatDateLong(rateDeadline)}` : " — najpóźniej 21 dni po porodzie"}.`,
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
            const father = isFather(parent);
            const available = typeOptions(adoption, father).filter((o) => o.value !== "supplementary" || st.result.pools.supplementaryDays.total > 0);
            return (
              <section key={parent} className={s.card} aria-labelledby={`lane-${parent}`}>
                <div className={s.laneHead}>
                  <h2 id={`lane-${parent}`} className={s.h3}>
                    {laneTitle(parent)}
                  </h2>
                  <span className={s.muted}>{lane.length ? `${lane.length} ${lane.length === 1 ? "okres" : "okresy"}` : "brak urlopów"}</span>
                </div>
                {parent === "other" && !props.otherHasData ? (
                  <p className={s.muted}>
                    Nie znamy zarobków drugiego rodzica, więc nie pokazujemy kwot jego zasiłku. <a href="/sytuacja">Podaj je szacunkowo</a>.
                  </p>
                ) : null}
                <ol className={s.blocks}>
                  {lane.map((b) => (
                    <BlockRow
                      key={b.id}
                      b={b}
                      selected={st.selected === b.id}
                      linked={st.linked[b.id] !== false && b.type !== "paternity" && lane.filter((x) => x.type !== "paternity")[0]?.id !== b.id}
                      canUnlink={b.type !== "paternity" && lane.filter((x) => x.type !== "paternity")[0]?.id !== b.id}
                      options={available}
                      period={periodFor(b.id)}
                      violations={violationsFor(b.id)}
                      showMoney={parent === "claimant" || props.otherHasData}
                      onChange={(patch) => setBlock(b.id, patch)}
                      onLink={(l) => dispatch({ t: "link", id: b.id, linked: l })}
                      onRemove={() => removeBlock(b.id)}
                      onFocus={() => dispatch({ t: "select", id: b.id })}
                    />
                  ))}
                </ol>
                <AddBlock options={available} onAdd={(type) => addBlock(parent, type)} />
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

function ViolationNotice({ v, onFix, fixLabel }: { v: Violation; onFix?: () => void; fixLabel?: string }) {
  return (
    <Notice tone="negative" title={reasonText[v.code] ?? v.code} hideToneWord actions={onFix && fixLabel ? <Button size="sm" variant="secondary" onClick={onFix}>{fixLabel}</Button> : null}>
      {v.citations?.length ? <p className={s.cite}>{v.citations.map(citationText).join("; ")}</p> : null}
    </Notice>
  );
}

interface RowProps {
  b: PlanBlock;
  selected: boolean;
  linked: boolean;
  canUnlink: boolean;
  options: { value: LeaveType; label: string }[];
  period?: Result["periods"][number];
  violations: Violation[];
  showMoney: boolean;
  onChange: (p: Partial<PlanBlock>) => void;
  onLink: (l: boolean) => void;
  onRemove: () => void;
  onFocus: () => void;
}

function fixFor(v: Violation, b: PlanBlock): { label: string; patch: Partial<PlanBlock> } | null {
  const val = v.values ?? {};
  const name = leaveShort[b.type].toLowerCase();
  switch (v.code) {
    case "EXCESS_DAYS":
    case "POOL_EXCEEDED":
      return typeof val.allowedDays === "number" && val.allowedDays > 0 ? { label: `Skróć ${name} do ${val.allowedDays} dni`, patch: { days: val.allowedDays } } : null;
    case "MOTHER_MINIMUM_WEEKS":
      return { label: "Ustaw 14 tygodni", patch: { days: typeof val.requiredDays === "number" ? val.requiredDays : 98 } };
    case "NOT_CONTIGUOUS":
      return typeof val.requiredFrom === "string" ? { label: `Zacznij ${formatDateShort(val.requiredFrom)}`, patch: { from: val.requiredFrom } } : null;
    case "WORK_FRACTION_TOO_HIGH":
      return { label: "Ustaw pół etatu", patch: { workFraction: { num: 1, den: 2 } } };
    case "DEADLINE_PASSED":
      return typeof val.latestEnd === "string" ? { label: `Przesuń przed ${formatDateShort(val.latestEnd)}`, patch: { from: addDays(val.latestEnd, -(b.days - 1)) } } : null;
    default:
      return null;
  }
}

function BlockRow({ b, selected, linked, canUnlink, options, period, violations, showMoney, onChange, onLink, onRemove, onFocus }: RowProps) {
  const weeks = Math.floor(b.days / 7);
  const rest = b.days % 7;
  const errId = violations.length ? `row-${b.id}-err` : undefined;
  return (
    <li id={`row-${b.id}`} className={s.row} data-selected={selected || undefined} data-type={b.type} data-invalid={violations.length ? true : undefined} onFocusCapture={onFocus} aria-describedby={errId}>
      <div className={s.rowHead}>
        <h3 id={`row-${b.id}-title`} tabIndex={-1} className={s.rowTitle}>
          <span className={s.swatch} data-type={b.type} aria-hidden="true" />
          {leaveShort[b.type]}
          {b.pool === "ownNineWeeks" ? <span className={s.tag}>9 tygodni tylko dla tego rodzica</span> : null}
          {b.takeover ? <span className={s.tag}>przejęty od matki</span> : null}
        </h3>
        <Button variant="text" size="sm" icon="close" onClick={onRemove}>
          Usuń<span className="visually-hidden"> — {leaveShort[b.type]}</span>
        </Button>
      </div>
      <div className={s.rowGrid}>
        <Field label="Rodzaj urlopu">
          {({ id }) => (
            <Select id={id} value={b.type} onChange={(e) => onChange({ type: e.currentTarget.value as LeaveType, ...(e.currentTarget.value !== "parental" ? { workFraction: undefined, pool: undefined } : { pool: b.pool ?? "shared" }) })}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {b.type === "paternity" ? (
          <Stepper label="Długość" unit="dni" value={b.days} min={1} max={14} onChange={(d) => onChange({ days: d })} />
        ) : (
          <Stepper label="Długość" unit="tyg." value={weeks} min={1} max={130} onChange={(w) => onChange({ days: w * 7 + rest })} hint={rest ? `oraz ${rest} dni` : undefined} />
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
              {period?.days ?? b.days} dni{period?.workReductionBps ? " · wydłużony przez pracę" : ""}
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
                  aria-describedby={describedBy}
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
                  <option value="shared">Wspólna (32 tygodnie)</option>
                  <option value="ownNineWeeks">Moje 9 tygodni</option>
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
            {period.workReductionBps ? `, pomniejszone o pracę` : ""}) · razem <strong>{formatMoney(period.gross)}</strong> · wypłaci {period.paidBy === "payer" ? "pracodawca" : "ZUS"}
          </span>
        </p>
      ) : null}
      {violations.length ? (
        <div id={errId} className={s.violations}>
          {violations.map((v, i) => {
            const fix = fixFor(v, b);
            return <ViolationNotice key={i} v={v} onFix={fix ? () => onChange(fix.patch) : undefined} fixLabel={fix?.label} />;
          })}
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
