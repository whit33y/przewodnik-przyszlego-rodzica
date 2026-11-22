import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Backstop for the lint rule: the engine may only import its own files. */
describe("engine import boundary", () => {
  const root = path.resolve(__dirname, "../../src/engine");
  const files = fs.readdirSync(root, { recursive: true }).map(String).filter((f) => f.endsWith(".ts"));
  it("has source files", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`${f} uses only relative imports`, () => {
      const src = fs.readFileSync(path.join(root, f), "utf8");
      const specifiers = [
        ...[...src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
        ...[...src.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]),
        ...[...src.matchAll(/(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ];
      for (const spec of specifiers) expect(spec.startsWith("./") || spec.startsWith("../"), `${f} imports "${spec}"`).toBe(true);
      expect(src).not.toMatch(/Date\.now\(|Math\.random\(|new Date\(\)/);
    });
  }
});
