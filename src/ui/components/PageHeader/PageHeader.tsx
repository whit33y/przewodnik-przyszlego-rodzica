import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import s from "./PageHeader.module.css";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  display?: boolean;
  children?: ReactNode;
}

/** Exactly one h1 per page lives here. */
export function PageHeader({ eyebrow, title, lead, display, children }: PageHeaderProps) {
  return (
    <header className={s.header}>
      {eyebrow ? <p className={s.eyebrow}>{eyebrow}</p> : null}
      <h1 className={cx(display && s.display)}>{title}</h1>
      {lead ? <p className={s.lead}>{lead}</p> : null}
      {children}
    </header>
  );
}
