import "server-only";
import { resolvePersona } from "./persona-store";

export interface PersonaSummary {
  id: string;
  displayName: string;
}

export async function getPersonaSummary(personaId: string): Promise<PersonaSummary | null> {
  if (personaId === "manual") return { id: personaId, displayName: "Tryb bez logowania" };
  const p = resolvePersona(personaId);
  if (!p) return null;
  return { id: personaId, displayName: p.systems.mobywatel?.displayName || p.label };
}
