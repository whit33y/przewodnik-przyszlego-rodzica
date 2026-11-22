/**
 * Parameter-set selection and derived parameter values (plan 02 §5).
 * A set applies from its `validFrom` until the next set's `validFrom`.
 */
import { applyBps, netOfDeduction } from "./money";
import type { Grosze, ISODate, ParameterSet } from "./types";

export function sortSets(sets: ParameterSet[]): ParameterSet[] {
  return [...sets].sort((a, b) => (a.validFrom < b.validFrom ? -1 : a.validFrom > b.validFrom ? 1 : a.id.localeCompare(b.id)));
}

/** The set in force on `date`: the latest with validFrom ≤ date; before the first set, the earliest one. */
export function selectParameterSet(sets: ParameterSet[], date: ISODate): ParameterSet {
  if (sets.length === 0) throw new Error("selectParameterSet: no parameter sets");
  const sorted = sortSets(sets);
  let chosen = sorted[0];
  for (const s of sorted) if (s.validFrom <= date) chosen = s;
  return chosen;
}

/** Full-time employee floor (UZ art. 45): minimum wage net of social contributions. 2026: 4 147,10. */
export function employeeFloor(p: ParameterSet): Grosze {
  return netOfDeduction(p.wage.minimumWage, p.deductions.employeeSocialBps);
}

/** Standard minimum declared base for the self-employed: 60% of the forecast average wage. 2026: 5 652,00. */
export function nonEmployeeMinBase(p: ParameterSet): Grosze {
  return applyBps(p.wage.forecastAverageWage, p.base.nonEmployeeMinBasePctOfForecastBps);
}

/** Preferential ("mały ZUS" 0570) declared base: 30% of the minimum wage. 2026: 1 441,80. */
export function preferentialBase(p: ParameterSet): Grosze {
  return applyBps(p.wage.minimumWage, p.base.preferentialBasePctOfMinWageBps);
}

/** Cap of the voluntary sickness contribution base: 250% of the forecast average wage. 2026: 23 550,00. */
export function voluntaryCap(p: ParameterSet): Grosze {
  return applyBps(p.wage.forecastAverageWage, p.base.voluntaryCapPctOfForecastBps);
}

/** Benefit-base cap after the title ended (UZ art. 46): 100% of the average wage (forecast as proxy). */
export function afterTitleCap(p: ParameterSet): Grosze {
  return applyBps(p.wage.forecastAverageWage, p.base.afterTitleCapPctOfForecastBps);
}

/** Arrears threshold (UZ art. 2a): 1% of the minimum wage. 2026: 48,06; 2025: 46,66. */
export function arrearsThreshold(p: ParameterSet): Grosze {
  return applyBps(p.wage.minimumWage, p.arrears.thresholdPctOfMinWageBps);
}
