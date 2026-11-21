import type { ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";
import s from "./Card.module.css";

export interface CardProps {
  as?: ElementType;
  heading?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  aside?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "alt";
  compact?: boolean;
  /** Whole card becomes clickable through its first link (stretched link pattern). */
  linkCard?: boolean;
  className?: string;
  children?: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
}

export function Card({ as: As = "section", heading, headingLevel = 2, aside, footer, tone = "default", compact, linkCard, className, children, ...rest }: CardProps) {
  const H = `h${headingLevel}` as ElementType;
  return (
    <As className={cx(s.card, tone === "alt" && s.alt, compact && s.compact, linkCard && s.link, className)} {...rest}>
      {heading || aside ? (
        <div className={s.head}>
          {heading ? <H>{heading}</H> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
      {footer ? <div className={s.footer}>{footer}</div> : null}
    </As>
  );
}
