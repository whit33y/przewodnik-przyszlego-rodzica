"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog } from "@/ui/components/Dialog/Dialog";
import { Icon } from "@/ui/icons/Icon";
import { appNav, secondaryNav, tabNav } from "./nav";
import { DrawerLinks, TabLinks } from "./NavLinks";
import s from "./Shell.module.css";

const MenuCtx = createContext<{ open: () => void }>({ open: () => {} });

/** Owns the single navigation drawer shared by the AppBar menu button and the TabBar "Więcej" tab. */
export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <MenuCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog title="Menu" open={isOpen} onOpenChange={setOpen}>
        <nav className={s.drawerNav} aria-label="Menu">
          <DrawerLinks items={[{ href: "/", label: "Start", icon: "home" }, ...appNav]} onNavigate={() => setOpen(false)} />
          <p className={s.drawerSection}>Więcej</p>
          <DrawerLinks items={secondaryNav} onNavigate={() => setOpen(false)} />
        </nav>
      </Dialog>
    </MenuCtx.Provider>
  );
}

export function MenuButton() {
  const { open } = useContext(MenuCtx);
  return (
    <button type="button" className={s.menuBtn} onClick={open} aria-label="Otwórz menu" aria-haspopup="dialog">
      <Icon name="menu" />
    </button>
  );
}

export function TabBar() {
  const { open } = useContext(MenuCtx);
  return (
    <nav className={s.tabbar} aria-label="Nawigacja dolna">
      <TabLinks items={tabNav} onMore={open} />
    </nav>
  );
}
