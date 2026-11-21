/**
 * Golden-case loader: every data/cases/<id>/{input,expected}.json pair (folders starting with "_" are skipped),
 * validated against the fixture schema, plus all parameter sets from data/params.
 */
import fs from "node:fs";
import path from "node:path";
import { caseExpectedSchema, caseInputSchema } from "@/integrations/case-schema";
import type { CaseExpected, CaseInput, ParameterSet } from "@/engine";

export interface GoldenCase { id: string; input: CaseInput; expected: CaseExpected }

const root = path.resolve(__dirname, "../../data");

export function loadParams(): ParameterSet[] {
  const dir = path.join(root, "params");
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as ParameterSet);
}

export function loadCases(): GoldenCase[] {
  const dir = path.join(root, "cases");
  if (!fs.existsSync(dir)) return [];
  const out: GoldenCase[] = [];
  for (const id of fs.readdirSync(dir).sort()) {
    const folder = path.join(dir, id);
    if (id.startsWith("_") || !fs.statSync(folder).isDirectory()) continue;
    const inputPath = path.join(folder, "input.json");
    const expectedPath = path.join(folder, "expected.json");
    if (!fs.existsSync(inputPath) || !fs.existsSync(expectedPath)) continue;
    const input = caseInputSchema.safeParse(JSON.parse(fs.readFileSync(inputPath, "utf8")));
    const expected = caseExpectedSchema.safeParse(JSON.parse(fs.readFileSync(expectedPath, "utf8")));
    if (!input.success || !expected.success) continue; // fixtures:validate reports these
    out.push({ id, input: input.data as CaseInput, expected: expected.data as CaseExpected });
  }
  return out;
}
