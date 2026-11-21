import { describe, expect, it } from "vitest";
import { addDays, addMonths, ageInYears, dayBeforeBirthday, daysInclusive, diffDays, endOfYear, isLeapYear, isValidDate, periodEnd, splitByMonth, weeksToDays } from "@/engine/dates";
import { dailyBenefit, divRoundHalfUp, monthlyBenefit, netOfDeduction, pitAdvance } from "@/engine/money";
import { arrearsThreshold, employeeFloor, nonEmployeeMinBase, preferentialBase, selectParameterSet, voluntaryCap } from "@/engine/params";
import { birth, employee, person, run, sets, p2026 } from "./helpers";

describe("dates", () => {
  it("inclusive ranges", () => {
    expect(periodEnd("2026-06-15", 140)).toBe("2026-11-01");
    expect(daysInclusive("2026-06-15", "2026-11-01")).toBe(140);
    expect(daysInclusive("2026-06-15", "2026-06-15")).toBe(1);
    expect(daysInclusive("2026-06-16", "2026-06-15")).toBe(0);
    expect(diffDays("2026-01-01", "2026-12-31")).toBe(364);
  });
  it("adds months with clamping and handles leap years", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-09-20", 6)).toBe("2027-03-20");
    expect(addMonths("2026-03-15", -15)).toBe("2024-12-15");
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(isValidDate("2026-02-29")).toBe(false);
  });
  it("end of year, birthdays, weeks", () => {
    expect(endOfYear(2032)).toBe("2032-12-31");
    expect(dayBeforeBirthday("2020-03-10", 7)).toBe("2027-03-09");
    expect(ageInYears("2020-03-10", "2027-03-09")).toBe(6);
    expect(ageInYears("2020-03-10", "2027-03-10")).toBe(7);
    expect(weeksToDays(20)).toBe(140);
  });
  it("splits a range by calendar month", () => {
    expect(splitByMonth("2026-06-03", "2026-08-02")).toEqual([
      { month: "2026-06", from: "2026-06-03", to: "2026-06-30", days: 28 },
      { month: "2026-07", from: "2026-07-01", to: "2026-07-31", days: 31 },
      { month: "2026-08", from: "2026-08-01", to: "2026-08-02", days: 2 },
    ]);
  });
});

describe("money", () => {
  it("rounds half up", () => {
    expect(divRoundHalfUp(5, 2)).toBe(3);
    expect(divRoundHalfUp(4, 3)).toBe(1);
    expect(divRoundHalfUp(-5, 2)).toBe(-3);
  });
  it("net factor 0.8629 with half-up rounding", () => {
    expect(netOfDeduction(565200, 1371)).toBe(487711);
    expect(netOfDeduction(2355000, 1371)).toBe(2032130);
    expect(netOfDeduction(480600, 1371)).toBe(414710);
  });
  it("daily and monthly benefits", () => {
    expect(dailyBenefit(560885, 8150)).toBe(15237);
    expect(dailyBenefit(487711, 8150)).toBe(13249);
    expect(dailyBenefit(434411, 7000)).toBe(10136);
    expect(monthlyBenefit(690320, 7000, 5000)).toBe(241612);
  });
  it("PIT advance to full złoty", () => {
    expect(pitAdvance(20272, 1200, true)).toBe(2400);
    expect(pitAdvance(314216, 1200, true)).toBe(37700);
  });
});

describe("parameter sets", () => {
  it("selects by validFrom boundaries", () => {
    expect(selectParameterSet(sets, "2023-06-01").id).toBe("2024-01-01");
    expect(selectParameterSet(sets, "2024-06-30").id).toBe("2024-01-01");
    expect(selectParameterSet(sets, "2024-07-01").id).toBe("2024-07-01");
    expect(selectParameterSet(sets, "2025-03-18").id).toBe("2025-01-01");
    expect(selectParameterSet(sets, "2025-03-19").id).toBe("2025-03-19");
    expect(selectParameterSet(sets, "2027-05-01").id).toBe("2026-01-01");
  });
  it("is independent of input order", () => {
    expect(selectParameterSet([...sets].reverse(), "2025-06-01").id).toBe("2025-03-19");
  });
  it("derived 2026 values", () => {
    expect(employeeFloor(p2026)).toBe(414710);
    expect(nonEmployeeMinBase(p2026)).toBe(565200);
    expect(netOfDeduction(nonEmployeeMinBase(p2026), 1371)).toBe(487711);
    expect(preferentialBase(p2026)).toBe(144180);
    expect(netOfDeduction(preferentialBase(p2026), 1371)).toBe(124413);
    expect(voluntaryCap(p2026)).toBe(2355000);
    expect(netOfDeduction(voluntaryCap(p2026), 1371)).toBe(2032130);
    expect(arrearsThreshold(p2026)).toBe(4806);
  });
  it("historic values: 2024 floor 3 660,42; 2025 threshold 46,66 and preferential 1 399,80", () => {
    expect(employeeFloor(selectParameterSet(sets, "2024-03-01"))).toBe(366042);
    expect(arrearsThreshold(selectParameterSet(sets, "2025-09-25"))).toBe(4666);
    expect(preferentialBase(selectParameterSet(sets, "2025-05-01"))).toBe(139980);
  });
  it("parameterDate overrides the selection", () => {
    const facts = birth({ asOf: "2026-06-20", date: "2026-06-15", claimant: person([employee({ from: "2020-01-01" })]), parameterDate: "2024-03-01" });
    const r = run(facts);
    expect(r.parameterSetId).toBe("2024-01-01");
    expect(r.bases[0].base).toBe(366042); // floor with the 2024 minimum wage
  });
});
