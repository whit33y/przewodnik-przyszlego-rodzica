import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "@/ui/icons/Icon";
import s from "./Form.module.css";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Render-prop receives the ids needed to wire accessibility attributes. */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, optional, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx(s.field, className)}>
      <label className={s.label} htmlFor={id}>
        {label}
        {optional ? <span className={s.optional}> (opcjonalnie)</span> : null}
      </label>
      {hint ? (
        <span id={hintId} className={s.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errId} className={s.error}>
          <Icon name="x-circle" size={18} />
          <span className="visually-hidden">Błąd: </span>
          {error}
        </span>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(s.input, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(s.input, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(s.select, className)} {...props}>
      {children}
    </select>
  );
}

export interface ChoiceOption<V extends string> {
  value: V;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

export interface ChoiceGroupProps<V extends string> {
  legend: ReactNode;
  hint?: ReactNode;
  name: string;
  type?: "radio" | "checkbox";
  options: ChoiceOption<V>[];
  value?: V | V[];
  defaultValue?: V | V[];
  onChange?: (value: V, checked: boolean) => void;
  row?: boolean;
  plain?: boolean;
  error?: ReactNode;
}

/** Radio group or checkbox list in gov.pl style: large tiles with visible selection. */
export function ChoiceGroup<V extends string>({ legend, hint, name, type = "radio", options, value, defaultValue, onChange, row, plain, error }: ChoiceGroupProps<V>) {
  const id = useId();
  const is = (v: V, src?: V | V[]) => (Array.isArray(src) ? src.includes(v) : src === v);
  return (
    <fieldset className={s.field} aria-describedby={[hint ? `${id}-h` : "", error ? `${id}-e` : ""].join(" ").trim() || undefined}>
      <legend className={s.label}>{legend}</legend>
      {hint ? (
        <span id={`${id}-h`} className={s.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-e`} className={s.error}>
          <Icon name="x-circle" size={18} />
          <span className="visually-hidden">Błąd: </span>
          {error}
        </span>
      ) : null}
      <div className={cx(s.choices, row && s.choicesRow)}>
        {options.map((o) => (
          <label key={o.value} className={cx(s.choice, plain && s.plain)}>
            <input
              type={type}
              name={name}
              value={o.value}
              disabled={o.disabled}
              checked={value !== undefined ? is(o.value, value) : undefined}
              defaultChecked={defaultValue !== undefined ? is(o.value, defaultValue) : undefined}
              onChange={onChange ? (e) => onChange(o.value, e.currentTarget.checked) : undefined}
            />
            <span className={s.choiceText}>
              <span className={s.choiceLabel}>{o.label}</span>
              {o.hint ? <span className={s.choiceHint}>{o.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface DateInputProps {
  legend: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  name: string;
  /** ISO YYYY-MM-DD */
  value?: string;
  onChange?: (iso: string | null) => void;
}

/** Three text fields (day, month, year) — the gov.pl/GOV.UK pattern, robust for keyboard and screen readers. */
export function DateInput({ legend, hint, error, name, value, onChange }: DateInputProps) {
  const id = useId();
  const [y = "", m = "", d = ""] = value ? value.split("-") : [];
  function emit(part: "d" | "m" | "y", v: string, form: HTMLElement | null) {
    if (!onChange || !form) return;
    const get = (p: string) => (form.querySelector(`[data-part="${p}"]`) as HTMLInputElement | null)?.value ?? "";
    const dd = part === "d" ? v : get("d");
    const mm = part === "m" ? v : get("m");
    const yy = part === "y" ? v : get("y");
    if (/^\d{1,2}$/.test(dd) && /^\d{1,2}$/.test(mm) && /^\d{4}$/.test(yy)) {
      const iso = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      const dt = new Date(`${iso}T00:00:00Z`);
      onChange(!Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso ? iso : null);
    } else onChange(null);
  }
  return (
    <fieldset className={s.field} aria-describedby={[hint ? `${id}-h` : "", error ? `${id}-e` : ""].join(" ").trim() || undefined}>
      <legend className={s.label}>{legend}</legend>
      {hint ? (
        <span id={`${id}-h`} className={s.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-e`} className={s.error}>
          <Icon name="x-circle" size={18} />
          <span className="visually-hidden">Błąd: </span>
          {error}
        </span>
      ) : null}
      <div className={s.date} key={value ?? "empty"}>
        {(
          [
            ["d", "Dzień", d, s.dd, 2],
            ["m", "Miesiąc", m, s.mm, 2],
            ["y", "Rok", y, s.yyyy, 4],
          ] as const
        ).map(([part, lab, val, cls, len]) => (
          <label key={part}>
            {lab}
            <input
              className={cx(s.input, cls)}
              inputMode="numeric"
              maxLength={len}
              name={`${name}-${part}`}
              data-part={part}
              defaultValue={val}
              aria-invalid={error ? true : undefined}
              aria-describedby={part === "d" ? [hint ? `${id}-h` : "", error ? `${id}-e` : ""].join(" ").trim() || undefined : undefined}
              autoComplete="off"
              onChange={(e) => emit(part, e.currentTarget.value, e.currentTarget.closest("fieldset"))}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
