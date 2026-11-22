import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { CaseExpected } from "@/engine/case-types";
import { deriveTiers } from "@/integrations/case-schema";
import type { CaseInputFile } from "./persona-store";

export interface CaseListItem {
  id: string;
  title: string;
  scenario: string;
  tags: string[];
  outcome: "granted" | "refused" | "partial";
  tiers: { outcome: boolean; duration: boolean; amount: boolean };
}

/** expected.json as validated by `npm run fixtures:validate` (schema in src/integrations/case-schema.ts). */
export type CaseExpectedFile = CaseExpected;

const dir = () => path.join(process.cwd(), "data", "cases");

function readJson<T>(p: string): T | null {
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as T) : null;
}

export function caseIds(): string[] {
  if (!fs.existsSync(dir())) return [];
  return fs
    .readdirSync(dir())
    .filter((d) => /^[A-Z]\d-\d{2}$/.test(d))
    .sort();
}

export function readExpected(id: string): CaseExpectedFile | null {
  if (!/^[A-Z]\d-\d{2}$/.test(id)) return null;
  return readJson<CaseExpectedFile>(path.join(dir(), id, "expected.json"));
}

/** Tier chips: each benefit field's own `evidence`, never a file-wide guess (S9). */
function derivedTiers(e: CaseExpectedFile): CaseListItem["tiers"] {
  return deriveTiers(e);
}

export async function listCases(): Promise<CaseListItem[]> {
  "use cache";
  cacheTag("cases");
  cacheLife("max");
  return caseIds().flatMap((id) => {
    const input = readJson<CaseInputFile>(path.join(dir(), id, "input.json"));
    const expected = readExpected(id);
    if (!input || !expected) return [];
    return [{ id, title: input.title, scenario: input.scenario, tags: input.tags, outcome: expected.outcome.value, tiers: derivedTiers(expected) }];
  });
}

export async function matchCase(hashes: { pdfSha256?: string; fileNameSha256?: string }): Promise<string | null> {
  for (const id of caseIds()) {
    const input = readJson<CaseInputFile>(path.join(dir(), id, "input.json"));
    const src = input?.source;
    if (!src) continue;
    if (hashes.pdfSha256 && src.pdfSha256?.includes(hashes.pdfSha256)) return id;
    if (hashes.fileNameSha256 && src.fileNameSha256?.includes(hashes.fileNameSha256)) return id;
  }
  return null;
}

export function readReport(): unknown {
  return readJson(path.join(dir(), "_report.json"));
}
