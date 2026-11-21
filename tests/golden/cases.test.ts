/** Golden cases (plan 02 §8): every fixture must match on all asserted fields; variants run the same way. */
import { afterAll, describe, expect, it } from "vitest";
import { loadCases, loadParams } from "./load";
import { runCase, writeReport } from "./report";

const sets = loadParams();
const cases = loadCases();

describe("golden cases", () => {
  it("loads fixtures", () => expect(cases.length).toBeGreaterThan(0));
  describe.each(cases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const run = runCase(c, sets);
    it("evaluates without error", () => expect(run.error).toBeUndefined());
    it("matches every asserted field", () => {
      expect(run.fields.filter((f) => f.status === "mismatch")).toEqual([]);
    });
    for (const v of run.variants) {
      it(`variant ${v.name}`, () => expect(v.fields.filter((f) => f.status === "mismatch")).toEqual([]));
    }
  });
  afterAll(() => {
    writeReport();
  });
});
