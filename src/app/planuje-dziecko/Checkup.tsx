import type { AlertCode, Facts, Result } from "@/engine/types";
import type { SystemId } from "@/integrations/types";
import { formatDateLong, formatDateShort, formatMoney } from "@/lib/format";
import { Button } from "@/ui/components/Button/Button";
import { Notice, type Tone } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { AlertList } from "../_shell/AlertList";
import s from "./Planning.module.css";

/** Warnings worth knowing months ahead (the rest concern the leave plan after birth). */
const PLANNING_WARNINGS = new Set<AlertCode>(["TITLE_LIKELY_VERIFIED", "WAITING_PERIOD_NOT_MET", "LOW_BASE", "BASE_DILUTED_ART48A", "BASE_CHANGE_SCRUTINY", "CONTRACT_ENDS_BEFORE_BIRTH", "NO_SCHEME_ULGA_NA_START", "REREGISTER_AFTER_MATERNITY"]);

interface Item {
  title: string;
  tone: Tone;
  word: string;
  body: string;
}

/** What to secure before the birth: each item is read from the engine result (alerts, insurance check) and the facts. */
function checklist(result: Result, facts: Facts, due: string, unverified: SystemId[]): Item[] {
  const titles = facts.claimant.titles.filter((t) => !t.to || t.to >= due || t.kind === "maternityBenefit");
  const has = (code: AlertCode) => result.alerts.find((a) => a.code === code);
  const kinds = new Set(facts.claimant.titles.map((t) => t.kind));
  const self = kinds.has("selfEmployed") || kinds.has("collaborator");
  const contract = kinds.has("employment") || kinds.has("mandate");
  const insured = result.insurance.find((i) => i.purpose === "dueDate" || i.purpose === "event")?.insured;
  const items: Item[] = [];

  if (!facts.claimant.titles.length) {
    items.push({ title: "Tytuł do ubezpieczenia chorobowego", tone: "negative", word: "Brak", body: "Bez umowy o pracę, zlecenia z dobrowolnym chorobowym albo działalności z dobrowolnym chorobowym zasiłek macierzyński nie przysługuje. Zamiast niego możesz dostać świadczenie rodzicielskie z gminy (1 000 zł miesięcznie przez rok)." });
  } else if (insured) {
    const mode = titles.find((t) => t.sickness.mode !== "none")?.sickness.mode;
    items.push({ title: "Ubezpieczenie chorobowe w dniu porodu", tone: "positive", word: "W porządku", body: mode === "voluntary" ? "Masz dobrowolne ubezpieczenie chorobowe. Pilnuj, żeby składki wpływały w terminie — spóźniona składka może przerwać ubezpieczenie." : "Masz obowiązkowe ubezpieczenie chorobowe z umowy o pracę." });
  } else {
    const voluntary = has("VOLUNTARY_SICKNESS_NOT_JOINED");
    items.push({
      title: "Ubezpieczenie chorobowe w dniu porodu",
      tone: "negative",
      word: "Do zrobienia",
      body: voluntary
        ? "Przy zleceniu i działalności chorobowe jest dobrowolne, a Ty go nie masz. Zgłoś się (ZUA lub ZZA) jak najszybciej — ubezpieczenie zaczyna się od dnia zgłoszenia, a zasiłek macierzyński nie wymaga okresu wyczekiwania."
        : "W przewidywanym dniu porodu nie byłoby ubezpieczenia chorobowego. Sprawdź powód na liście „Co zrobić teraz”.",
    });
  }

  if (self) {
    const arrears = has("ARREARS_OWN") ?? has("ARREARS_PAYER");
    if (arrears) {
      const amount = typeof arrears.values.amount === "number" ? ` (${formatMoney(arrears.values.amount)})` : "";
      items.push({ title: "Składki bez zaległości", tone: "negative", word: "Do zrobienia", body: `Masz zaległość w składkach${amount}. Spłać ją przed porodem — układ ratalny nie wystarczy, a zaległość w dniu porodu wstrzymuje wypłatę zasiłku.` });
    } else if (unverified.includes("zus-saldo")) {
      items.push({ title: "Składki bez zaległości", tone: "neutral", word: "Nie sprawdzono", body: "Nie pobraliśmy Twoich rozliczeń z ZUS. Sprawdź saldo w PUE/eZUS — zaległość ponad 1% minimalnego wynagrodzenia w dniu porodu wstrzyma wypłatę." });
    } else {
      items.push({ title: "Składki bez zaległości", tone: "positive", word: "W porządku", body: "Nie widzimy zaległości ponad próg. Płać składki w terminie aż do porodu." });
    }
    const suspended = has("BUSINESS_SUSPENDED_NEAR_DUE_DATE");
    if (suspended) {
      const susp = facts.claimant.titles.flatMap((t) => t.suspensions ?? []).find((x) => x.from <= (suspended.onDate ?? due));
      items.push({ title: "Działalność aktywna w dniu porodu", tone: "negative", word: "Do zrobienia", body: `Zawieszenie działalności${susp ? ` (${formatDateShort(susp.from)}–${susp.to ? formatDateShort(susp.to) : "…"})` : ""} obejmuje okolice porodu. W czasie zawieszenia nie ma ubezpieczenia chorobowego — przesuń zawieszenie na czas po porodzie.` });
    } else if (unverified.includes("ceidg")) {
      items.push({ title: "Działalność aktywna w dniu porodu", tone: "neutral", word: "Nie sprawdzono", body: "Nie sprawdziliśmy CEIDG. Nie zawieszaj działalności przed porodem — zawieszenie przerywa ubezpieczenie chorobowe." });
    } else {
      items.push({ title: "Działalność aktywna w dniu porodu", tone: "positive", word: "W porządku", body: "W CEIDG nie ma zawieszenia w okolicy terminu. Nie zawieszaj firmy przed porodem — zrobisz to bezpiecznie dopiero po nim." });
    }
  }

  if (contract) {
    const ends = has("CONTRACT_ENDS_BEFORE_BIRTH") || facts.claimant.titles.some((t) => (t.kind === "employment" || t.kind === "mandate") && ((t.to && t.to < due) || (t.plannedEnd && t.plannedEnd.date < due)));
    items.push(
      ends
        ? { title: "Umowa trwa do porodu", tone: "caution", word: "Uwaga", body: "Umowa kończy się przed terminem porodu. Umowa o pracę na czas określony, która kończy się po 3. miesiącu ciąży, przedłuża się do dnia porodu — zlecenie nie. Porozmawiaj o przedłużeniu, zanim umowa wygaśnie." }
        : { title: "Umowa trwa do porodu", tone: "positive", word: "W porządku", body: "Nie widzimy daty końca umowy przed terminem. Jeśli zmieniasz pracę, zadbaj, żeby nie było przerwy w ubezpieczeniu." },
    );
  }

  items.push({ title: "Dokumenty", tone: "info", word: "Na później", body: "W ciąży: zaświadczenie lekarskie o ciąży dla pracodawcy lub ZUS. Po porodzie: wniosek o zasiłek — złożony w ciągu 21 dni daje 81,5% za cały urlop. Aktu urodzenia nie musisz przynosić: pobierzemy go z rejestru." });
  return items;
}

export function Checkup({ result, facts, due, asOf, unverified = [], estimate }: { result: Result; facts: Facts; due: string; asOf: string; unverified?: SystemId[]; estimate?: boolean }) {
  const mat = result.entitlements.find((e) => e.benefit === "maternity");
  const urgent = result.alerts.filter((a) => a.severity === "blocking" || a.severity === "high");
  const warnings = result.alerts.filter((a) => a.severity === "warning" && PLANNING_WARNINGS.has(a.code));
  const entitled = mat?.status === "granted" || mat?.status === "partial";
  const blocked = result.alerts.some((a) => a.severity === "blocking") || !entitled;
  const firstFix = urgent.map((a) => a.fix?.byDate ?? a.deadline).filter(Boolean).sort()[0];
  const tone: Tone = blocked ? "negative" : urgent.length ? "caution" : "positive";
  const title = blocked
    ? `Gdyby poród był ${formatDateLong(due)}, zasiłek macierzyński by nie przysługiwał — ale jest czas, żeby to zmienić`
    : urgent.length
      ? `Gdyby poród był ${formatDateLong(due)}, zasiłek macierzyński by przysługiwał — sprawdź ${urgent.length === 1 ? "jedną rzecz" : `${urgent.length} rzeczy`} poniżej`
      : `Gdyby poród był ${formatDateLong(due)}, zasiłek macierzyński by przysługiwał`;
  return (
    <div className={s.layout} id="wynik">
      <Notice tone={tone} headingLevel={2} hideToneWord title={title}>
        <p>
          {blocked
            ? `Do porodu zostało sporo czasu${firstFix ? ` — najważniejsze zrób do ${formatDateLong(firstFix)}` : ""}. Poniżej piszemy, co dokładnie zmienić.`
            : "Silnik nie znalazł niczego, co odebrałoby Ci prawo do zasiłku. Utrzymaj to do porodu."}
          {estimate ? " Wynik opiera się na Twoich odpowiedziach — po zalogowaniu sprawdzimy dane w ZUS i rejestrach." : ` Sprawdzamy na podstawie danych na ${formatDateLong(asOf)}.`}
        </p>
      </Notice>

      <section className={s.section} aria-labelledby="teraz">
        <h2 id="teraz">Co zrobić teraz</h2>
        {urgent.length ? <AlertList alerts={urgent} /> : <p className={s.muted}>Nic pilnego. Wróć tu, gdy coś się zmieni w pracy lub firmie — sprawdzenie zajmuje minutę.</p>}
      </section>

      <section className={s.section} aria-labelledby="zabezpiecz">
        <h2 id="zabezpiecz">Co zabezpieczyć przed porodem</h2>
        <ul className={s.checklist}>
          {checklist(result, facts, due, unverified).map((it) => (
            <li key={it.title} className={s.item}>
              <div className={s.itemHead}>
                <h3>{it.title}</h3>
                <StatusBadge tone={it.tone} label={it.word} />
              </div>
              <p>{it.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {warnings.length ? (
        <section className={s.section} aria-labelledby="warto">
          <h2 id="warto">Warto wiedzieć</h2>
          <AlertList alerts={warnings} />
        </section>
      ) : null}

      <div className={s.actions}>
        {estimate ? (
          <Button href="/logowanie" icon="lock" uppercase={false}>
            Sprawdź na danych z ZUS (mObywatel)
          </Button>
        ) : (
          <Button href="/uprawnienia" iconAfter="chevron-right">
            Zobacz wszystkie uprawnienia
          </Button>
        )}
      </div>
    </div>
  );
}
