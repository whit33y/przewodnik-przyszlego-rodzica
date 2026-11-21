"use client";

import { useId } from "react";
import { Icon } from "@/ui/icons/Icon";
import s from "./Stepper.module.css";

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  hint?: string;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, step = 1, unit, hint, onChange }: StepperProps) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={s.wrap}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Mniej: ${label}`}>
          <Icon name="minus" size={20} />
        </button>
        <span className={s.value}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-describedby={hint ? `${id}-h` : undefined}
            onChange={(e) => {
              const v = Number(e.currentTarget.value);
              if (!Number.isNaN(v)) onChange(clamp(v));
            }}
          />
          <span className={s.unit}>{unit}</span>
        </span>
        <button type="button" className={s.btn} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Więcej: ${label}`}>
          <Icon name="plus" size={20} />
        </button>
      </div>
      {hint ? (
        <span id={`${id}-h`} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
