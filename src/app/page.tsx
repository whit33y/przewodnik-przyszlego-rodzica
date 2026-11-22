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
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroText}>
          <p className={s.eyebrow}>Zasiłki z ZUS w ciąży i po porodzie</p>
          <h1 id="hero-title" className={s.title}>
            Sprawdź, co Ci przysługuje, zanim urodzi się dziecko
          </h1>
          <p className={s.lead}>Zaloguj się przez mObywatela. Dane o ubezpieczeniu i zarobkach weźmiemy z ZUS — Ty powiesz tylko, jakie masz plany.</p>
          <div className={s.heroActions}>
            <Button href="/logowanie" size="lg" icon="lock" uppercase={false}>
              Zaloguj się przez mObywatel
            </Button>
            <Button href="/bez-logowania" variant="secondary" size="lg" uppercase={false}>
              Policz bez logowania
            </Button>
          </div>
          <ul className={s.checks}>
            {["Czy masz prawo do zasiłku i ile wyniesie — miesiąc po miesiącu", "Urlopy obojga rodziców na jednej osi czasu", "Co, komu i do kiedy złożyć"].map((t) => (
              <li key={t}>
                <Icon name="check" size={20} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.photo}>
          {/* Pre-sized files in /public/img (no image optimiser in the standalone image); decorative, so alt is empty. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/rodzina-1400.jpg" srcSet="/img/rodzina-800.jpg 800w, /img/rodzina-1400.jpg 1400w, /img/rodzina-2000.jpg 2000w" sizes="(min-width: 960px) 50vw, 100vw" width={2000} height={1335} alt="" fetchPriority="high" />
          <p className={s.photoNote}>
            <Icon name="info" size={16} /> Logowanie i rejestry są symulowane
          </p>
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
