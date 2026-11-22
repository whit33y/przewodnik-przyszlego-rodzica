import Link from "next/link";
import { Icon } from "@/ui/icons/Icon";
import s from "../Admin.module.css";

const links = [
  { href: "/admin", label: "Zestawy parametrów", key: "sets" },
  { href: "/admin/dziennik", label: "Dziennik zmian", key: "audit" },
] as const;

/** Static (prerenderable) admin sub-navigation. Logout is a plain form post: works without JavaScript. */
export function AdminNav({ current }: { current?: (typeof links)[number]["key"] }) {
  return (
    <nav className={s.nav} aria-label="Panel administracyjny">
      <span className={s.navTitle}>
        <Icon name="sliders" size={20} />
        Panel administracyjny
      </span>
      <ul className={s.navLinks}>
        {links.map((l) => (
          <li key={l.key}>
            <Link href={l.href} aria-current={current === l.key ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <form action="/api/v1/admin/logout" method="post" className={s.navEnd}>
        <button type="submit" className={s.linkButton}>
          Wyloguj z panelu
        </button>
      </form>
    </nav>
  );
}
