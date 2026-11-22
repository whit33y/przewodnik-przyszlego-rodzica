import { connection } from "next/server";
import type { ReactNode } from "react";
import { formatDateLong } from "@/lib/format";
import { loadContext } from "@/server/context";
import { defaultDueDate, dueDateFromQuery, factsFromQuestions, parseQuestions, runCheckup } from "@/server/planning";
import { getSession } from "@/server/session";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { Checkup } from "./Checkup";
import { DueDateForm, QuestionsForm, SaveDueDate } from "./PlanningForms";
import s from "./Planning.module.css";

type Query = Record<string, string | string[] | undefined>;

const technical = (
  <Notice tone="caution" title="Nie możemy teraz przeprowadzić sprawdzenia" role="alert">
    <p>Wystąpił problem techniczny po naszej stronie. Spróbuj ponownie za chwilę.</p>
  </Notice>
);

/** Streams under <Suspense>: reads the session and the query (hypothetical due date, logged-out answers). */
export async function PlanningContent({ searchParams }: { searchParams: Promise<Query> }) {
  const [session, q] = await Promise.all([getSession(), searchParams]);
  const ctx = session.personaId ? await loadContext(session) : null;
  if (ctx) return <LoggedIn ctx={ctx} q={q} />;
  return <LoggedOut q={q} />;
}

async function LoggedIn({ ctx, q }: { ctx: NonNullable<Awaited<ReturnType<typeof loadContext>>>; q: Query }) {
  const { facts, missing, unverified } = ctx.assembled;
  const name = ctx.persona?.systems.mobywatel?.displayName;
  if (missing.some((x) => x.id === "manual")) {
    return (
      <Notice tone="info" title="Najpierw powiedz nam, jak pracujesz" actions={<Button href="/sytuacja">Uzupełnij dane</Button>}>
        <p>Bez danych z konta ZUS (albo Twoich odpowiedzi) nie sprawdzimy, czy zasiłek będzie przysługiwał.</p>
      </Notice>
    );
  }
  const ev = facts.event;
  if (ev.kind !== "birth" || ev.date || ev.occurred) {
    return (
      <Notice tone="info" title={ev.kind === "birth" ? "Dziecko jest już na świecie" : "Dziecko jest już w rodzinie"} actions={<Button href="/uprawnienia">Zobacz swoje uprawnienia</Button>}>
        <p>Sprawdzenie „przed ciążą” dotyczy przyszłego porodu. Twoje obecne uprawnienia znajdziesz na stronie „Uprawnienia”.</p>
      </Notice>
    );
  }
  const asOf = facts.asOf;
  const picked = dueDateFromQuery(q, asOf);
  const due = picked.value ?? defaultDueDate(asOf, ev.expectedDate);
  const checkup = await runCheckup(facts, due);
  if (!checkup) return technical;
  const saved = ev.expectedDate === due;
  return (
    <div className={s.layout}>
      <Card heading={name ? `Sprawdzenie dla: ${name}` : "Twoje sprawdzenie"} headingLevel={2} tone="alt">
        <p className={s.muted}>
          Dziś w symulacji: <strong>{formatDateLong(asOf)}</strong>.{" "}
          {ev.expectedDate && ev.expectedDate > asOf ? `Twój termin porodu to ${formatDateLong(ev.expectedDate)}.` : "Nie znamy terminu porodu — przyjmujemy termin za 9 miesięcy, możesz go zmienić."} Używamy danych pobranych z ZUS i rejestrów.
        </p>
        <DueDateForm due={due} error={picked.error} />
        {!saved && ctx.state.mode !== "case" ? <SaveDueDate due={due} label={formatDateLong(due)} /> : null}
      </Card>
      <Checkup result={checkup.result} facts={checkup.facts} due={due} asOf={asOf} unverified={unverified} />
    </div>
  );
}

async function LoggedOut({ q }: { q: Query }) {
  await connection(); // "today" is read from the clock
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = defaultDueDate(today);
  const parsed = parseQuestions(q, today);
  const values = parsed.state === "empty" ? {} : parsed.values;
  const errors = parsed.state === "invalid" ? parsed.errors : {};
  const termin = dueDateFromQuery(q, today).value;
  let result: ReactNode = null;
  if (parsed.state === "ok") {
    const facts = await factsFromQuestions(parsed.values, today, parsed.due);
    const checkup = facts ? await runCheckup(facts, parsed.due) : null;
    result = checkup ? <Checkup result={checkup.result} facts={checkup.facts} due={parsed.due} asOf={today} estimate /> : technical;
  }
  return (
    <div className={s.layout}>
      <Card heading="Cztery pytania" headingLevel={2}>
        <p className={s.muted}>Bez logowania i bez zapisywania czegokolwiek. Odpowiedzi trafiają tylko do tego jednego wyliczenia.</p>
        <QuestionsForm values={{ praca: values.praca, chorobowe: values.chorobowe, od: values.od, zaleglosci: values.zaleglosci, termin: termin }} errors={errors} defaultDue={defaultDue} />
      </Card>
      {result}
    </div>
  );
}
