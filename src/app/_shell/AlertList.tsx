import type { Alert } from "@/engine/types";
import { alertText, fixHref, fixLabel } from "@/content/pl";
import { formatDateLong, formatMoney } from "@/lib/format";
import { Button } from "@/ui/components/Button/Button";
import { Notice, type Tone } from "@/ui/components/Notice/Notice";

const severityRank = { blocking: 0, high: 1, warning: 2, info: 3 } as const;
const severityTone: Record<Alert["severity"], Tone> = { blocking: "negative", high: "caution", warning: "caution", info: "info" };
const severityWord: Record<Alert["severity"], string> = { blocking: "Pilne", high: "Ważne", warning: "Uwaga", info: "Informacja" };

/** Turns engine values into display strings (money in grosze, ISO dates). */
export function alertValues(a: Alert): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(a.values ?? {})) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = formatDateLong(v);
    else if (typeof v === "number" && /amount|threshold|base|gross|net/i.test(k)) out[k] = formatMoney(v);
    else out[k] = v;
  }
  if (a.deadline) out.deadline = formatDateLong(a.deadline);
  if (a.onDate) out.onDate = formatDateLong(a.onDate);
  return out;
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
}

export function AlertList({ alerts, headingLevel = 3 }: { alerts: Alert[]; headingLevel?: 2 | 3 | 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sortAlerts(alerts).map((a, i) => {
        const copy = alertText(a.code, alertValues(a));
        return (
          <Notice
            key={`${a.code}-${i}`}
            tone={severityTone[a.severity]}
            headingLevel={headingLevel}
            hideToneWord
            title={
              <>
                <span className="visually-hidden">{severityWord[a.severity]}: </span>
                {copy.title}
              </>
            }
            actions={
              a.fix ? (
                <>
                  {fixHref[a.fix.action] ? (
                    <Button href={fixHref[a.fix.action]!} size="sm" variant="secondary">
                      {fixLabel[a.fix.action]}
                    </Button>
                  ) : (
                    <strong>{fixLabel[a.fix.action]}</strong>
                  )}
                  {a.fix.byDate || a.deadline ? <span>do {formatDateLong((a.fix.byDate ?? a.deadline)!)}</span> : null}
                </>
              ) : null
            }
          >
            <p>{copy.body}</p>
          </Notice>
        );
      })}
    </div>
  );
}
