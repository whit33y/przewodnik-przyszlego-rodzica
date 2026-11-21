import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import s from "./Button.module.css";

type Variant = "primary" | "secondary" | "text" | "danger" | "onDark" | "onDarkOutline";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  iconAfter?: IconName;
  loading?: boolean;
  /** Primary buttons are uppercase (gov.pl). Set false when the label contains a brand name such as mObywatel. */
  uppercase?: boolean;
  children: ReactNode;
  className?: string;
}

export type ButtonProps = CommonProps &
  (
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ href: string; external?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>)
  );

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", block, icon, iconAfter, loading, uppercase = true, children, className, ...rest } = props;
  const cls = cx(s.btn, s[variant], size !== "md" && s[size], block && s.block, !uppercase && s.keepCase, className);
  const content = (
    <>
      {loading ? <span className={s.spinner} aria-hidden="true" /> : icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span>
      {iconAfter ? <Icon name={iconAfter} size={20} /> : null}
    </>
  );
  if ("href" in rest && rest.href !== undefined) {
    const { href, external, ...anchor } = rest as { href: string; external?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>;
    if (external) {
      return (
        <a className={cls} href={href} target="_blank" rel="noopener noreferrer" {...anchor}>
          {content}
          <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
        </a>
      );
    }
    return (
      <Link className={cls} href={href} {...anchor}>
        {content}
      </Link>
    );
  }
  const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} type={button.type ?? "button"} aria-busy={loading || undefined} {...button}>
      {content}
    </button>
  );
}
