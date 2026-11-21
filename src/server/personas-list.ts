import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { listPersonaFiles } from "./persona-store";

export interface PersonaListItem {
  id: string;
  label: string;
  oneLiner: string;
  journey: string;
}

export async function getPersonaList(): Promise<PersonaListItem[]> {
  "use cache";
  cacheTag("personas");
  cacheLife("max");
  const order = ["pregnant", "father", "selfEmployed", "planning", "adoption", "loss"];
  return listPersonaFiles()
    .map(({ id, label, oneLiner, journey }) => ({ id, label, oneLiner, journey }))
    .sort((a, b) => order.indexOf(a.journey) - order.indexOf(b.journey));
}
