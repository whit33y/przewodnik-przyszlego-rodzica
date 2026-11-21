import type { ReactNode } from "react";
import s from "./DataRow.module.css";

export interface DataRowProps {
  label: ReactNode;
  value: ReactNode;
  source?: ReactNode;
  action?: ReactNode;
}

export function DataList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <dl className={s.list} aria-label={label}>
      {children}
    </dl>
  );
}

/** One sourced datum: label, value, where it came from, optional correction action. */
export function DataRow({ label, value, source, action }: DataRowProps) {
  return (
    <div className={s.row}>
      <dt className={s.label}>{label}</dt>
      <dd className={s.value}>{value}</dd>
      {source ? <dd className={s.source}>{source}</dd> : null}
      {action ? <dd className={s.action}>{action}</dd> : null}
    </div>
  );
}
