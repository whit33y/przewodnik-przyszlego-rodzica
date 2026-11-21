/**
 * Integer money arithmetic: grosze, basis points (10000 = 100%), half-up rounding.
 * All products stay well inside Number.MAX_SAFE_INTEGER for realistic amounts (base ≤ 10^8 gr × 10^8).
 */
import type { Bps, Fraction, Grosze } from "./types";

/** round(a / b) half-up, for integers a and b > 0 (negative a rounds symmetrically). */
export function divRoundHalfUp(a: number, b: number): number {
  if (b <= 0) throw new Error("divRoundHalfUp: divisor must be positive");
  if (a < 0) return -divRoundHalfUp(-a, b);
  return Math.floor((2 * a + b) / (2 * b));
}

/** amount × bps / 10000, half-up. */
export function applyBps(amount: Grosze, bps: Bps): Grosze {
  return divRoundHalfUp(amount * bps, 10000);
}

/**
 * Income after the employee-financed social contributions (UZ art. 3 pkt 3–4):
 * round½up(gross × (10000 − deductionBps) / 10000). 4 806,00 → 4 147,10; 23 550,00 → 20 321,30.
 */
export function netOfDeduction(gross: Grosze, deductionBps: Bps): Grosze {
  return divRoundHalfUp(gross * (10000 - deductionBps), 10000);
}

/**
 * Daily benefit (UZ art. 36 ust. 3 via art. 47; §3.4): round½up(base × rate × (1 − work) / 30).
 * One rounding step: base 6 903,20 at 70% → 161,07; 5 608,85 at 81,5% → 152,37.
 */
export function dailyBenefit(base: Grosze, rateBps: Bps, workReductionBps: Bps = 0, monthDays = 30): Grosze {
  return divRoundHalfUp(base * rateBps * (10000 - workReductionBps), 10000 * 10000 * monthDays);
}

/** Monthly benefit for 30 days at a rate (and work reduction), rounded once. */
export function monthlyBenefit(base: Grosze, rateBps: Bps, workReductionBps: Bps = 0): Grosze {
  return divRoundHalfUp(base * rateBps * (10000 - workReductionBps), 10000 * 10000);
}

/** PIT advance on a gross amount, rounded half-up to full złoty when requested. 202,72 → 24 zł. */
export function pitAdvance(gross: Grosze, pitBps: Bps, roundToFullZloty: boolean): Grosze {
  if (roundToFullZloty) return divRoundHalfUp(gross * pitBps, 10000 * 100) * 100;
  return applyBps(gross, pitBps);
}

export function fractionToBps(f: Fraction): Bps {
  return divRoundHalfUp(f.num * 10000, f.den);
}

export function compareFractions(a: Fraction, b: Fraction): number {
  return a.num * b.den - b.num * a.den;
}

/** floor(n × f) for a non-negative integer n. */
export function floorTimes(n: number, f: Fraction): number {
  return Math.floor((n * f.num) / f.den);
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
