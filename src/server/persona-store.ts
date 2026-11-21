import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Facts, Plan } from "@/engine/types";
import { splitFacts } from "@/integrations/split";
import type { Answers, PersonaFile, SystemPayloads } from "@/integrations/types";

export interface ResolvedPersona {
  id: string;
  kind: "persona" | "case";
  label: string;
  oneLiner: string;
  journey: PersonaFile["journey"] | "case";
  asOf: string;
  systems: Partial<SystemPayloads>;
  unavailable: string[];
  presetAnswers: Partial<Answers>;
  otherParent?: PersonaFile["otherParent"];
}

const root = () => path.join(process.cwd(), "data");

export function listPersonaFiles(): PersonaFile[] {
  const dir = path.join(root(), "personas");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as PersonaFile);
}

export interface CaseInputFile {
  id: string;
  title: string;
  scenario: string;
  tags: string[];
  facts: Facts;
  plan: Plan;
  source?: { pdfSha256: string[]; fileNameSha256: string[]; pages?: number };
  extractionNotes?: string;
}

export function readCaseInput(id: string): CaseInputFile | null {
  if (!/^[A-Z]\d-\d{2}$/.test(id)) return null;
  const p = path.join(root(), "cases", id, "input.json");
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as CaseInputFile) : null;
}

/** "magdalena" → demo persona; "case:B4-07" → sample case split into simulated registries. */
export function resolvePersona(personaId: string): ResolvedPersona | null {
  if (personaId.startsWith("case:")) {
    const c = readCaseInput(personaId.slice(5));
    if (!c) return null;
    const { systems, answers } = splitFacts(c.facts, c.plan);
    systems.mobywatel = { ...(systems.mobywatel ?? { sex: c.facts.claimant.sex }), displayName: `Sprawa ${c.id}` };
    return { id: personaId, kind: "case", label: `Sprawa ${c.id}`, oneLiner: c.title, journey: "case", asOf: c.facts.asOf, systems, unavailable: [], presetAnswers: answers };
  }
  const file = listPersonaFiles().find((p) => p.id === personaId);
  if (!file) return null;
  return {
    id: file.id,
    kind: "persona",
    label: file.label,
    oneLiner: file.oneLiner,
    journey: file.journey,
    asOf: file.asOf,
    systems: file.systems,
    unavailable: file.unavailable ?? [],
    presetAnswers: file.presetAnswers ?? {},
    otherParent: file.otherParent,
  };
}
