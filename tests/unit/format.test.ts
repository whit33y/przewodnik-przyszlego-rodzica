import { describe, expect, it } from "vitest";
import { formatDateLong, formatDuration, formatMoney } from "@/lib/format";

describe("format", () => {
  it("formats grosze as PLN", () => expect(formatMoney(690320).replace(/\s/g, " ")).toBe("6 903,20 zł"));
  it("formats long dates in Polish", () => expect(formatDateLong("2027-03-12")).toBe("12 marca 2027"));
  it("formats durations", () => {
    expect(formatDuration(140)).toBe("20 tygodni");
    expect(formatDuration(63)).toBe("9 tygodni");
    expect(formatDuration(15)).toBe("2 tygodnie i 1 dzień");
    expect(formatDuration(3)).toBe("3 dni");
    expect(formatDuration(7)).toBe("1 tydzień");
  });
});
