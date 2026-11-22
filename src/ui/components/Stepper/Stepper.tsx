"use client";

import { useId, useState } from "react";
import { Icon } from "@/ui/icons/Icon";
import s from "./Stepper.module.css";

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Unit word, e.g. "tygodni". Part of the accessible description and of the live announcement. */
  unit: string;
  hint?: string;
  /** Extra ids (e.g. an error message) to describe the input. */
  describedBy?: string;
  onChange: (value: number) => void;
}

/** Number input with −/+ buttons. Typing is free; the value is clamped on blur or Enter. */
export function Stepper({ label, value, min, max, step = 1, unit, hint, describedBy, onChange }: StepperProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);
  const [announce, setAnnounce] = useState("");
  if (synced !== value) {
    // Parent changed the value (e.g. engine correction): re-seed the draft during render.
    setSynced(value);
    setDraft(String(value));
  }
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = (v: number, speak = false) => {
    const next = clamp(v);
    setDraft(String(next));
    if (next !== value) onChange(next);
    if (speak) setAnnounce(`${label}: ${next} ${unit}`);
  };
  return (
    <div className={s.wrap}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={() => commit(value - step, true)} disabled={value <= min} aria-label={`Mniej — ${label}`}>
          <Icon name="minus" size={20} />
        </button>
        <span className={s.value}>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            aria-describedby={`${id}-u${hint ? ` ${id}-h` : ""}${describedBy ? ` ${describedBy}` : ""}`}
            onChange={(e) => setDraft(e.currentTarget.value.replace(/[^\d]/g, ""))}
            onBlur={() => commit(Number(draft || min))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(Number(draft || min));
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                commit(value + (e.key === "ArrowUp" ? step : -step), true);
              }
            }}
          />
          <span className={s.unit} id={`${id}-u`}>
            {unit}
          </span>
        </span>
        <button type="button" className={s.btn} onClick={() => commit(value + step, true)} disabled={value >= max} aria-label={`Więcej — ${label}`}>
          <Icon name="plus" size={20} />
        </button>
      </div>
      {hint ? (
        <span id={`${id}-h`} className={s.hint}>
          {hint}
        </span>
      ) : null}
      <span className="visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
