import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "@/ui/icons/Icon";
import s from "./Steps.module.css";

export interface StepItem {
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  state: "done" | "current" | "todo";
}

const stateText = { done: "zrobione", current: "w toku", todo: "do zrobienia" } as const;

export function Steps({ items, label }: { items: StepItem[]; label?: string }) {
  return (
    <ol className={s.list} aria-label={label}>
      {items.map((it, i) => (
        <li key={i} className={cx(s.item, s[it.state])} aria-current={it.state === "current" ? "step" : undefined}>
          <span className={s.dot} aria-hidden="true">
            {it.state === "done" ? <Icon name="check" size={16} /> : null}
          </span>
          <span className={s.text}>
            <span className={s.title}>
              {it.title}
              <span className="visually-hidden"> ({stateText[it.state]})</span>
            </span>
            {it.meta ? <span className={s.meta}>{it.meta}</span> : null}
            {it.body ? <span className={s.body}>{it.body}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
