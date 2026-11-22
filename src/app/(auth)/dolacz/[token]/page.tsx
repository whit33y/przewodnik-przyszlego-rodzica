import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { readInvite } from "@/server/invites";
import { resolvePersona } from "@/server/persona-store";
import { readState } from "@/server/session-state";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { Skeleton } from "@/ui/components/Skeleton/Skeleton";
import s from "./Invite.module.css";

export const metadata: Metadata = { title: "Zaproszenie do wspólnego planu (symulacja)" };

/** Prerender needs one param; real tokens render on demand. */
export async function generateStaticParams() {
  return [{ token: "niewazne" }];
}

async function InviteContent({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ wynik?: string }> }) {
  const { token: raw } = await params;
  const { wynik } = await searchParams;
  await connection(); // the invitation's expiry depends on the clock
  const token = decodeURIComponent(raw);
  const invite = await readInvite(token);
  const state = invite ? readState(invite.sid) : null;
  if (!invite || !state) {
    return (
      <Notice tone="neutral" headingLevel={2} hideToneWord title="To zaproszenie jest nieważne albo wygasło" actions={<Button href="/" variant="secondary">Strona główna</Button>}>
        <p>Zaproszenie jest ważne 14 dni. Poproś drugiego rodzica o nowy link.</p>
      </Notice>
    );
  }
  const persona = resolvePersona(state.personaId);
  const inviter = persona?.systems.mobywatel?.displayName ?? "Drugi rodzic";

  if (wynik === "ok") {
    return (
      <div className={s.layout}>
        <Notice tone="positive" role="status" headingLevel={2} hideToneWord title="Dołączasz do wspólnego planu">
          <p>W prawdziwej usłudze zobaczysz teraz na swoim koncie wspólny plan urlopów, kwotę swojego zasiłku i swoje kroki — na przykład wniosek o urlop ojcowski u swojego pracodawcy.</p>
        </Notice>
        <p className={s.muted}>W tej demonstracji obie osoby korzystają z jednej przeglądarki, więc wracasz na konto osoby zapraszającej ({inviter}).</p>
        <div className={s.actions}>
          <Button href="/plan" uppercase={false}>Zobacz wspólny plan</Button>
          <Button href="/kroki" variant="secondary" uppercase={false}>Co i kiedy</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.layout}>
      {wynik === "brak" ? (
        <Notice tone="caution" headingLevel={2} hideToneWord title="W tej demonstracji nie ma konta drugiego rodzica">
          <p>Profil „{inviter}” nie ma przygotowanych danych drugiego rodzica. Wróć i wybierz „Podam szacunkowo”.</p>
        </Notice>
      ) : null}
      <ul className={s.list}>
        <li>Zalogujesz się <strong>swoim</strong> mObywatelem. Pobierzemy z ZUS tylko Twoje dane.</li>
        <li>Zobaczycie wspólny plan: kto i kiedy bierze urlop i ile wyniesie zasiłek każdego z Was.</li>
        <li>{inviter} zobaczy Twoją część planu i kwotę Twojego zasiłku — ale nie Twoją historię zatrudnienia ani składek.</li>
        <li>Swoje wnioski o urlop składasz u swojego pracodawcy. Przypomnimy Ci terminy.</li>
      </ul>
      <form action="/api/v1/invites/accept" method="post" className={s.actions}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" icon="lock" uppercase={false}>
          Zaloguj się przez mObywatel i dołącz (symulacja)
        </Button>
        <Button href="/" variant="text" uppercase={false}>
          Nie teraz
        </Button>
      </form>
      <p className={s.muted}>W prawdziwej usłudze otwierasz ten link na swoim telefonie lub komputerze. Zaproszenie jest ważne 14 dni.</p>
    </div>
  );
}

export default function Page({ params, searchParams }: PageProps<"/dolacz/[token]">) {
  return (
    <>
      <PageHeader title="Zaproszenie do wspólnego planu urlopów" lead="Drugi rodzic zaprasza Cię, żebyście razem ułożyli urlopy po narodzinach dziecka." />
      <Suspense fallback={<Skeleton lines={5} />}>
        <InviteContent params={params as Promise<{ token: string }>} searchParams={searchParams as Promise<{ wynik?: string }>} />
      </Suspense>
    </>
  );
}
