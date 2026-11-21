import { getSession } from "@/server/session";
import { Button } from "@/ui/components/Button/Button";
import { SimBadge } from "@/ui/components/Sim/Sim";
import { getPersonaSummary } from "@/server/persona-summary";

export async function UserSlot() {
  const session = await getSession();
  if (!session.personaId) {
    return (
      <Button href="/logowanie" variant="secondary" size="sm" icon="lock">
        <span className="hide-narrow">Zaloguj się</span>
      </Button>
    );
  }
  const summary = await getPersonaSummary(session.personaId);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <SimBadge label={session.mode === "case" ? "Sprawa testowa" : "Symulacja"} />
      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }} className="hide-narrow">
        {summary?.displayName ?? "Zalogowano"}
      </span>
      <form action="/api/v1/auth/logout" method="post">
        <Button type="submit" variant="text" size="sm" icon="logout" aria-label="Wyloguj">
          <span className="visually-hidden">Wyloguj</span>
        </Button>
      </form>
    </span>
  );
}

export function UserSlotSkeleton() {
  return <span style={{ display: "inline-block", width: 120, height: 40 }} aria-hidden="true" />;
}
