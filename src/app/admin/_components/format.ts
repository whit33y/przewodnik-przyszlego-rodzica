import { formatDateShort } from "@/lib/format";

const dt = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** ISO timestamp → "21.11.2026, 21:30" (Warsaw time). */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dt.format(d);
}

export function formatIsoDay(iso: string | null | undefined): string {
  return iso ? formatDateShort(iso) : "—";
}

export const statusLabel = { draft: "Szkic", published: "Opublikowany", archived: "Zarchiwizowany" } as const;
export const statusTone = { draft: "info", published: "positive", archived: "neutral" } as const;

export const actionLabel: Record<string, string> = {
  login: "Logowanie",
  login_failed: "Nieudane logowanie",
  logout: "Wylogowanie",
  create_draft: "Nowy szkic",
  update_draft: "Zapis szkicu",
  regression: "Sprawdzenie na sprawach",
  publish: "Publikacja",
  archive: "Archiwizacja",
  reset: "Przywrócenie stanu ustawowego",
  seed: "Załadowanie danych",
};
