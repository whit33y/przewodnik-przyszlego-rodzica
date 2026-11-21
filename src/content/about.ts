/**
 * Copy for /o-serwisie. The requirement map links each item of the challenge brief
 * (docs/digest/01-brief-and-rules.md §3.2–3.4, §3.7) to the screen that fulfils it.
 */

export interface ScreenLink {
  href: string;
  label: string;
  /** Not yet available in this build. */
  coming?: boolean;
}

export interface Requirement {
  id: string;
  /** Short label: "a", "b", … or "Symulacja". */
  tag: string;
  text: string;
  screens: ScreenLink[];
}

const S = {
  uprawnienia: { href: "/uprawnienia", label: "Uprawnienia" },
  plan: { href: "/plan", label: "Plan rodzicielski" },
  kroki: { href: "/kroki", label: "Co i kiedy" },
  wnioski: { href: "/wnioski", label: "Wnioski" },
  trudna: { href: "/trudna-sytuacja", label: "Trudna sytuacja" },
  wsparcie: { href: "/wsparcie", label: "Wsparcie i organizacje" },
  sprawy: { href: "/sprawy", label: "Przykładowe sprawy" },
  admin: { href: "/admin", label: "Panel administracyjny" },
  logowanie: { href: "/logowanie", label: "Logowanie (symulacja)" },
  sytuacja: { href: "/sytuacja", label: "Twoja sytuacja" },
  planuje: { href: "/planuje-dziecko", label: "Planuję dziecko" },
  api: { href: "/api/docs", label: "Dokumentacja API", coming: true },
} satisfies Record<string, ScreenLink>;

export const aboutIntro = [
  "Sprawdza, czy masz prawo do zasiłku chorobowego w ciąży i zasiłku macierzyńskiego — na podstawie danych z rejestrów (w symulacji) albo Twoich odpowiedzi.",
  "Liczy, jak długo i w jakiej wysokości zasiłek przysługuje Tobie i drugiemu rodzicowi, także przy adopcji, rodzinie zastępczej i łączeniu urlopu z pracą.",
  "Pomaga ułożyć plan urlopów w jednym kalkulatorze i pokazuje, kto wypłaci zasiłek: pracodawca czy ZUS.",
  "Prowadzi przez dokumenty i terminy, przygotowuje wnioski i ostrzega przed sytuacjami, w których można stracić prawo do zasiłku.",
  "W trudnych sytuacjach podaje spokojnie opisane informacje i kontakty do organizacji, które pomagają bezpłatnie.",
];

export const requirements: Requirement[] = [
  { id: "a", tag: "a", text: "Świadczenia w czasie ciąży, także brak uprawnień: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego", screens: [S.uprawnienia, S.planuje] },
  { id: "b", tag: "b", text: "Kalkulator zasiłku macierzyńskiego dla obojga rodziców (okres i wysokość), z liczbą dzieci, ich wiekiem i zaświadczeniem „Za życiem”", screens: [S.plan] },
  { id: "c", tag: "c", text: "Kalkulator przy łączeniu pracy z urlopem rodzicielskim", screens: [S.plan] },
  { id: "d", tag: "d", text: "Symulacja, gdy z uprawnień korzystają oboje rodzice", screens: [S.plan] },
  { id: "e", tag: "e", text: "Kalkulator dla rodziców adopcyjnych i niezawodowych rodzin zastępczych", screens: [S.sytuacja, S.plan] },
  { id: "f", tag: "f", text: "Wysokość zasiłku z indywidualnej podstawy wymiaru — symulacja na konkretnej sprawie z zestawów", screens: [S.sprawy] },
  { id: "g", tag: "g", text: "Dokumenty, terminy i sposób złożenia wniosków; gdzie złożyć: u pracodawcy czy w ZUS", screens: [S.kroki, S.wnioski] },
  { id: "h", tag: "h", text: "Zagrożenia i ryzyka utraty uprawnień albo zmiany wymiaru i wysokości świadczeń", screens: [S.uprawnienia, S.kroki] },
  { id: "i", tag: "i", text: "Organizacje o charakterze wyłącznie charytatywnym, które wspierają rodziców w szczególnych sytuacjach", screens: [S.wsparcie, S.trudna] },
  { id: "j", tag: "j", text: "Kalkulator dla rodziców adopcyjnych i rodzin zastępczych", screens: [S.sytuacja, S.plan] },
  { id: "sim-login", tag: "Symulacja", text: "Logowanie przez mObywatela", screens: [S.logowanie] },
  { id: "sim-zus", tag: "Symulacja", text: "Pobranie danych z ZUS o ubezpieczeniu albo jego braku; wprowadzenie danych samodzielnie", screens: [S.logowanie, S.sytuacja] },
  { id: "sim-debt", tag: "Symulacja", text: "Zaświadczenie o zadłużeniu z tytułu składek na dzień powstania prawa do świadczenia", screens: [S.sytuacja] },
  { id: "sim-ezla", tag: "Symulacja", text: "Podgląd zaświadczeń lekarskich e-ZLA", screens: [S.sytuacja] },
  { id: "sim-pue", tag: "Symulacja", text: "Połączenie z PUE/eZUS: pytanie w razie wątpliwości, dane zgromadzone na koncie", screens: [S.wnioski, S.sytuacja] },
  { id: "sim-forms", tag: "Symulacja", text: "Wypełnienie wniosków o urlopy i świadczenia oraz przesłanie ich do pracodawcy lub ZUS", screens: [S.wnioski] },
  { id: "sim-usc", tag: "Symulacja", text: "Wniosek o odpis zupełny lub skrócony aktu urodzenia", screens: [S.wnioski] },
  { id: "sim-orgs", tag: "Symulacja", text: "Informacje o podmiotach udzielających wsparcia, np. po śmierci dziecka", screens: [S.wsparcie, S.trudna] },
  { id: "sim-links", tag: "Symulacja", text: "Przekierowanie do informacji ZUS, Ministerstwa Rodziny, Pracy i Polityki Społecznej oraz Państwowej Inspekcji Pracy", screens: [S.wsparcie] },
  { id: "admin", tag: "Panel", text: "Zmiana parametrów (stopy procentowe, maksymalny wymiar) w panelu administracyjnym", screens: [S.admin] },
  { id: "jury", tag: "Testy jury", text: "Wybór lub wgranie przykładowego wniosku, sprawdzenie ubezpieczenia i kalkulatora", screens: [S.sprawy] },
  { id: "api", tag: "Technika", text: "REST API między interfejsem a logiką", screens: [S.api] },
];

export const aboutText = {
  title: "O serwisie",
  lead: "Jak działa Przewodnik Rodzica, skąd bierze dane i czego nie robi.",
  simulation:
    "To prototyp przygotowany na HackNation 2026. Logowanie przez mObywatela i login.gov.pl, pobieranie danych z rejestrów, wysyłanie wniosków do pracodawcy i ZUS oraz wniosek do urzędu stanu cywilnego są symulowane. Serwis nie łączy się z żadnym prawdziwym systemem i nie używa oficjalnych logotypów ani godła. Ekrany symulacji mają żółte oznaczenie „SYMULACJA”.",
  aiRuntime: "W działaniu serwisu: brak. Żadna funkcja nie wywołuje modelu sztucznej inteligencji — każdy wynik da się powtórzyć i sprawdzić.",
  aiDev:
    "Podczas tworzenia: asystenci AI pomagali pisać kod i przepisywać zeskanowane przykładowe sprawy na dane strukturalne. Każda taka sprawa jest automatycznie walidowana (schemat i skan danych osobowych) i porównana ze stroną źródłową.",
  engine:
    "Wyniki liczy silnik reguł: czysty kod bez dostępu do sieci, bazy ani zegara, więc dla tych samych danych zawsze daje ten sam wynik. Każdy krok ma podstawę prawną, którą możesz rozwinąć przy wyniku.",
  params:
    "Stawki, wymiary urlopów i progi są w wersjonowanych zestawach parametrów z datą obowiązywania. Silnik wybiera zestaw obowiązujący w dniu powstania prawa do zasiłku. Nowy zestaw publikuje administrator w panelu.",
  privacy: [
    "Dane pobrane z rejestrów i Twoje odpowiedzi są przypisane tylko do Twojej sesji. Nie zakładamy kont.",
    "Sesja wygasa po 8 godzinach, a dane sesji usuwamy najpóźniej po 24 godzinach od ostatniej zmiany.",
    "Używamy wyłącznie technicznego pliku cookie z zaszyfrowanym identyfikatorem sesji. Nie ma analityki ani skryptów zewnętrznych.",
    "Przykładowe sprawy to zanonimizowane dane — bez imion, numerów PESEL, adresów i nazw pracodawców. Wgrany plik PDF nie opuszcza Twojego komputera: wysyłamy tylko jego skrót SHA-256.",
  ],
  licences: [
    "Next.js, React — MIT",
    "Radix UI — MIT",
    "Drizzle ORM — Apache-2.0",
    "better-sqlite3 — MIT",
    "zod — MIT",
    "iron-session — MIT",
    "Czcionka Open Sans — SIL Open Font License 1.1",
    "Vitest, Playwright, axe-core (tylko testy) — MIT, Apache-2.0, MPL-2.0",
  ],
} as const;
