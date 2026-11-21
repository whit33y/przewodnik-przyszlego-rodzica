import { formatDateLong, formatDateShort, formatDuration, formatMoney } from "@/lib/format";

export function Money({ value, whole }: { value: number; whole?: boolean }) {
  return <span className="tabular" style={{ whiteSpace: "nowrap" }}>{formatMoney(value, { whole })}</span>;
}

export function DateText({ value, short }: { value: string; short?: boolean }) {
  return <time dateTime={value} style={{ whiteSpace: "nowrap" }}>{short ? formatDateShort(value) : formatDateLong(value)}</time>;
}

export function Duration({ days }: { days: number }) {
  return <span style={{ whiteSpace: "nowrap" }}>{formatDuration(days)}</span>;
}
