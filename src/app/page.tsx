import Link from "next/link";
import { Button } from "@/ui/components/Button/Button";
import { Card } from "@/ui/components/Card/Card";
import { Icon, type IconName } from "@/ui/icons/Icon";
import s from "./page.module.css";

const entries: { href: string; icon: IconName; title: string; body: string }[] = [
  {
    href: "/planuje-dziecko",
    icon: "heart",
    title: "Planuję dziecko",
    body: "Sprawdź, co zabezpieczyć już teraz — ubezpieczenie chorobowe, składki, umowę — żeby zasiłek był pewny.",
  },
  {
    href: "/logowanie",
    icon: "baby",
    title: "Jestem w ciąży lub dziecko już jest",
    body: "Zobacz, ile wyniesie zasiłek, ułóż urlopy obojga rodziców i dostań listę dokumentów z terminami.",
  },
  {
    href: "/plan?tryb=reczny",
    icon: "users",
    title: "Adopcja lub rodzina zastępcza",
    body: "Urlop i zasiłek przy przyjęciu dziecka na wychowanie — zależnie od wieku dziecka i formy opieki.",
  },
  {
    href: "/trudna-sytuacja",
    icon: "help",
    title: "Trudna sytuacja",
    body: "Poronienie, urodzenie martwego dziecka, wcześniak w szpitalu, choroba. Powiemy, co Ci przysługuje i co trzeba zrobić — bez pośpiechu.",
  },
];

export default function Home() {
  return (
    <>
      <section className={`${s.hero} on-dark`} aria-labelledby="hero-title">
        <div className={s.heroText}>
          <p className={s.eyebrow}>Zasiłki z ZUS w ciąży i po porodzie</p>
          <h1 id="hero-title" className={s.title}>
            Sprawdź, co Ci przysługuje z ZUS, zanim urodzi się dziecko
          </h1>
          <p className={s.lead}>
            Zaloguj się przez mObywatela. Pobierzemy Twoje dane z ZUS i rejestrów państwowych, sprawdzimy prawo do zasiłku, policzymy jego wysokość i podpowiemy, co, komu i do
            kiedy złożyć.
          </p>
          <div className={s.heroActions}>
            <Button href="/logowanie" size="lg" icon="lock" variant="onDark" uppercase={false}>
              Zaloguj się przez mObywatel
            </Button>
            <Button href="/bez-logowania" variant="onDarkOutline" size="lg">
              Policz bez logowania
            </Button>
          </div>
          <p className={s.heroNote}>
            <Icon name="info" size={18} /> Logowanie i rejestry są symulowane na potrzeby demonstracji.
          </p>
        </div>
        <div className={s.panel}>
          <p className={s.panelTitle}>Po zalogowaniu nie wpisujesz</p>
          <ul className={s.panelList}>
            {[
              "historii ubezpieczenia i zarobków — mamy je z ZUS",
              "danych pracodawcy i tego, kto wypłaci zasiłek",
              "zwolnień lekarskich (e-ZLA) i stanu składek",
              "danych dziecka po rejestracji urodzenia",
            ].map((t) => (
              <li key={t}>
                <Icon name="check" size={20} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className={s.panelNote}>Zapytamy tylko o plany: termin porodu, podział urlopu i to, czy chcesz łączyć urlop z pracą.</p>
        </div>
      </section>

      <section className={s.section} aria-labelledby="entries-title">
        <div className={s.sectionHead}>
          <h2 id="entries-title">Od czego chcesz zacząć?</h2>
        </div>
        <div className={s.grid}>
          {entries.map((e) => (
            <Card key={e.href} linkCard as="article" compact>
              <span className={s.entryIcon}>
                <Icon name={e.icon} />
              </span>
              <h3 className={s.entryTitle}>
                <Link href={e.href}>{e.title}</Link>
              </h3>
              <p className={s.muted}>{e.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="how-title">
        <div className={s.sectionHead}>
          <h2 id="how-title">Jak to działa</h2>
          <p>Jedno narzędzie zamiast kilku kalkulatorów: zasiłek dla obojga rodziców, łączenie urlopu z pracą, adopcja i sytuacje szczególne.</p>
        </div>
        <ol className={s.steps}>
          {[
            ["Sprawdzamy uprawnienia", "Na dzień porodu: czy masz ubezpieczenie chorobowe, czy nie ma zaległości w składkach, kto wypłaci zasiłek."],
            ["Układasz plan", "Urlop macierzyński, rodzicielski i ojcowski obojga rodziców na jednej osi czasu — z kwotą na każdy miesiąc."],
            ["Ostrzegamy z wyprzedzeniem", "Widzisz ryzyka (np. zawieszenie firmy przed porodem) i terminy, których nie można przegapić."],
            ["Składasz wnioski", "Wnioski o urlopy i zasiłek wypełnione Twoimi danymi — do pracodawcy albo do ZUS."],
          ].map(([t, b], i) => (
            <li key={t} className={s.step}>
              <span className={s.stepNo}>Krok {i + 1}</span>
              <h3>{t}</h3>
              <p className={s.muted}>{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className={s.jury} aria-labelledby="jury-title">
        <div>
          <h2 id="jury-title">Przykładowe sprawy ZUS</h2>
          <p className={s.muted}>Wybierz lub wgraj jedną z 86 przykładowych spraw i porównaj wynik naszego kalkulatora z decyzją ZUS.</p>
        </div>
        <Button href="/sprawy" variant="secondary" iconAfter="chevron-right">
          Sprawdź przykładową sprawę
        </Button>
      </aside>
    </>
  );
}
