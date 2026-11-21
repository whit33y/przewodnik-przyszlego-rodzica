/**
 * Calendar arithmetic on ISO days ('YYYY-MM-DD') via UTC day numbers. No clock access, no time zones.
 * Periods are inclusive: a period of n days starting on `from` ends on `from + n − 1`.
 */
import type { ISODate, YearMonth } from "./types";

const MS_PER_DAY = 86_400_000;

function parts(d: ISODate): [number, number, number] {
  const [y, m, day] = d.split("-").map(Number);
  return [y, m, day];
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Day number (days since 1970-01-01). */
export function toDay(d: ISODate): number {
  const [y, m, day] = parts(d);
  return Math.round(Date.UTC(y, m - 1, day) / MS_PER_DAY);
}

export function fromDay(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function isValidDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return fromDay(toDay(d)) === d;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromDay(toDay(d) + n);
}

/** b − a in days (0 when equal). */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDay(b) - toDay(a);
}

/** Number of days in the inclusive range [from, to]; 0 when to < from. */
export function daysInclusive(from: ISODate, to: ISODate): number {
  return Math.max(0, diffDays(from, to) + 1);
}

/** Last day of an inclusive period of `days` days. */
export function periodEnd(from: ISODate, days: number): ISODate {
  return addDays(from, days - 1);
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** Calendar month arithmetic; the day is clamped to the target month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = parts(d);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${pad(ny, 4)}-${pad(nm)}-${pad(Math.min(day, daysInMonth(ny, nm)))}`;
}

export function addYears(d: ISODate, n: number): ISODate {
  return addMonths(d, n * 12);
}

export function endOfYear(year: number): ISODate {
  return `${pad(year, 4)}-12-31`;
}

export function yearOf(d: ISODate): number {
  return parts(d)[0];
}

export function yearMonth(d: ISODate): YearMonth {
  return d.slice(0, 7);
}

export function monthStart(ym: YearMonth): ISODate {
  return `${ym}-01`;
}

export function monthEnd(ym: YearMonth): ISODate {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(daysInMonth(y, m))}`;
}

export function daysInYearMonth(ym: YearMonth): number {
  const [y, m] = ym.split("-").map(Number);
  return daysInMonth(y, m);
}

/** Shift a YYYY-MM by n months. */
export function addYearMonths(ym: YearMonth, n: number): YearMonth {
  return addMonths(`${ym}-01`, n).slice(0, 7);
}

export function weeksToDays(weeks: number): number {
  return weeks * 7;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** True when d ∈ [from, to] (to open-ended when undefined). */
export function within(d: ISODate, from: ISODate, to?: ISODate): boolean {
  return d >= from && (to === undefined || d <= to);
}

/** Overlap of two inclusive ranges in days. */
export function overlapDays(aFrom: ISODate, aTo: ISODate, bFrom: ISODate, bTo: ISODate): number {
  return daysInclusive(maxDate(aFrom, bFrom), minDate(aTo, bTo));
}

/** Split an inclusive range into calendar-month slices. */
export function splitByMonth(from: ISODate, to: ISODate): { month: YearMonth; from: ISODate; to: ISODate; days: number }[] {
  const out: { month: YearMonth; from: ISODate; to: ISODate; days: number }[] = [];
  let cur = from;
  while (cur <= to) {
    const ym = yearMonth(cur);
    const end = minDate(monthEnd(ym), to);
    out.push({ month: ym, from: cur, to: end, days: daysInclusive(cur, end) });
    cur = addDays(end, 1);
  }
  return out;
}

/** Day before the n-th birthday ("until the child turns n"). */
export function dayBeforeBirthday(birthDate: ISODate, years: number): ISODate {
  return addDays(addYears(birthDate, years), -1);
}

/** Completed years of age on a date. */
export function ageInYears(birthDate: ISODate, on: ISODate): number {
  let age = yearOf(on) - yearOf(birthDate);
  if (addYears(birthDate, age) > on) age--;
  return age;
}
