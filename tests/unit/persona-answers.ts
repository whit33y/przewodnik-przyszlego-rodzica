import fs from "node:fs";
import path from "node:path";
import type { Answers, PersonaFile } from "@/integrations/types";

/** The answers a demo person would type (data/personas/*.json `sampleAnswers`): due date, hospital stay. */
export function typedAnswers(id: string): Partial<Answers> {
  const file = path.resolve(__dirname, "../../data/personas", `${id}.json`);
  if (!fs.existsSync(file)) return {};
  return (JSON.parse(fs.readFileSync(file, "utf8")) as PersonaFile).sampleAnswers ?? {};
}
