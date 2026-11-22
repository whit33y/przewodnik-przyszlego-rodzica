/**
 * Polish copy for "Co i kiedy" (/kroki): step titles per engine document / deadline code, group headings,
 * routing explanations and the static guide sections that fix links point to.
 * Tone (docs/plan/05 §7): what applies first, one instruction per sentence, no hurry, no blame, no promises.
 */

export type StepGroup = "now" | "beforeBirth" | "atBirth" | "first21Days" | "duringLeave" | "afterLeave";
export type StepWho = "you" | "employer" | "otherParent" | "doctor" | "court" | "system";

type Vals = Record<string, string | number | undefined>;
export const fill = (t: string, v: Vals = {}) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : "…"));

export interface StepCopy {
  title: string;
  body?: string;
  /** Group when the item has no date of its own. */
  group: StepGroup;
  /** Who acts — overrides the engine's `providedBy` when the user is the one who has to do something. */
  who?: StepWho;
}

/** Engine `documents[].code` → step copy. Placeholders: {from}, {to}, {date}, {days}, {forward}. */
export const documentStep: Record<string, StepCopy> = {
  ZAM: { title: "Wniosek o zasiłek macierzyński (ZAM)", body: "Od 24 października 2026 r. jeden formularz ZAM obejmuje urlop macierzyński, rodzicielski i ojcowski. Przygotowaliśmy dane, które w nim wpiszesz.", group: "first21Days" },
  "ZAM:zus": { title: "Wniosek o zasiłek macierzyński (ZAM) do ZUS", body: "Złóż go przez PUE/eZUS albo na papierze w placówce ZUS. Przygotowaliśmy dane, które w nim wpiszesz.", group: "first21Days" },
  LEAVE_APP_MATERNITY: { title: "Wniosek o urlop macierzyński", body: "Złóż go u pracodawcy.", group: "first21Days" },
  "LEAVE_APP_MATERNITY:adoption": { title: "Wniosek o urlop na warunkach urlopu macierzyńskiego", body: "Złóż go u pracodawcy razem z dokumentem z sądu.", group: "first21Days" },
  "LEAVE_APP_MATERNITY:preBirth": { title: "Wniosek o część urlopu macierzyńskiego przed porodem", body: "Urlop zacznie się {from}. Złóż wniosek u pracodawcy z wyprzedzeniem i dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.", group: "beforeBirth" },
  LEAVE_APP_PARENTAL: { title: "Wniosek o urlop rodzicielski", body: "Złóż go u pracodawcy najpóźniej 21 dni przed rozpoczęciem urlopu ({from}).", group: "duringLeave" },
  LEAVE_APP_PATERNITY: { title: "Wniosek o urlop ojcowski", body: "Złóż go u pracodawcy co najmniej 7 dni przed rozpoczęciem urlopu ({from}).", group: "duringLeave" },
  LEAVE_APP_SUPPLEMENTARY: { title: "Wniosek o uzupełniający urlop macierzyński", body: "Złóż go u pracodawcy najpóźniej 21 dni przed końcem urlopu macierzyńskiego. Dołącz zaświadczenie ze szpitala.", group: "duringLeave" },
  "Z-3": { title: "Pracodawca przekazuje zaświadczenie Z-3 do ZUS", body: "Pracodawca ma na to {forward} dni od otrzymania Twojego wniosku. Nie musisz nic robić — możesz zapytać dział kadr, czy je wysłał.", group: "first21Days" },
  "Z-3a": { title: "Zleceniodawca przekazuje zaświadczenie Z-3a do ZUS", body: "Nie musisz nic robić — możesz zapytać, czy je wysłał.", group: "first21Days" },
  "Z-3b": { title: "Zaświadczenie Z-3b", body: "Jako osoba prowadząca działalność wypełniasz je sama i składasz w ZUS.", group: "first21Days", who: "you" },
  "ZAS-53": { title: "Wniosek o zasiłek chorobowy (ZAS-53)", body: "Przy działalności zasiłek chorobowy wypłaca ZUS. Złóż wniosek przez PUE/eZUS albo na papierze.", group: "beforeBirth" },
  "ZAS-55": { title: "Wniosek o zasiłek do dnia porodu (ZAS-55)", body: "Przysługuje Ci zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu, bo umowa skończyła się z powodu likwidacji lub upadłości pracodawcy. Złóż wniosek w ZUS.", group: "beforeBirth" },
  WORK_CERTIFICATE: { title: "Świadectwo pracy od byłego pracodawcy", body: "Dołącz je do wniosku w ZUS. Jeśli go nie masz, poproś likwidatora o wydanie.", group: "beforeBirth", who: "you" },
  CERT_PREGNANCY_DURING_EMPLOYMENT: { title: "Zaświadczenie lekarskie, że ciąża trwała w czasie zatrudnienia", body: "Poproś lekarza prowadzącego ciążę i dołącz je do wniosku w ZUS.", group: "beforeBirth" },
  CERT_DUE_DATE: { title: "Zaświadczenie lekarskie o przewidywanej dacie porodu", body: "Poproś lekarza prowadzącego ciążę o zaświadczenie na zwykłym druku. Potrzebne, jeśli część urlopu wykorzystasz przed porodem.", group: "beforeBirth" },
  "E-ZLA": { title: "Zwolnienie lekarskie (e-ZLA)", body: "Nie musisz — lekarz wystawia zwolnienie elektronicznie, a ZUS i pracodawca mają je w systemie e-ZLA.", group: "beforeBirth" },
  BIRTH_ACT: { title: "Odpis skrócony aktu urodzenia dla pracodawcy", body: "Pracodawca, który sam wypłaca zasiłek, potrzebuje odpisu. Zamówisz go w urzędzie stanu cywilnego — także przez internet.", group: "atBirth", who: "you" },
  "BIRTH_ACT:registry": { title: "Odpis aktu urodzenia", body: "Nie musisz — mamy to z rejestru stanu cywilnego. ZUS pobierze dane dziecka sam.", group: "atBirth" },
  BIRTH_ACT_STILLBORN: { title: "Akt urodzenia z adnotacją", body: "Dołącz odpis do wniosku.", group: "atBirth", who: "you" },
  "BIRTH_ACT_STILLBORN:registry": { title: "Akt urodzenia z adnotacją", body: "Nie musisz — mamy to z rejestru stanu cywilnego.", group: "atBirth" },
  CERT_STILLBIRTH: { title: "Zaświadczenie o urodzeniu martwego dziecka", body: "Wystawia je lekarz albo położna. Poproś o dokument o tej nazwie — wystarczy zamiast aktu urodzenia.", group: "atBirth" },
  "Z-12": { title: "Wniosek o zasiłek pogrzebowy (Z-12)", body: "Możesz go złożyć w ZUS w ciągu 12 miesięcy. Dołącz rachunki za pogrzeb.", group: "atBirth" },
  CERT_HOSPITAL_STAY: { title: "Zaświadczenie o pobycie dziecka w szpitalu", body: "Poproś szpital o zaświadczenie na aktualnym wzorze: z okresem pobytu oraz tygodniem ciąży albo masą urodzeniową dziecka.", group: "atBirth" },
  OTHER_PARENT_STATEMENT_SUPPLEMENTARY: { title: "Oświadczenie drugiego rodzica o urlopie uzupełniającym", body: "Potwierdzasz w nim, że drugi rodzic nie będzie korzystać z tego urlopu. Jest we wniosku o urlop uzupełniający.", group: "duringLeave", who: "you" },
  OTHER_PARENT_STATEMENT_PARENTAL: { title: "Informacja o urlopie rodzicielskim drugiego rodzica", body: "We wniosku podajesz, czy i kiedy drugi rodzic korzysta z urlopu rodzicielskiego. Wpisaliśmy to na podstawie Twojego planu.", group: "duringLeave", who: "you" },
  ZA_ZYCIEM_STATEMENT: { title: "Zaświadczenie „Za życiem” albo oświadczenie", body: "Pracodawcy dołączasz kopię zaświadczenia. W ZUS wystarczy oświadczenie, że dziecko je ma.", group: "duringLeave", who: "you" },
  EMPLOYER_CERT_WORK_COMBINATION: { title: "Pracodawca potwierdza ZUS łączenie urlopu z pracą", body: "Pracodawca przekazuje zaświadczenie o okresie urlopu i wymiarze pracy. Nie musisz nic robić.", group: "duringLeave" },
  PATERNITY_STATEMENT: { title: "Oświadczenie, czy korzystałeś już z urlopu ojcowskiego", body: "Jest we wniosku o urlop ojcowski.", group: "duringLeave", who: "you" },
  "ZAS-26": { title: "Oświadczenie o dacie przyjęcia dziecka na wychowanie", body: "Podajesz w nim datę, od której dziecko jest pod Twoją opieką.", group: "atBirth", who: "you" },
  COURT_PETITION_CERT: { title: "Zaświadczenie sądu o dacie złożenia wniosku o przysposobienie", body: "Poproś sąd rodzinny. Może to być też kopia wniosku z pieczęcią sądu i datą urodzenia dziecka.", group: "atBirth" },
  FOSTER_PLACEMENT_ORDER: { title: "Postanowienie sądu o umieszczeniu dziecka w rodzinie zastępczej", body: "Dołącz kopię postanowienia albo umowy ze starostą.", group: "atBirth" },
  MOTHER_STATEMENT_TAKEOVER: { title: "Oświadczenie matki o rezygnacji z części urlopu", body: "Dołącz je do wniosku o przejęcie urlopu.", group: "duringLeave" },
  SINGLE_TITLE_STATEMENT: { title: "Oświadczenie o jedynym tytule do ubezpieczenia", body: "Jeśli zasiłek netto wyjdzie poniżej 1 000 zł, ZUS go podwyższy — pod warunkiem tego oświadczenia. Zaznaczysz je we wniosku ZAM.", group: "first21Days", who: "you" },
};

/** Engine `deadlines[].code` → copy for a deadline that is not merged into a document step. */
export const deadlineStep: Record<string, StepCopy> = {
  RATE_OPTION_21_DAYS: { title: "Ostatni dzień na wybór 81,5%", body: "Wniosek o urlop (zasiłek) macierzyński i rodzicielski złożony razem do tego dnia daje 81,5% podstawy przez cały okres.", group: "first21Days" },
  PARENTAL_APPLICATION: { title: "Wniosek o kolejną część urlopu rodzicielskiego", body: "Złóż go u pracodawcy najpóźniej 21 dni przed rozpoczęciem tej części ({from}).", group: "duringLeave" },
  PATERNITY_APPLICATION: { title: "Wniosek o kolejną część urlopu ojcowskiego", body: "Złóż go u pracodawcy co najmniej 7 dni przed rozpoczęciem ({from}).", group: "duringLeave" },
  SUPPLEMENTARY_APPLICATION: { title: "Wniosek o zasiłek za okres urlopu uzupełniającego", body: "Złóż go przed końcem zasiłku za okres urlopu macierzyńskiego. Dołącz zaświadczenie ze szpitala.", group: "duringLeave" },
  CLAIM_LIMITATION: { title: "Ostatni dzień na wniosek o zasiłek: {leave}", body: "Prawo do zasiłku przedawnia się 6 miesięcy po zakończeniu okresu, za który przysługuje. Jeśli wniosek złożysz wcześniej, nic więcej nie musisz robić.", group: "afterLeave" },
  PATERNITY_EXPIRY: { title: "Urlop ojcowski wykorzystaj do {date}", body: "Przysługuje do ukończenia przez dziecko 12 miesięcy. Potem przepada.", group: "duringLeave" },
  PARENTAL_HORIZON: { title: "Urlop rodzicielski możesz wykorzystać do {date}", body: "Do końca roku, w którym dziecko kończy 6 lat.", group: "afterLeave" },
};

/** Steps the engine does not list as documents but every parent goes through. */
export const syntheticStep = {
  registerBirth: { title: "Zgłoś urodzenie dziecka w urzędzie stanu cywilnego", body: "Masz na to 21 dni od porodu. Może to zrobić każde z rodziców — na przykład tata, gdy mama jest jeszcze w szpitalu. Dziecko dostanie numer PESEL, a ZUS pobierze dane z rejestru." },
  otherParentPaternity: { title: "Drugi rodzic: wniosek o urlop ojcowski u swojego pracodawcy", body: "Składa go sam, najpóźniej 7 dni przed urlopem, który zaplanowaliście od {from}. Urlop ojcowski trzeba wykorzystać w ciągu 12 miesięcy od porodu." },
  otherParentParental: { title: "Drugi rodzic: wniosek o swoją część urlopu rodzicielskiego", body: "Składa go u swojego pracodawcy najpóźniej 21 dni przed urlopem, który zaplanowaliście od {from}. Jego 9 tygodni przepada, jeśli z nich nie skorzysta." },
  registerBirthDone: { title: "Urodzenie dziecka jest zarejestrowane", body: "Nie musisz — mamy to z rejestru stanu cywilnego. Dziecko ma już numer PESEL." },
  registerBirthLoss: { title: "Zgłoszenie urodzenia w urzędzie stanu cywilnego", body: "Urząd sporządza akt urodzenia z adnotacją. Jeśli aktu nie sporządzono, wystarczy zaświadczenie od lekarza albo położnej." },
  registerBirthLossDone: { title: "Akt urodzenia jest w rejestrze", body: "Nie musisz niczego donosić — mamy to z rejestru stanu cywilnego." },
  returnToWork: { title: "Powrót do pracy", body: "Wracasz na to samo albo równorzędne stanowisko. Jeśli chcesz zostać dłużej z dzieckiem, możesz złożyć wniosek o urlop wychowawczy." },
} as const;

export const groupHeading: Record<StepGroup, string> = {
  now: "Do zrobienia teraz",
  beforeBirth: "Przed porodem",
  atBirth: "Po urodzeniu dziecka",
  first21Days: "Pierwsze 21 dni",
  duringLeave: "W trakcie urlopu",
  afterLeave: "Po urlopie",
};

export const groupHeadingAdoption: Partial<Record<StepGroup, string>> = {
  beforeBirth: "Przed przyjęciem dziecka",
  atBirth: "Po przyjęciu dziecka",
  first21Days: "Pierwsze 21 dni po przyjęciu dziecka",
};

export const groupHeadingLoss: Partial<Record<StepGroup, string>> = {
  atBirth: "Po porodzie",
  first21Days: "W najbliższych tygodniach",
  duringLeave: "Później",
  afterLeave: "Później",
};

export const whoLabel: Record<StepWho, string> = {
  you: "Ty",
  employer: "pracodawca",
  otherParent: "drugi rodzic",
  doctor: "lekarz",
  court: "sąd",
  system: "system",
};

export const toLabel = { employer: "pracodawca", zus: "ZUS", usc: "urząd stanu cywilnego", you: "Ty" } as const;

export const channelLabel = {
  paper: "na papierze",
  pue: "przez PUE/eZUS",
  employerAny: "papierowo lub elektronicznie",
} as const;

/** Routing strip: where applications go and why (keyed by fileWith/benefitPayer). */
export const routingCopy = {
  employerPays: { where: "u pracodawcy", why: "Twój pracodawca zgłasza do ubezpieczenia ponad 20 osób, więc sam wypłaca zasiłek. Wszystkie wnioski składasz u niego." },
  employerForwards: { where: "u pracodawcy", why: "Twój pracodawca zgłasza do ubezpieczenia nie więcej niż 20 osób. Wnioski składasz u niego, a on w ciągu {days} dni przekazuje je do ZUS. Zasiłek wypłaca ZUS." },
  zusSelf: { where: "w ZUS", why: "Prowadzisz działalność, więc zasiłek wypłaca ZUS. Wnioski złożysz przez PUE/eZUS albo na papierze." },
  zusAfterTitle: { where: "w ZUS", why: "Zatrudnienie się skończyło, więc zasiłek wypłaca ZUS. Wnioski złożysz przez PUE/eZUS albo na papierze." },
  zusOther: { where: "w ZUS", why: "Zasiłek wypłaca ZUS. Wnioski złożysz przez PUE/eZUS albo na papierze." },
} as const;

export const registryName: Record<string, string> = {
  rsc: "rejestru stanu cywilnego",
  "zus-ezla": "systemu e-ZLA",
};

export const stepsText = {
  lead: "Dokumenty, terminy i miejsce złożenia — krok po kroku, na podstawie Twojego planu.",
  calendar: "Dodaj terminy do kalendarza",
  calendarHint: "Plik .ics zawiera tylko daty i nazwy kroków — bez Twoich danych osobowych.",
  fillForm: "Wypełnij wniosek",
  openSheet: "Zobacz dane do wniosku",
  notYours: "Nie musisz nic robić",
  sent: "Wysłano (symulacja)",
  handed: "Przekazano pracodawcy",
  counterLeft: "Zostało {n} dni — do {date}.",
  counterFromBirth: "Liczone od dnia porodu.",
  counterFromCare: "Liczone od dnia przyjęcia dziecka.",
  counterPassed: "Ten okres minął {date}.",
  overdue: "termin minął",
  alreadyPaid: "Wniosek jest już złożony — zasiłek jest wypłacany.",
  lossNote: "Poniżej jest tylko to, co niezbędne. Możesz wrócić do tego później.",
  lossLink: "Informacje i wsparcie w trudnej sytuacji",
  missingDate: "Podaj przewidywaną datę porodu, a ułożymy terminy. Poniżej to, co możesz zrobić już teraz.",
  noSteps: "Na razie nie ma tu nic do zrobienia.",
} as const;

export interface GuideSection {
  id: "ubezpieczenie" | "skladki" | "dzialalnosc" | "dowody" | "zaswiadczenia" | "pracodawca";
  title: string;
  intro: string;
  points: string[];
}

/** Static guide below the checklist — the targets of `fixHref` (/kroki#…). */
export const guideSections: GuideSection[] = [
  {
    id: "ubezpieczenie",
    title: "Dobrowolne ubezpieczenie chorobowe",
    intro: "Przy działalności i umowie zlecenia ubezpieczenie chorobowe jest dobrowolne. Bez niego zasiłek macierzyński nie przysługuje.",
    points: [
      "Zgłoś się na formularzu ZUS ZUA (albo ZZA, jeśli masz tylko ubezpieczenie zdrowotne). Przy zleceniu zgłoszenie składa zleceniodawca.",
      "Ubezpieczenie zaczyna się od dnia, w którym ZUS dostanie zgłoszenie. Nie da się go zgłosić wstecz.",
      "Najszybciej zrobisz to przez PUE/eZUS — zgłoszenie dociera tego samego dnia.",
      "Po zakończeniu zasiłku macierzyńskiego dobrowolne ubezpieczenie trzeba zgłosić ponownie, jeśli chcesz z niego dalej korzystać.",
    ],
  },
  {
    id: "skladki",
    title: "Zaległości w składkach",
    intro: "Przy działalności zasiłek nie zostanie wypłacony, dopóki zaległość jest wyższa niż 1% minimalnego wynagrodzenia (48,06 zł w 2026 r.).",
    points: [
      "Sprawdź saldo konta na PUE/eZUS w zakładce „Płatnik” albo zadzwoń do ZUS: 22 560 16 00.",
      "Spłać całą zaległość razem z odsetkami. Częściowa spłata nie wystarczy.",
      "Masz na to 6 miesięcy od dnia, w którym powstało prawo do zasiłku (zwykle od porodu). Po tym terminie prawo do zasiłku wygasa.",
      "Układ ratalny nie wystarczy — liczy się spłata. Po spłacie ZUS wypłaci zasiłek za cały okres.",
    ],
  },
  {
    id: "dzialalnosc",
    title: "Działalność gospodarcza w okolicy porodu",
    intro: "W czasie zawieszenia działalności nie podlegasz ubezpieczeniu chorobowemu, więc w dniu porodu musisz mieć działalność aktywną.",
    points: [
      "Nie zawieszaj działalności w okresie, w którym może nastąpić poród — także kilka tygodni przed i po terminie.",
      "Jeśli zawieszenie jest już zgłoszone w CEIDG, zmień jego datę początkową na późniejszą niż poród.",
      "Po zakończeniu zasiłku zgłoś się ponownie do dobrowolnego ubezpieczenia chorobowego (ZUS ZUA).",
    ],
  },
  {
    id: "dowody",
    title: "Dowody, że naprawdę pracujesz",
    intro: "Gdy umowa zaczęła się niedługo przed ciążą lub porodem, ZUS może sprawdzić, czy praca była faktycznie wykonywana. To nie jest odmowa.",
    points: [
      "Umowa o pracę albo zlecenia i zakres obowiązków.",
      "Lista obecności, grafik pracy, ewidencja czasu pracy.",
      "Badania lekarskie medycyny pracy i szkolenie BHP.",
      "Przelewy wynagrodzenia na konto, faktury, korespondencja służbowa, wytworzone dokumenty.",
      "Sprawdzenie trwa zwykle 2–4 miesiące. Od decyzji ZUS możesz się odwołać do sądu.",
    ],
  },
  {
    id: "zaswiadczenia",
    title: "Które zaświadczenie od lekarza?",
    intro: "Każdy urlop wymaga innego dokumentu. Poproś o zaświadczenie o dokładnie tej nazwie — inne oznacza wezwanie do uzupełnienia.",
    points: [
      "Urlop przed porodem: zaświadczenie lekarskie o przewidywanej dacie porodu, na zwykłym druku.",
      "Dziecko w szpitalu albo wcześniak: zaświadczenie o pobycie dziecka w szpitalu (na aktualnym wzorze), z tygodniem ciąży albo masą urodzeniową.",
      "Dłuższy urlop rodzicielski: zaświadczenie „Za życiem” o ciężkim i nieodwracalnym upośledzeniu albo nieuleczalnej chorobie — to inny dokument niż zaświadczenie o pobycie w szpitalu.",
      "Urodzenie martwego dziecka: akt urodzenia z adnotacją albo zaświadczenie o urodzeniu martwego dziecka od lekarza lub położnej.",
    ],
  },
  {
    id: "pracodawca",
    title: "Zaświadczenie pracodawcy (Z-3)",
    intro: "Gdy zasiłek wypłaca ZUS, pracodawca przekazuje do ZUS zaświadczenie Z-3 razem z Twoim wnioskiem — w ciągu 7 dni.",
    points: [
      "Z-3 zawiera Twoje wynagrodzenie z ostatnich 12 miesięcy, okresy urlopów i wymiar czasu pracy.",
      "Poproś dział kadr o kopię i sprawdź: wymiar etatu, kwoty wynagrodzenia, okresy bez wynagrodzenia (np. urlop bezpłatny), premie.",
      "Pracodawca wysyła Z-3 przez PUE/eZUS. Status sprawy zobaczysz w swoim profilu na PUE/eZUS.",
      "Jeśli pracodawca zwleka, ZUS może go wezwać. Możesz też zapytać ZUS przez PUE/eZUS.",
    ],
  },
];

export const guideAnchors = guideSections.map((g) => g.id);
