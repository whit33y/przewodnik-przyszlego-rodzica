import "server-only";

export interface PersonaSummary {
  id: string;
  displayName: string;
}

/** Phase 0 stub. Phase 2 resolves personas and sample cases from data/personas and data/cases. */
export async function getPersonaSummary(personaId: string): Promise<PersonaSummary | null> {
  return { id: personaId, displayName: "Profil testowy" };
}
