/**
 * Polish copy for /wnioski: leave applications (content per the RW regulation, Dz.U. 2025 poz. 322),
 * "dane do wniosku" sheets for ZAM / ZAS-53 / ZAS-55, the USC birth-certificate request and the PUE question.
 * Placeholders in {braces} are filled by src/server/forms.ts.
 */

export type FormKind =
  | "leave-maternity"
  | "leave-adoption"
  | "leave-parental"
  | "leave-parental-work"
  | "leave-paternity"
  | "leave-supplementary"
  | "leave-resignation"
  | "leave-takeover"
  | "zam"
  | "zas-53"
  | "zas-55"
  | "usc-birth"
  | "pue-question";

export const RW = "rozporządzenia w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem (Dz.U. z 2025 r. poz. 322)";

export interface LeaveCopy {
  slug: string;
  title: string;
  /** Short name for lists. */
  short: string;
  /** Printed heading. */
  heading: string;
  legal: string;
  /** What the form is, in one plain sentence (list card). */
  about: string;
}

export const leaveCopy: Record<Extract<FormKind, `leave-${string}`>, LeaveCopy> = {
  "leave-maternity": {
    slug: "urlop-macierzynski",
    title: "Wniosek o urlop macierzyński",
    short: "Urlop macierzyński",
    heading: "Wniosek o udzielenie urlopu macierzyńskiego",
    legal: `art. 180 Kodeksu pracy, § 2 ${RW}`,
    about: "Urlop od dnia porodu, z prośbą o urlop rodzicielski zaraz po nim.",
  },
  "leave-adoption": {
    slug: "urlop-na-warunkach-macierzynskiego",
    title: "Wniosek o urlop na warunkach urlopu macierzyńskiego",
    short: "Urlop na warunkach macierzyńskiego",
    heading: "Wniosek o udzielenie urlopu na warunkach urlopu macierzyńskiego",
    legal: `art. 183 Kodeksu pracy, § 18 ${RW}`,
    about: "Urlop po przyjęciu dziecka na wychowanie.",
  },
  "leave-parental": {
    slug: "urlop-rodzicielski",
    title: "Wniosek o urlop rodzicielski",
    short: "Urlop rodzicielski",
    heading: "Wniosek o udzielenie urlopu rodzicielskiego",
    legal: `art. 182¹d § 1 Kodeksu pracy, § 15 ${RW}`,
    about: "Okres urlopu, numer części i informacja o drugim rodzicu.",
  },
  "leave-parental-work": {
    slug: "laczenie-z-praca",
    title: "Wniosek o łączenie urlopu rodzicielskiego z pracą",
    short: "Łączenie urlopu z pracą",
    heading: "Wniosek o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy",
    legal: `art. 182¹e Kodeksu pracy, § 16 ${RW}`,
    about: "Wymiar czasu pracy w czasie urlopu i wykorzystanie wydłużenia.",
  },
  "leave-paternity": {
    slug: "urlop-ojcowski",
    title: "Wniosek o urlop ojcowski",
    short: "Urlop ojcowski",
    heading: "Wniosek o udzielenie urlopu ojcowskiego",
    legal: `art. 182³ Kodeksu pracy, § 17 ${RW}`,
    about: "Okres urlopu i oświadczenie o wcześniejszym korzystaniu.",
  },
  "leave-supplementary": {
    slug: "urlop-uzupelniajacy",
    title: "Wniosek o uzupełniający urlop macierzyński",
    short: "Urlop uzupełniający",
    heading: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
    legal: `art. 180² § 4 Kodeksu pracy, § 14 ${RW}`,
    about: "Dodatkowe tygodnie za pobyt dziecka w szpitalu.",
  },
  "leave-resignation": {
    slug: "rezygnacja-z-urlopu",
    title: "Wniosek o rezygnację z części urlopu macierzyńskiego",
    short: "Rezygnacja z części urlopu",
    heading: "Wniosek w sprawie rezygnacji z pozostałej części urlopu macierzyńskiego",
    legal: `art. 180 § 8 Kodeksu pracy, § 3 ${RW}`,
    about: "Data powrotu do pracy — resztę urlopu przejmuje ojciec dziecka.",
  },
  "leave-takeover": {
    slug: "przejecie-urlopu",
    title: "Wniosek o pozostałą część urlopu macierzyńskiego",
    short: "Przejęcie urlopu macierzyńskiego",
    heading: "Wniosek o udzielenie pozostałej części urlopu macierzyńskiego",
    legal: `art. 180 § 9 Kodeksu pracy, § 5 ${RW}`,
    about: "Okres urlopu, który przejmujesz po matce dziecka.",
  },
};

export const sheetCopy = {
  zam: {
    slug: "zam",
    title: "Dane do wniosku o zasiłek macierzyński (ZAM)",
    short: "Zasiłek macierzyński — ZAM",
    about: "Wartości, które wpiszesz w formularzu ZAM — każdą możesz skopiować.",
    intro: "To nie jest formularz ZUS — to ściągawka. Od 24 października 2026 r. jeden wniosek ZAM obejmuje urlop macierzyński, rodzicielski i ojcowski. Skopiuj wartości i wpisz je w formularzu na PUE/eZUS albo w wersji papierowej.",
    link: { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", label: "Formularz i informacje o zasiłku macierzyńskim na zus.pl" },
  },
  "zas-53": {
    slug: "zas-53",
    title: "Dane do wniosku o zasiłek chorobowy (ZAS-53)",
    short: "Zasiłek chorobowy — ZAS-53",
    about: "Wartości do wniosku o zasiłek chorobowy dla osób, którym wypłaca go ZUS.",
    intro: "To ściągawka do formularza ZAS-53. Zwolnienie lekarskie (e-ZLA) ZUS ma w systemie — we wniosku podajesz pozostałe dane.",
    link: { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy", label: "Formularz i informacje o zasiłku chorobowym na zus.pl" },
  },
  "zas-55": {
    slug: "zas-55",
    title: "Dane do wniosku o zasiłek do dnia porodu (ZAS-55)",
    short: "Zasiłek do dnia porodu — ZAS-55",
    about: "Zasiłek w wysokości zasiłku macierzyńskiego po likwidacji lub upadłości pracodawcy.",
    intro: "Gdy w ciąży umowa skończyła się z powodu likwidacji albo upadłości pracodawcy, do dnia porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego. Wypłaca go ZUS.",
    link: { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", label: "Informacje o zasiłkach macierzyńskich na zus.pl" },
  },
} as const;

export const uscCopy = {
  slug: "odpis-aktu-urodzenia",
  title: "Wniosek o odpis aktu urodzenia",
  short: "Odpis aktu urodzenia (USC)",
  about: "Zamów odpis w urzędzie stanu cywilnego — z dostawą na skrzynkę e-Doręczeń albo do odbioru.",
  zusNote: "ZUS nie wymaga odpisu — pobiera dane z rejestru. Odpis może być potrzebny pracodawcy.",
  disabled: "Odpis zamówisz, gdy urodzenie dziecka zostanie zarejestrowane w urzędzie stanu cywilnego.",
  types: [
    { value: "skrocony", label: "Odpis skrócony", hint: "Wystarcza w większości spraw, także u pracodawcy.", feeGrosze: 2200 },
    { value: "zupelny", label: "Odpis zupełny", hint: "Zawiera wszystkie wpisy i zmiany w akcie.", feeGrosze: 3300 },
    { value: "wielojezyczny", label: "Odpis wielojęzyczny", hint: "Do użycia za granicą, w krajach UE.", feeGrosze: 2200 },
  ],
  feeNote: "Pierwszy odpis skrócony urząd wydaje bezpłatnie przy rejestracji urodzenia. Za kolejne płacisz opłatę skarbową.",
  purposes: [
    { value: "pracodawca", label: "Dla pracodawcy (wniosek o urlop)" },
    { value: "zlobek", label: "Do żłobka lub przedszkola" },
    { value: "zagranica", label: "Do sprawy za granicą" },
    { value: "inny", label: "Inny cel" },
  ],
  delivery: [
    { value: "e-doreczenia", label: "Na skrzynkę e-Doręczeń", hint: "Dokument elektroniczny, z podpisem urzędu." },
    { value: "urzad", label: "Odbiór osobiście w urzędzie", hint: "Urząd poinformuje Cię, kiedy odpis będzie gotowy." },
  ],
} as const;

export const pueCopy = {
  slug: "pytanie-pue",
  title: "Zadaj pytanie w ZUS (PUE/eZUS)",
  short: "Pytanie do ZUS",
  about: "Wiadomość do ZUS przez PUE/eZUS. Odpowiedź zwykle w ciągu 7 dni.",
  topics: ["Zasiłek macierzyński", "Urlop rodzicielski", "Składki i ubezpieczenie", "Dokumenty i zaświadczenia", "Wypłata zasiłku", "Inna sprawa"],
  answer: "ZUS odpowiada zwykle w ciągu 7 dni. Odpowiedź zobaczysz na PUE/eZUS w zakładce „Wiadomości”.",
} as const;

export const formsText = {
  lead: "Wnioski wypełnione danymi z rejestrów i Twojego planu. Sprawdź je, wydrukuj albo wyślij (symulacja).",
  leaveHeading: "Wnioski o urlop — do pracodawcy",
  benefitHeading: "Wnioski o zasiłek",
  otherHeading: "Inne sprawy",
  sentHeading: "Wysłane",
  noneSent: "Nic jeszcze nie wysłano.",
  nonEmployee: "Urlopu udziela pracodawca, a Ty nie masz umowy o pracę — dlatego składasz tylko wniosek o zasiłek do ZUS.",
  statusTodo: "Do wysłania",
  statusSent: "Wysłano",
  open: "Otwórz",
  print: "Drukuj / zapisz PDF",
  sendEmployer: "Wyślij do pracodawcy (symulacja)",
  sendZus: "Wyślij do ZUS przez PUE/eZUS (symulacja)",
  sendUsc: "Wyślij do urzędu stanu cywilnego (symulacja)",
  sendPue: "Wyślij pytanie (symulacja)",
  simNote: "To jest symulacja — nic nie zostało wysłane.",
  back: "← Wszystkie wnioski",
  backSteps: "Wróć do listy „Co i kiedy”",
  notApplicable: "Ten wniosek nie dotyczy Twojej sytuacji",
  notApplicableBody: "Na podstawie Twojego planu nie musisz go składać. Zobacz listę wniosków, które Cię dotyczą.",
  previewNote: "Sprawdź wniosek. Pola z ramką możesz uzupełnić — to, czego nie wiemy, zostawiamy puste.",
  fromPlan: "z Twojego planu",
  notAttached: "nie dołączasz",
  personalFile: "Dokumentów, które są już w Twoich aktach osobowych, nie dołączasz (§ 22 rozporządzenia).",
  signature: "podpis",
  place: "Miejscowość",
  date: "Data",
  employer: "Pracodawca (nazwa i adres)",
  applicant: "Imię i nazwisko",
  confirmTitle: "Wysłano (symulacja)",
  confirmNumber: "Numer potwierdzenia",
  confirmAt: "Data i godzina",
  confirmTo: "Odbiorca",
  confirmWhat: "Wniosek",
  copy: "Kopiuj",
  copied: "Skopiowano",
  emptyValue: "uzupełnisz sam(a)",
} as const;

export const recipientLabel = { employer: "Pracodawca", zus: "ZUS (PUE/eZUS)", usc: "Urząd stanu cywilnego" } as const;

export const statementText = {
  jointParental: "Proszę o udzielenie, bezpośrednio po urlopie macierzyńskim, urlopu rodzicielskiego w okresie od {from} do {to} ({duration}).",
  rate815: "Wnoszę o wypłatę zasiłku macierzyńskiego w wysokości 81,5% podstawy wymiaru za cały okres urlopu macierzyńskiego i rodzicielskiego.",
  otherNoParental: "Drugi rodzic dziecka nie zamierza korzystać z urlopu rodzicielskiego ani z zasiłku macierzyńskiego za okres objęty wnioskiem.",
  otherParentalIn: "Drugi rodzic dziecka zamierza korzystać z urlopu rodzicielskiego w okresie {periods}.",
  ownNineWeeks: "Wnioskowany okres obejmuje 9 tygodni urlopu rodzicielskiego przysługujących wyłącznie mnie.",
  otherNoSupplementary: "Drugi rodzic dziecka nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego ani z zasiłku za ten okres.",
  paternityNotUsed: "Oświadczam, że nie korzystałem dotychczas z urlopu ojcowskiego na to dziecko.",
  paternityUsed: "Oświadczam, że korzystałem z urlopu ojcowskiego na to dziecko w okresie {periods}.",
  extensionWork: "Część urlopu powstałą z wydłużenia ({extension}) zamierzam łączyć z pracą w tym samym wymiarze.",
  extensionNoWork: "Części urlopu powstałej z wydłużenia nie zamierzam łączyć z pracą.",
  takenIntoCare: "Oświadczam, że dziecko przyjąłem/przyjęłam na wychowanie w dniu {date}.",
  takeoverNotify: "Zobowiązuję się poinformować pracodawcę o zmianie okoliczności, od których zależy prawo do urlopu.",
} as const;

export const attachmentText = {
  birthAct: "Odpis skrócony aktu urodzenia dziecka (albo kopia)",
  birthActRegistry: "nie dołączasz — dane są w rejestrze stanu cywilnego",
  dueDateCert: "Zaświadczenie lekarskie o przewidywanej dacie porodu (kopia)",
  stillbirthCert: "Zaświadczenie o urodzeniu martwego dziecka albo odpis aktu urodzenia z adnotacją",
  hospitalCert: "Zaświadczenie o pobycie dziecka w szpitalu (art. 180² § 5 Kodeksu pracy)",
  zaZyciem: "Kopia zaświadczenia „Za życiem”",
  courtPetition: "Zaświadczenie sądu o dacie złożenia wniosku o przysposobienie (albo kopia wniosku z poświadczeniem sądu)",
  fosterOrder: "Kopia postanowienia sądu o umieszczeniu dziecka w rodzinie zastępczej",
  adoptionOrder: "Kopia prawomocnego postanowienia o przysposobieniu dziecka",
  fatherApplication: "Kopia wniosku ojca dziecka o udzielenie pozostałej części urlopu macierzyńskiego",
  motherStatement: "Oświadczenie matki dziecka o zamiarze rezygnacji z pozostałej części urlopu macierzyńskiego",
} as const;

export const leaveGenitive: Partial<Record<string, string>> = {
  maternity: "urlopu macierzyńskiego",
  maternityOnAdoption: "urlopu na warunkach urlopu macierzyńskiego",
  supplementary: "uzupełniającego urlopu macierzyńskiego",
  parental: "urlopu rodzicielskiego",
  paternity: "urlopu ojcowskiego",
};

export const sheetRow = {
  benefitType: "Rodzaj zasiłku",
  period: "Okres — {leave}",
  rate: "Wysokość zasiłku (wariant)",
  rate815: "81,5% podstawy wymiaru przez cały okres",
  rateSplit: "100% za urlop macierzyński, 70% za urlop rodzicielski",
  rate100: "100% podstawy wymiaru",
  childBirth: "Data urodzenia dziecka",
  childExpected: "Przewidywana data porodu",
  childExpectedNote: "Datę urodzenia wpiszesz po porodzie.",
  takenIntoCare: "Data przyjęcia dziecka na wychowanie",
  childBirthDate: "Data urodzenia dziecka",
  childrenCount: "Liczba dzieci urodzonych przy jednym porodzie",
  childPesel: "PESEL dziecka",
  childPeselRegistry: "ZUS pobierze numer z rejestru — w formularzu możesz go przepisać z odpisu.",
  childPeselLater: "Dziecko dostanie PESEL po rejestracji urodzenia.",
  otherParent: "Drugi rodzic — urlop rodzicielski",
  otherParentNone: "Według planu nie korzysta z urlopu rodzicielskiego w tym okresie",
  otherParentIn: "Korzysta w okresie {periods}",
  bank: "Numer rachunku bankowego",
  bankNote: "Nie znamy tego numeru — wpisz go w formularzu.",
  singleTitle: "Oświadczenie o jedynym tytule do ubezpieczenia",
  singleTitleNote: "Zaznacz we wniosku, jeśli nie masz innego tytułu do ubezpieczenia — wtedy ZUS podwyższy zasiłek do 1 000 zł netto.",
  fileWith: "Gdzie składasz wniosek",
  document: "Dokument potwierdzający",
  sickPeriod: "Okres zwolnienia lekarskiego (e-ZLA)",
  sickNote: "ZUS ma zwolnienia w systemie e-ZLA — nie dołączasz ich.",
  annex4: "Oświadczenie o okolicznościach (załącznik 4)",
  annex4Note: "Zaznacz, czy masz prawo do emerytury lub renty, zasiłku dla bezrobotnych albo inną pracę.",
  art30Period: "Okres zasiłku do dnia porodu",
  art30Reason: "Przyczyna ustania zatrudnienia",
  art30Docs: "Dokumenty do dołączenia",
  art30DocsValue: "Świadectwo pracy; zaświadczenie lekarskie, że ciąża trwała w czasie zatrudnienia",
} as const;

export const endReasonText: Record<string, string> = {
  employerLiquidation: "likwidacja pracodawcy",
  employerBankruptcy: "upadłość pracodawcy",
  employerDeath: "śmierć pracodawcy",
  unlawfulTerminationJudgment: "rozwiązanie umowy z naruszeniem przepisów (wyrok sądu)",
};

/** Submission kinds that are not forms in the catalogue (stored by other endpoints). */
export const submissionKindLabel: Record<string, string> = {
  "pue-query": "Pytanie do ZUS (PUE/eZUS)",
};
