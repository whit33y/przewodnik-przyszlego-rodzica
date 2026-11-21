import { Icon } from "@/ui/icons/Icon";
import s from "./Sim.module.css";

/** Persistent strip on simulated government screens — this is never a real login page. */
export function SimBanner({ text = "To jest symulacja logowania na potrzeby demonstracji. Nie podawaj prawdziwych danych." }: { text?: string }) {
  return (
    <div className={s.banner} role="note">
      <Icon name="alert" size={18} />
      <span>
        <strong>SYMULACJA</strong> · {text}
      </span>
    </div>
  );
}

export function SimBadge({ label = "Symulacja" }: { label?: string }) {
  return <span className={s.badge}>{label}</span>;
}
