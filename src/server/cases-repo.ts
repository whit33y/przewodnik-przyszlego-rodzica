import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { CaseInputFile } from "./persona-store";

export interface CaseListItem {
  id: string;
  title: string;
  scenario: string;
  tags: string[];
  outcome: "granted" | "refused" | "partial";
  tiers: { outcome: boolean; duration: boolean; amount: boolean };
}

export interface CaseExpectedFile {
  id: string;
  outcome: { value: "granted" | "refused" | "partial"; reasonCodes: string[]; evidence: string; reversedOnAppeal?: boolean };
  benefits: unknown[];
  legalBasisCited: string[];
  expectedAlerts: string[];
  tiers?: { outcome: boolean; duration: boolean; amount: boolean };
  knownDivergence?: { fields: string[]; explanation: string };
}

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

function derivedTiers(e: CaseExpectedFile): CaseListItem["tiers"] {
  if (e.tiers) return e.tiers;
  const printed = (k: string) => JSON.stringify(e.benefits).includes(`"${k}":{"value"`) && JSON.stringify(e.benefits).includes('"evidence":"printed"');
  return { outcome: true, duration: printed("days"), amount: printed("daily") || printed("base") };
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
