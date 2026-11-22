"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { formatParam, fromInput, toInput, unitSuffix } from "@/lib/param-units";
import type { FieldSpec, GroupId } from "@/server/params-schema";
import { Button } from "@/ui/components/Button/Button";
import { ChoiceGroup, DateInput, Field, Select, TextArea, TextInput } from "@/ui/components/Form/Form";
import { adminFetch } from "./client-api";
import s from "../Admin.module.css";

type Payload = Record<string, unknown> & { validFrom: string; label: string; sources: string[] };

export interface ParamFormProps {
  id: string;
  payload: Payload;
  /** The published set this draft would replace or follow (values shown beside inputs when different). */
  base: { label: string; payload: Record<string, unknown> } | null;
  fields: FieldSpec[];
  groups: readonly { id: GroupId; title: string }[];
}

const get = (obj: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);

function set(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys.at(-1)!] = value;
}

const HEADER_LABELS: Record<string, string> = { label: "Nazwa zestawu", validFrom: "Obowiązuje od", sources: "Źródła (Dz.U.)" };

export function ParamForm({ id, payload, base, fields, groups }: ParamFormProps) {
  const router = useRouter();
  const initial = useMemo(() => Object.fromEntries(fields.map((f) => [f.path, toInput(f.unit, get(payload, f.path))])), [fields, payload]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [label, setLabel] = useState(payload.label);
  const [validFrom, setValidFrom] = useState<string | null>(payload.validFrom);
  const [sources, setSources] = useState(payload.sources.join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Set<string>>(() => new Set(["rates"]));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "positive" | "negative"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const byGroup = useMemo(() => {
    const m = new Map<GroupId, FieldSpec[]>();
    for (const f of fields) m.set(f.group, [...(m.get(f.group) ?? []), f]);
    return m;
  }, [fields]);
  const labelOf = (path: string) => HEADER_LABELS[path.split(".")[0]] ?? fields.find((f) => f.path === path)?.label ?? path;

  function change(path: string, v: string) {
    setValues((cur) => ({ ...cur, [path]: v }));
    setDirty(true);
    setStatus(null);
  }

  function focusField(path: string) {
    const f = fields.find((x) => x.path === path);
    if (f) setOpen((cur) => new Set(cur).add(f.group));
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[name="${CSS.escape(path)}"], [name="${CSS.escape(path)}-d"]`);
      target?.focus();
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const next = structuredClone(payload) as Payload;
    for (const f of fields) {
      if (f.unit === "fixed") continue;
      const r = fromInput(f.unit, values[f.path] ?? "");
      if (r.ok) set(next, f.path, r.value);
      else errs[f.path] = r.error;
    }
    if (!validFrom) errs.validFrom = "Wpisz pełną, prawidłową datę wejścia w życie.";
    next.label = label;
    next.validFrom = validFrom ?? payload.validFrom;
    next.sources = sources.split("\n").map((x) => x.trim()).filter(Boolean);
    if (Object.keys(errs).length) {
      setErrors(errs);
      openErrorGroups(errs);
      setStatus(null);
      requestAnimationFrame(() => document.getElementById("bledy")?.focus());
      return;
    }
    setBusy(true);
    const r = await adminFetch<{ set: { payload: Payload } }>(`/api/v1/admin/params/${id}`, { method: "PUT", body: { payload: next } });
    setBusy(false);
    if (r.ok) {
      setErrors({});
      setDirty(false);
      setStatus({ tone: "positive", text: "Szkic zapisany." });
      router.refresh();
    } else {
      const fe = r.fields ?? {};
      setErrors(fe);
      openErrorGroups(fe);
      setStatus({ tone: "negative", text: r.message });
      if (Object.keys(fe).length) requestAnimationFrame(() => document.getElementById("bledy")?.focus());
    }
  }

  function openErrorGroups(errs: Record<string, string>) {
    const gs = new Set(open);
    for (const p of Object.keys(errs)) {
      const f = fields.find((x) => x.path === p);
      if (f) gs.add(f.group);
    }
    setOpen(gs);
  }

  const errorList = Object.entries(errors);
  const changedVsBase = (f: FieldSpec) => base && JSON.stringify(get(base.payload, f.path)) !== JSON.stringify(get(payload, f.path));

  return (
    <form onSubmit={save} noValidate className={s.stack}>
      {errorList.length ? (
        <div className={s.errorSummary} id="bledy" tabIndex={-1} role="alert" aria-labelledby="bledy-tytul">
          <h2 id="bledy-tytul">Popraw {errorList.length === 1 ? "1 pole" : `${errorList.length} pola`}</h2>
          <ul>
            {errorList.map(([path, msg]) => (
              <li key={path}>
                <button type="button" className={s.linkButton} onClick={() => focusField(path)}>
                  {labelOf(path)}: {msg}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section aria-labelledby="naglowek" className={s.stack}>
        <h2 id="naglowek">Dane zestawu</h2>
        <div className={s.header}>
          <Field label="Nazwa zestawu" error={errors.label}>
            {({ id: fid, describedBy, invalid }) => (
              <TextInput id={fid} name="label" value={label} onChange={(e) => (setLabel(e.currentTarget.value), setDirty(true))} aria-describedby={describedBy} aria-invalid={invalid || undefined} maxLength={120} />
            )}
          </Field>
          <DateInput
            legend="Obowiązuje od"
            hint="Zestaw obowiązuje od tej daty do dnia przed datą następnego opublikowanego zestawu. Kalkulator wybiera zestaw według daty porodu (albo rozpoczęcia urlopu)."
            name="validFrom"
            value={validFrom ?? undefined}
            error={errors.validFrom}
            onChange={(iso) => {
              setValidFrom(iso);
              setDirty(true);
            }}
          />
          <Field label="Źródła (Dz.U.)" hint="Jedno źródło w wierszu, np. UZ (Dz.U. 2026 poz. 854)." error={errors.sources ?? errors["sources.0"]}>
            {({ id: fid, describedBy, invalid }) => (
              <TextArea id={fid} name="sources" value={sources} onChange={(e) => (setSources(e.currentTarget.value), setDirty(true))} aria-describedby={describedBy} aria-invalid={invalid || undefined} rows={3} />
            )}
          </Field>
        </div>
      </section>

      <section aria-labelledby="parametry">
        <h2 id="parametry" style={{ marginBottom: 12 }}>
          Parametry
        </h2>
        {groups.map((g) => {
          const fs = byGroup.get(g.id) ?? [];
          const nErr = fs.filter((f) => errors[f.path]).length;
          const nChanged = fs.filter((f) => changedVsBase(f)).length;
          return (
            <details
              key={g.id}
              className={s.group}
              open={open.has(g.id)}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setOpen((cur) => {
                  if (cur.has(g.id) === isOpen) return cur;
                  const n = new Set(cur);
                  if (isOpen) n.add(g.id);
                  else n.delete(g.id);
                  return n;
                });
              }}
            >
              <summary>
                <span>{g.title}</span>
                <span className={s.groupMeta}>
                  {fs.length} {fs.length === 1 ? "pole" : fs.length < 5 ? "pola" : "pól"}
                  {nChanged ? ` · zmienione względem obowiązujących: ${nChanged}` : ""}
                </span>
                {nErr ? (
                  <span className={s.groupMeta} data-error="">
                    · błędy: {nErr}
                  </span>
                ) : null}
              </summary>
              <div className={s.groupBody}>
                {fs.map((f) => (
                  <FieldControl key={f.path} f={f} value={values[f.path] ?? ""} error={errors[f.path]} baseValue={base ? get(base.payload, f.path) : undefined} baseLabel={base?.label} onChange={(v) => change(f.path, v)} />
                ))}
              </div>
            </details>
          );
        })}
      </section>

      <div className={s.sticky}>
        <Button type="submit" loading={busy} disabled={busy} icon="check">
          Zapisz szkic
        </Button>
        <Link href={`/admin/parametry/${id}/porownanie`}>
          Porównaj i sprawdź na 86 sprawach →
        </Link>
        <span role="status" className={s.small}>
          {status ? (
            <strong style={{ color: status.tone === "positive" ? "var(--positive)" : "var(--negative)" }}>{status.text}</strong>
          ) : dirty ? (
            <span className={s.muted}>Masz niezapisane zmiany.</span>
          ) : null}
        </span>
      </div>
    </form>
  );
}

function FieldControl({ f, value, error, baseValue, baseLabel, onChange }: { f: FieldSpec; value: string; error?: string; baseValue: unknown; baseLabel?: string; onChange: (v: string) => void }) {
  const parsed = fromInput(f.unit, value);
  const differs = baseValue !== undefined && parsed.ok && JSON.stringify(parsed.value) !== JSON.stringify(baseValue);
  const meta = (
    <span className={s.meta}>
      {f.help ? <span>{f.help}</span> : null}
      {differs ? (
        <span className={s.changed}>
          Obowiązuje teraz ({baseLabel}): {formatParam(f.unit, baseValue, f.options)}
        </span>
      ) : null}
      {f.citation ? <span>Podstawa: {f.citation}</span> : null}
    </span>
  );

  if (f.unit === "interpretation" && f.readings) {
    return (
      <div className={s.wide}>
        <ChoiceGroup
          legend={f.label}
          hint={
            <>
              {f.readings.support}
              {f.citation ? ` Podstawa: ${f.citation}.` : ""}
              {differs ? ` Obowiązuje teraz: ${formatParam(f.unit, baseValue)}.` : ""}
            </>
          }
          name={f.path}
          error={error}
          value={value}
          onChange={(v) => onChange(v)}
          options={[
            { value: "true", label: "Tak", hint: f.readings.yes },
            { value: "false", label: "Nie", hint: f.readings.no },
          ]}
        />
      </div>
    );
  }
  if (f.unit === "bool") {
    return (
      <ChoiceGroup legend={f.label} hint={meta} name={f.path} error={error} value={value} onChange={(v) => onChange(v)} row options={[{ value: "true", label: "Tak" }, { value: "false", label: "Nie" }]} />
    );
  }
  if (f.unit === "enum") {
    return (
      <Field label={f.label} hint={meta} error={error}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name={f.path} value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    );
  }
  if (f.unit === "fixed") {
    return (
      <div className={s.stack} style={{ gap: 4 }}>
        <span className={s.small} style={{ fontWeight: 600 }}>
          {f.label}
        </span>
        <span className={s.fixedValue}>{value} (stała ustawowa, nieedytowalna)</span>
        {meta}
      </div>
    );
  }
  const suffix = unitSuffix[f.unit];
  const decimal = f.unit === "grosze" || f.unit === "bps";
  const label = (
    <>
      {f.label}
      {suffix ? <span className="visually-hidden"> (w jednostce: {suffix})</span> : null}
    </>
  );
  return (
    <Field label={label} hint={meta} error={error}>
      {({ id, describedBy, invalid }) => (
        <span className={s.unitInput}>
          <TextInput
            id={id}
            name={f.path}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            inputMode={decimal ? "decimal" : f.unit === "fraction" || f.unit === "dateOrNull" ? "text" : "numeric"}
            placeholder={f.unit === "dateOrNull" ? "RRRR-MM-DD" : undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoComplete="off"
          />
          {suffix ? (
            <span className={s.unit} aria-hidden="true">
              {suffix}
            </span>
          ) : null}
        </span>
      )}
    </Field>
  );
}
