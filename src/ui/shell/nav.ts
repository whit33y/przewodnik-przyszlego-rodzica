import type { IconName } from "@/ui/icons/Icon";

export interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: IconName;
}

/** Primary navigation for a logged-in (or manual-mode) parent. */
export const appNav: NavItem[] = [
  { href: "/sytuacja", label: "Twoja sytuacja", short: "Sytuacja", icon: "user" },
  { href: "/uprawnienia", label: "Uprawnienia", icon: "shield" },
  { href: "/plan", label: "Plan rodzicielski", short: "Plan", icon: "timeline" },
  { href: "/kroki", label: "Co i kiedy", short: "Kroki", icon: "steps" },
  { href: "/wnioski", label: "Wnioski", icon: "document" },
];

export const secondaryNav: NavItem[] = [
  { href: "/planuje-dziecko", label: "Planuję dziecko", icon: "heart" },
  { href: "/trudna-sytuacja", label: "Trudna sytuacja", icon: "help" },
  { href: "/wsparcie", label: "Wsparcie i organizacje", icon: "users" },
  { href: "/sprawy", label: "Sprawdź przykładową sprawę", icon: "search" },
  { href: "/o-serwisie", label: "O serwisie", icon: "info" },
];

export const tabNav: NavItem[] = [
  { href: "/", label: "Start", icon: "home" },
  { href: "/uprawnienia", label: "Uprawnienia", icon: "shield" },
  { href: "/plan", label: "Plan", icon: "timeline" },
  { href: "/kroki", label: "Kroki", icon: "steps" },
];

export const footerLinks = [
  { href: "/o-serwisie", label: "O serwisie" },
  { href: "/dostepnosc", label: "Deklaracja dostępności" },
  { href: "/sprawy", label: "Przykładowe sprawy (dla jury)" },
  { href: "/admin", label: "Panel administracyjny" },
];
