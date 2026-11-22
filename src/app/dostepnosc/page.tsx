import type { Metadata } from "next";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import s from "./Dostepnosc.module.css";

export const metadata: Metadata = {
  title: "Deklaracja dostępności",
  description: "Deklaracja dostępności serwisu Przewodnik Rodzica: status zgodności z WCAG 2.1, znane ograniczenia, kontakt i procedura skargowa.",
};

const PREPARED = "2026-11-21";
const PLACEHOLDER = "[do uzupełnienia przy wdrożeniu]";

export default function Page() {
  return (
    <article className={s.page}>
      <PageHeader title="Deklaracja dostępności" lead="Przewodnik Rodzica — serwis z informacjami o zasiłkach dla przyszłych rodziców i rodziców." />

      <section className={s.section} aria-labelledby="wstep">
        <h2 id="wstep">Wstęp</h2>
        <p>
          Podmiot prowadzący serwis {PLACEHOLDER} zobowiązuje się zapewnić jego dostępność zgodnie z ustawą z dnia 4 kwietnia 2019 r. o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów publicznych. Oświadczenie
          w sprawie dostępności ma zastosowanie do serwisu Przewodnik Rodzica.
        </p>
        <dl className={s.dates}>
          <div>
            <dt>Data publikacji serwisu</dt>
            <dd>
              <time dateTime={PREPARED}>21 listopada 2026</time>
            </dd>
          </div>
          <div>
            <dt>Data ostatniej istotnej aktualizacji</dt>
            <dd>
              <time dateTime={PREPARED}>21 listopada 2026</time>
            </dd>
          </div>
        </dl>
      </section>

      <section className={s.section} aria-labelledby="status">
        <h2 id="status">Stan dostępności cyfrowej</h2>
        <p>
          <strong>Serwis jest częściowo zgodny</strong> z ustawą o dostępności cyfrowej oraz ze standardem WCAG 2.1 na poziomie AA — z powodu niezgodności i braków wymienionych niżej. Nie przeprowadziliśmy jeszcze niezależnego audytu ani
          testów z udziałem osób korzystających z technologii wspomagających, dlatego nie deklarujemy pełnej zgodności.
        </p>
      </section>

      <section className={s.section} aria-labelledby="zapewniamy">
        <h2 id="zapewniamy">Co zapewniamy</h2>
        <ul className={s.list}>
          <li>Obsługę całego serwisu z klawiatury i widoczny fokus na każdym elemencie. Pierwszy element strony to link „Przejdź do treści”.</li>
          <li>Kontrast tekstu co najmniej 4,5:1 — sprawdzany automatycznie przy każdej zmianie kolorów.</li>
          <li>Status nigdy nie jest przekazywany wyłącznie kolorem: zawsze towarzyszą mu ikona i słowo.</li>
          <li>Układ działający przy powiększeniu 200% i szerokości ekranu 320 px, bez przewijania w poziomie.</li>
          <li>Strukturę nagłówków i obszarów strony (nagłówek, nawigacja, treść, stopka) czytelną dla czytników ekranu.</li>
          <li>Tekstowy opis osi czasu w planie urlopów — ta sama informacja jest dostępna bez grafiki.</li>
          <li>Prosty język, krótkie zdania i wyjaśnienia terminów prawnych.</li>
          <li>Ograniczone animacje, wyłączane przy ustawieniu systemowym „ogranicz ruch”.</li>
        </ul>
      </section>

      <section className={s.section} aria-labelledby="ograniczenia">
        <h2 id="ograniczenia">Treści niedostępne i znane ograniczenia</h2>
        <ul className={s.list}>
          <li>Brak niezależnego audytu dostępności i testów z użytkownikami czytników ekranu. Zgodność oceniliśmy samodzielnie.</li>
          <li>Wnioski do druku są stroną HTML, którą zapisujesz jako PDF w przeglądarce. Taki plik PDF może nie mieć pełnej struktury dostępności (tagów).</li>
          <li>Interaktywna oś czasu w planie urlopów może być trudniejsza w obsłudze przy dużym powiększeniu; zmiany w planie można wprowadzać także w formularzu pod osią.</li>
          <li>Serwis nie ma jeszcze informacji w polskim języku migowym (PJM) ani wersji tekstu łatwego do czytania (ETR).</li>
          <li>Linki do serwisów zewnętrznych (np. zus.pl, gov.pl, pip.gov.pl, strony organizacji pomocowych) prowadzą do treści, za których dostępność nie odpowiadamy.</li>
          <li>Ekrany symulacji (logowanie, pobieranie danych) są oznaczone żółtym paskiem „SYMULACJA” — to informacja, nie element do obsługi.</li>
        </ul>
      </section>

      <section className={s.section} aria-labelledby="przygotowanie">
        <h2 id="przygotowanie">Przygotowanie deklaracji</h2>
        <p>
          Deklarację sporządzono dnia <time dateTime={PREPARED}>21 listopada 2026</time> na podstawie samooceny zespołu projektowego. Samoocenę wsparły automatyczne testy axe-core (reguły WCAG 2.1 A i AA) uruchamiane przy każdej zmianie na
          ekranach o szerokości 375 i 1280 px oraz ręczne testy obsługi z klawiatury.
        </p>
      </section>

      <section className={s.section} aria-labelledby="kontakt">
        <h2 id="kontakt">Informacje zwrotne i dane kontaktowe</h2>
        <p>Jeśli zauważysz problem z dostępnością albo chcesz zgłosić uwagi, skontaktuj się z nami.</p>
        <dl className={s.dates}>
          <div>
            <dt>Osoba kontaktowa</dt>
            <dd>{PLACEHOLDER}</dd>
          </div>
          <div>
            <dt>Adres e-mail</dt>
            <dd>{PLACEHOLDER}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>{PLACEHOLDER}</dd>
          </div>
        </dl>
        <p>Tą samą drogą możesz złożyć wniosek o udostępnienie informacji niedostępnej albo zgłosić skargę na brak zapewnienia dostępności.</p>
      </section>

      <section className={s.section} aria-labelledby="procedura">
        <h2 id="procedura">Procedura wnioskowo-skargowa</h2>
        <p>
          Każdy ma prawo wystąpić z żądaniem zapewnienia dostępności cyfrowej strony internetowej lub jej elementu. Możesz też zażądać udostępnienia informacji w formie alternatywnej, na przykład odczytania niedostępnego dokumentu
          lub opisania zawartości grafiki.
        </p>
        <p>Żądanie powinno zawierać:</p>
        <ul className={s.list}>
          <li>dane kontaktowe osoby zgłaszającej,</li>
          <li>wskazanie strony lub elementu strony, którego dotyczy żądanie,</li>
          <li>sposób kontaktu, a jeśli prosisz o informację w formie alternatywnej — także opis tej formy.</li>
        </ul>
        <p>
          Podmiot publiczny realizuje żądanie niezwłocznie, nie później niż w ciągu 7 dni od jego otrzymania. Jeśli dotrzymanie tego terminu nie jest możliwe, informuje o tym, kiedy żądanie zostanie zrealizowane — nie później niż w ciągu
          2 miesięcy od otrzymania żądania. Jeśli zapewnienie dostępności nie jest możliwe, podmiot może zaproponować alternatywny sposób dostępu do informacji.
        </p>
        <p>
          Jeśli podmiot odmówi realizacji żądania, nie dotrzyma terminu albo nie zgodzisz się na alternatywny sposób dostępu, możesz złożyć skargę na brak zapewnienia dostępności cyfrowej.
        </p>
        <h3>Rzecznik Praw Obywatelskich</h3>
        <p>
          Po wyczerpaniu tej procedury możesz złożyć wniosek do Rzecznika Praw Obywatelskich: Biuro RPO, al. Solidarności 77, 00-090 Warszawa, bezpłatna infolinia 800 676 676.{" "}
          <TextLink href="https://bip.brpo.gov.pl/" external>
            Strona Rzecznika Praw Obywatelskich
          </TextLink>
        </p>
      </section>

      <section className={s.section} aria-labelledby="architektura">
        <h2 id="architektura">Dostępność architektoniczna</h2>
        <p>Informacje o dostępności siedziby podmiotu prowadzącego serwis: {PLACEHOLDER}.</p>
      </section>

      <section className={s.section} aria-labelledby="aplikacje">
        <h2 id="aplikacje">Aplikacje mobilne</h2>
        <p>Serwis nie ma aplikacji mobilnej. Strona działa w przeglądarce na telefonach i tabletach.</p>
      </section>
    </article>
  );
}
