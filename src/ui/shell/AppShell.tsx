import Link from "next/link";
import type { ReactNode } from "react";
import { appNav, desktopSecondaryNav, footerLinks } from "./nav";
import { DesktopNav } from "./NavLinks";
import { MenuButton, MobileNavProvider, TabBar } from "./MobileNav";
import s from "./Shell.module.css";

export function Brand() {
  return (
    <Link href="/" className={s.brand}>
      <span className={s.brandName}>
        Przewodnik <em>Rodzica</em>
      </span>
      <span className={s.rule} aria-hidden="true" />
      <span className={s.brandSub}>
        Zasiłki i urlopy
        <br />w ciąży i po porodzie
      </span>
      <span className="visually-hidden"> — strona główna</span>
    </Link>
  );
}

/** Static shell: prerendered. Only `userSlot` (wrapped in Suspense by the caller) depends on the request. */
export function AppShell({ children, userSlot }: { children: ReactNode; userSlot?: ReactNode }) {
  return (
    <MobileNavProvider>
      <a href="#tresc" className={s.skip}>
        Przejdź do treści
      </a>
      <header className={s.header}>
        <div className={s.bar}>
          <MenuButton />
          <Brand />
          <span className={s.spacer} />
          <div className={s.user}>{userSlot}</div>
        </div>
        <DesktopNav items={appNav} secondary={desktopSecondaryNav} />
      </header>
      <main id="tresc" className={s.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <ul className={s.footerLinks}>
            {footerLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <p>
            Projekt konkursowy HackNation 2026 dla ZUS. Logowanie i pobieranie danych z rejestrów państwowych są <strong>symulowane</strong> — serwis nie łączy się z prawdziwymi systemami i nie
            przetwarza prawdziwych danych osobowych. Wyliczenia mają charakter informacyjny; wiążącą decyzję wydaje ZUS lub płatnik składek.
          </p>
        </div>
      </footer>
      <TabBar />
    </MobileNavProvider>
  );
}
