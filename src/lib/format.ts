/** Polish formatting helpers. Money is always carried in grosze (integers). */

const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2, useGrouping: "always" });
const plnWhole = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0, useGrouping: "always" });
const num = new Intl.NumberFormat("pl-PL", { useGrouping: "always" });

export function formatMoney(grosze: number, opts: { whole?: boolean } = {}): string {
  const zl = grosze / 100;
  return (opts.whole ? plnWhole : pln).format(zl);
}

export function formatNumber(n: number): string {
  return num.format(n);
}

const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

/** ISO date (YYYY-MM-DD) → "12 marca 2027". Pure string handling: no time zones involved. */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`;
}

/** ISO date → "12.03.2027". */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n === 1) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function formatDays(n: number): string {
  return `${formatNumber(n)} ${n === 1 ? "dzień" : "dni"}`;
}

export function formatWeeks(n: number): string {
  return `${formatNumber(n)} ${plural(n, "tydzień", "tygodnie", "tygodni")}`;
}

/** Days → "20 tygodni" when divisible by 7, else "20 tygodni i 3 dni". */
export function formatDuration(days: number): string {
  const w = Math.floor(days / 7);
  const d = days % 7;
  if (w === 0) return formatDays(d);
  if (d === 0) return formatWeeks(w);
  return `${formatWeeks(w)} i ${formatDays(d)}`;
}

export { plural };
