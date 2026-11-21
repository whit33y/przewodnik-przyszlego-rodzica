import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/ui/icons/Icon";

export interface TextLinkProps {
  href: string;
  external?: boolean;
  children: ReactNode;
  className?: string;
}

/** Always underlined. External links open in a new tab and say so to screen readers. */
export function TextLink({ href, external, children, className }: TextLinkProps) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <Icon name="external" size={16} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />
        <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
