"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";
import { Icon } from "@/ui/icons/Icon";
import s from "./Shell.module.css";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav({ items, secondary = [] }: { items: NavItem[]; secondary?: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className={s.nav} aria-label="Główna nawigacja">
      <div className={s.navInner}>
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={s.navLink} aria-current={isActive(pathname, it.href) ? "page" : undefined}>
            {it.label}
          </Link>
        ))}
        <span className={s.navSpacer} />
        {secondary.map((it) => (
          <Link key={it.href} href={it.href} className={`${s.navLink} ${s.navLinkSecondary}`} aria-current={isActive(pathname, it.href) ? "page" : undefined}>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function DrawerLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={s.drawerLink} aria-current={isActive(pathname, it.href) ? "page" : undefined} onClick={onNavigate}>
          <Icon name={it.icon} />
          {it.label}
        </Link>
      ))}
    </>
  );
}

export function TabLinks({ items, onMore }: { items: NavItem[]; onMore: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={s.tab} aria-current={isActive(pathname, it.href) ? "page" : undefined}>
          <Icon name={it.icon} />
          {it.short ?? it.label}
        </Link>
      ))}
      <button type="button" className={s.tab} onClick={onMore} aria-haspopup="dialog">
        <Icon name="menu" />
        Więcej
      </button>
    </>
  );
}
