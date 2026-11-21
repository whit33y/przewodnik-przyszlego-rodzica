import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import s from "./Notice.module.css";

export type Tone = "info" | "positive" | "caution" | "negative" | "neutral";

export const toneIcon: Record<Tone, IconName> = {
  info: "info",
  positive: "check-circle",
  caution: "alert",
  negative: "x-circle",
  neutral: "minus-circle",
};

/** Words that carry the status so colour is never the only signal. */
export const toneWord: Record<Tone, string> = {
  info: "Informacja",
  positive: "Przysługuje",
  caution: "Uwaga",
  negative: "Nie przysługuje",
  neutral: "Nie dotyczy",
};

export interface NoticeProps {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "status" | "alert";
  icon?: IconName;
  className?: string;
  headingLevel?: 2 | 3 | 4 | "p";
}

export function Notice({ tone = "info", title, children, actions, role, icon, className, headingLevel = "p" }: NoticeProps) {
  const T = headingLevel === "p" ? "p" : (`h${headingLevel}` as const);
  return (
    <div className={cx(s.notice, s[tone], className)} role={role}>
      <Icon name={icon ?? toneIcon[tone]} className={s.icon} />
      <div className={s.body}>
        <T className={s.title}>{title}</T>
        {children ? <div className={s.content}>{children}</div> : null}
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
