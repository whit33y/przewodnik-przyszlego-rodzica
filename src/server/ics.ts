/**
 * iCalendar export of dated steps (RFC 5545). Titles only — no names, PESEL or amounts.
 * All-day VEVENT per dated step, VALARM three days before hard deadlines, stable UIDs.
 */
import { addDays } from "@/engine/dates";
import type { Step } from "./steps";

const CRLF = "\r\n";

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (UTF-8 aware), continuation lines start with a space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curLen + len > limit) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.join(`${CRLF} `);
}

const icsDate = (iso: string) => iso.replace(/-/g, "");

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(steps: Step[], now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Przewodnik Rodzica//Terminy//PL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Przewodnik Rodzica — terminy"];
  for (const s of steps) {
    if (!s.date || s.state === "notNeeded") continue;
    const uid = `${s.id.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+$/, "")}@przewodnik-rodzica`;
    // Alert titles can carry amounts ("Zaległość w składkach: 312,40 zł") — use the neutral fix label instead.
    const title = s.fix ? s.fix.label : s.title;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${icsDate(s.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(s.date, 1))}`,
      `SUMMARY:${escapeText(s.dateKind === "from" ? title : `${title}${s.hard ? " (termin)" : ""}`)}`,
      `DESCRIPTION:${escapeText("Szczegóły: Przewodnik Rodzica → Co i kiedy")}`,
      "TRANSP:TRANSPARENT",
    );
    if (s.hard && s.state === "todo") {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P3D", `DESCRIPTION:${escapeText(`Za 3 dni: ${title}`)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
