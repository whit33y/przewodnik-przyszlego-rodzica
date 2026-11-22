/**
 * Copy for /trudna-sytuacja — the quiet path (docs/plan/05-phase-4-guidance.md §4, tone guide §7).
 *
 * Rules for anyone editing this file:
 * - what applies first, then why; one instruction per sentence, with a recipient;
 * - documents named exactly as the office names them;
 * - no exclamation marks, no "niestety", no "gratulacje", no "maluszek", no hurry, no promises
 *   (ZUS or the employer decides);
 * - at most four steps per situation.
 *
 * Numbers come from the published parameter set (passed in as `LossParams`), never typed here.
 */

export interface LossParams {
  /** Weeks of maternity benefit after a stillbirth or an early death (KP 180¹ §1). */
  lossWeeks: number;
  /** Child's age in weeks below which the full loss period applies. */
  earlyDeathBeforeWeeks: number;
  /** Minimum days of benefit counted from the child's death. */
  minDaysFromDeath: number;
  /** Funeral grant, already formatted ("7 000 zł"). */
  funeralGrant: string;
  /** Mother's minimum weeks before an early takeover (KP 180 §6–11). */
  takeoverAfterWeeks: number;
  supplementary: {
    capExtreme: number;
    capPreterm: number;
    capTerm: number;
    extremeBeforeWeek: number;
    extremeMaxWeightG: number;
    pretermBeforeWeek: number;
    termMinConsecutiveDays: number;
    termFirstDayFrom: number;
    termFirstDayTo: number;
    leadDays: number;
  };
  parental: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number; reservedPerParent: number; leadDays: number };
}

export interface LossSection {
  /** In-page anchor. */
  id: string;
  title: string;
  /** Exactly one sentence. */
  acknowledgement: string;
  /** Charity ids from data/content/charities.json, in display order (two or three). */
  charities: string[];
  /** "Co Ci przysługuje" — the first sentence says what applies. */
  applies: string[];
  /** Optional "Dokumenty" list, one line each. */
  documents?: string[];
  /** "Co możesz zrobić" — at most four steps. */
  steps: string[];
  /** Where the rule comes from — shown last, small. */
  basis: string;
}

export const lossPage = {
  title: "Trudna sytuacja",
  lead: "Spokojnie opisane informacje na wypadek, gdy ciąża lub poród nie przebiegły tak, jak planowaliście. Przeczytaj tylko to, czego teraz potrzebujesz.",
  tocLabel: "Wybierz sytuację",
  talkHeading: "Z kim możesz porozmawiać",
  appliesHeading: "Co Ci przysługuje",
  documentsHeading: "Dokumenty",
  stepsHeading: "Co możesz zrobić",
  later: "Możesz wrócić do tego później.",
  backToList: "Wróć do listy sytuacji",
  decides:
    "Opisujemy zasady z przepisów i decyzji ZUS w podobnych sprawach. O zasiłku decyduje ZUS albo pracodawca, który go wypłaca — mogą poprosić o dodatkowe dokumenty.",
  questions: "Pytania możesz zadać ZUS przez PUE/eZUS albo telefonicznie w Centrum Obsługi Telefonicznej ZUS: 22 560 16 00.",
  urgentTitle: "Jeśli potrzebujesz rozmowy teraz",
  urgent:
    "Telefon zaufania dla dorosłych 116 123 i Centrum Wsparcia 800 70 2222 działają całą dobę i są bezpłatne. W sytuacji zagrożenia życia zadzwoń pod 112.",
  moreOrganisations: "Więcej organizacji, które pomagają rodzicom",
  stripTitle: "Na podstawie Twoich danych",
  stripMore: "Szczegóły i wyliczenie znajdziesz w Twoich uprawnieniach",
  stripNotGranted:
    "Według naszych wyliczeń zasiłek macierzyński w Twojej sytuacji może nie przysługiwać. Powód i to, co możesz zrobić, opisujemy w Twoich uprawnieniach.",
  stripSection: "Informacje dla Twojej sytuacji",
} as const;

/** Sentence for the personalised strip: "8 tygodni zasiłku macierzyńskiego w wysokości 100% podstawy, do 4 stycznia 2027." */
export function stripSentence(duration: string, ratePct: string | null, until: string | null): string {
  const rate = ratePct ? ` w wysokości ${ratePct} podstawy` : "";
  return `Według naszych wyliczeń przysługuje Ci ${duration} zasiłku macierzyńskiego${rate}${until ? `, do ${until}` : ""}.`;
}

export function lossSections(p: LossParams): LossSection[] {
  const s = p.supplementary;
  return [
    {
      id: "martwe-urodzenie",
      title: "Urodzenie martwego dziecka",
      acknowledgement: "Jest nam bardzo przykro z powodu śmierci Twojego dziecka.",
      charities: ["fundacja-ernesta", "fundacja-rodzic-po-ludzku", "fundacja-nagle-sami"],
      applies: [
        `Przysługuje Ci ${p.lossWeeks} tygodni zasiłku macierzyńskiego w wysokości 100% podstawy, licząc od dnia porodu.`,
        "Nie jest potrzebny żaden minimalny okres ubezpieczenia — liczy się to, że w dniu porodu masz ubezpieczenie chorobowe.",
        `Jeśli z jednego porodu urodziło się więcej dzieci i żadne nie przeżyło, okres też wynosi ${p.lossWeeks} tygodni.`,
        "Pracownicy przysługuje w tym czasie urlop macierzyński. Osoba, która nie jest pracownikiem, dostaje zasiłek za okres odpowiadający temu urlopowi.",
        `Osobie, która pokryła koszty pogrzebu, przysługuje zasiłek pogrzebowy ${p.funeralGrant} — w pełnej wysokości, także gdy koszty były niższe.`,
      ],
      documents: [
        "Skrócony odpis aktu urodzenia z adnotacją, że dziecko urodziło się martwe.",
        "Jeśli akt urodzenia nie został sporządzony: „zaświadczenie o martwym urodzeniu” wystawione przez lekarza lub położną na podstawie dokumentacji medycznej.",
        "Do zasiłku pogrzebowego: wniosek Z-12 i rachunki za pogrzeb.",
      ],
      steps: [
        "Poproś w szpitalu o jeden z dokumentów z listy powyżej.",
        "Jeśli jesteś pracownicą, złóż u pracodawcy wniosek o urlop macierzyński i dołącz ten dokument. Jeśli nie jesteś pracownicą, złóż w ZUS wniosek o zasiłek macierzyński (ZAM).",
        "Osoba, która pokryła koszty pogrzebu, składa w ZUS wniosek Z-12 w ciągu 12 miesięcy od dnia pogrzebu.",
        lossPage.questions,
      ],
      basis: "Art. 180¹ Kodeksu pracy; § 13 rozporządzenia MRPiPS z 27 września 2026 r. (Dz.U. 2026 poz. 1316); Poradnik dla rodziców ZUS.",
    },
    {
      id: "poronienie",
      title: "Poronienie",
      acknowledgement: "Jest nam bardzo przykro z powodu utraty ciąży.",
      charities: ["fundacja-ronic-po-ludzku", "fundacja-ernesta", "fundacja-czulosc"],
      applies: [
        `Jeśli lekarz lub położna wystawi zaświadczenie o martwym urodzeniu albo urząd sporządzi akt urodzenia z adnotacją, przysługuje Ci ${p.lossWeeks} tygodni zasiłku macierzyńskiego — bez względu na to, w którym tygodniu ciąży to się stało.`,
        "Jeśli takiego dokumentu nie ma, możesz skorzystać ze zwolnienia lekarskiego; zasiłek chorobowy w ciąży wynosi 100%.",
        `Osobie, która zorganizowała pogrzeb i pokryła jego koszty, przysługuje zasiłek pogrzebowy ${p.funeralGrant}.`,
      ],
      documents: [
        "„Zaświadczenie o martwym urodzeniu” od lekarza lub położnej albo skrócony odpis aktu urodzenia z adnotacją.",
        "Bez tych dokumentów: zwolnienie lekarskie (e-ZLA) — lekarz wysyła je do ZUS i do pracodawcy elektronicznie.",
      ],
      steps: [
        "Zapytaj lekarza lub położną, czy wystawią zaświadczenie o martwym urodzeniu.",
        "Z zaświadczeniem złóż u pracodawcy wniosek o urlop macierzyński. Jeśli nie jesteś pracownicą, złóż w ZUS wniosek ZAM.",
        "Jeśli zaświadczenia nie będzie, poproś lekarza o zwolnienie lekarskie.",
        "Osoba, która pokryła koszty pogrzebu, składa w ZUS wniosek Z-12 w ciągu 12 miesięcy od dnia pogrzebu.",
      ],
      basis: "§ 13 ust. 1 pkt 2 rozporządzenia MRPiPS z 27 września 2026 r. (Dz.U. 2026 poz. 1316); art. 180¹ Kodeksu pracy; art. 11 ustawy zasiłkowej.",
    },
    {
      id: "smierc-dziecka",
      title: "Śmierć dziecka po urodzeniu",
      acknowledgement: "Jest nam bardzo przykro z powodu śmierci Twojego dziecka.",
      charities: ["fundacja-nagle-sami", "fundacja-warszawskie-hospicjum-dla-dzieci", "fundacja-czulosc"],
      applies: [
        `Jeśli dziecko zmarło przed ukończeniem ${p.earlyDeathBeforeWeeks} tygodni życia, przysługuje Ci ${p.lossWeeks} tygodni zasiłku macierzyńskiego od dnia porodu, ale nie mniej niż ${p.minDaysFromDeath} dni od dnia śmierci dziecka.`,
        `Jeśli dziecko zmarło później, zasiłek przysługuje jeszcze przez ${p.minDaysFromDeath} dni od dnia śmierci.`,
        `Jeśli z jednego porodu urodziło się więcej dzieci, długość urlopu zależy od liczby dzieci, które żyją — i nie jest krótsza niż ${p.minDaysFromDeath} dni od dnia śmierci.`,
        `Osobie, która pokryła koszty pogrzebu, przysługuje zasiłek pogrzebowy ${p.funeralGrant}.`,
      ],
      documents: ["Skrócony odpis aktu zgonu dziecka — jeśli poprosi o niego pracodawca.", "Do zasiłku pogrzebowego: wniosek Z-12 i rachunki za pogrzeb."],
      steps: [
        "Przekaż pracodawcy albo ZUS — temu, kto wypłaca Ci zasiłek — datę śmierci dziecka.",
        "Drugi rodzic, który korzysta z urlopu ojcowskiego lub rodzicielskiego, przekazuje tę informację swojemu pracodawcy albo ZUS.",
        "Osoba, która pokryła koszty pogrzebu, składa w ZUS wniosek Z-12 w ciągu 12 miesięcy od dnia pogrzebu.",
        lossPage.questions,
      ],
      basis: "Art. 180¹ § 1–2 Kodeksu pracy; Poradnik dla rodziców ZUS.",
    },
    {
      id: "wczesniak",
      title: "Wcześniak lub dziecko w szpitalu",
      acknowledgement: "Pobyt dziecka w szpitalu to bardzo trudny czas, dlatego zebraliśmy tu wszystko, co dotyczy urlopu i zasiłku.",
      charities: ["fundacja-wczesniak-rodzice-rodzicom", "fundacja-koalicja-dla-wczesniaka"],
      applies: [
        "Przysługuje Ci uzupełniający urlop macierzyński: tydzień urlopu za każdy rozpoczęty tydzień pobytu dziecka w szpitalu.",
        `Jeśli dziecko urodziło się przed ${s.extremeBeforeWeek}. tygodniem ciąży albo ważyło nie więcej niż ${s.extremeMaxWeightG} g, urlop wynosi do ${s.capExtreme} tygodni.`,
        `Jeśli urodziło się przed ${s.pretermBeforeWeek}. tygodniem ciąży, urlop wynosi do ${s.capPreterm} tygodni.`,
        `Jeśli urodziło się o czasie, urlop wynosi do ${s.capTerm} tygodni, gdy dziecko było w szpitalu co najmniej ${s.termMinConsecutiveDays} dni z rzędu, a pobyt zaczął się między ${s.termFirstDayFrom}. a ${s.termFirstDayTo}. dniem życia.`,
        "Zasiłek za ten urlop wynosi 100% podstawy. Urlop zaczyna się zaraz po urlopie macierzyńskim i wykorzystuje go w całości jedno z rodziców.",
        "Po 8 tygodniach urlopu macierzyńskiego możesz przerwać urlop i wykorzystać jego resztę, gdy dziecko wyjdzie ze szpitala.",
        "Ostateczną długość urlopu uzupełniającego ZUS ustala po wypisie dziecka ze szpitala.",
      ],
      documents: [
        "„Zaświadczenie o pobycie dziecka w szpitalu” na aktualnym wzorze — z okresem pobytu oraz tygodniem ciąży, w którym dziecko się urodziło, albo jego masą urodzeniową.",
        "Oświadczenie drugiego rodzica, że nie skorzysta z urlopu uzupełniającego.",
      ],
      steps: [
        "Poproś szpital o zaświadczenie o pobycie dziecka w szpitalu na aktualnym wzorze.",
        `Najpóźniej ${s.leadDays} dni przed końcem urlopu macierzyńskiego złóż wniosek o uzupełniający urlop macierzyński u pracodawcy. Jeśli nie jesteś pracownikiem, złóż go w ZUS.`,
        "Do wniosku dołącz oświadczenie drugiego rodzica.",
        "Gdy dziecko wyjdzie ze szpitala, przekaż zaświadczenie za cały pobyt temu, kto wypłaca zasiłek.",
      ],
      basis: "Art. 180² i art. 181 Kodeksu pracy; art. 31 ust. 1 ustawy zasiłkowej; § 14 rozporządzenia MRPiPS z 11 marca 2025 r. (Dz.U. 2025 poz. 322).",
    },
    {
      id: "za-zyciem",
      title: "Ciężka choroba dziecka — zaświadczenie „Za życiem”",
      acknowledgement: "Diagnoza ciężkiej choroby dziecka to ogromne obciążenie, dlatego poniżej opisujemy, jakie wsparcie dają przepisy.",
      charities: ["fundacja-warszawskie-hospicjum-dla-dzieci", "fundacja-gajusz", "fundacja-dzieciom-zdazyc-z-pomoca"],
      applies: [
        `Z zaświadczeniem „Za życiem” urlop rodzicielski jest dłuższy: ${p.parental.zaZyciemSingle} tygodni przy jednym dziecku i ${p.parental.zaZyciemMultiple} tygodni przy więcej niż jednym dziecku z jednego porodu (zamiast ${p.parental.single} i ${p.parental.multiple}).`,
        `Każde z rodziców ma w tej puli ${p.parental.reservedPerParent} tygodni tylko dla siebie.`,
        "Zaświadczenie stwierdza ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę zagrażającą życiu, które powstały w czasie ciąży lub porodu.",
        "Wystawia je lekarz ubezpieczenia zdrowotnego ze specjalizacją II stopnia lub tytułem specjalisty z położnictwa i ginekologii, perinatologii, neonatologii, neurologii dziecięcej, kardiologii dziecięcej albo chirurgii dziecięcej.",
        "To inny dokument niż zaświadczenie o pobycie dziecka w szpitalu, które jest potrzebne do urlopu uzupełniającego.",
      ],
      documents: [
        "Zaświadczenie „Za życiem” — u pracodawcy kopia.",
        "Jeśli zasiłek wypłaca ZUS, wystarczy Twoje oświadczenie we wniosku, że dziecko ma takie zaświadczenie.",
      ],
      steps: [
        "Poproś lekarza specjalistę, który prowadzi dziecko, o zaświadczenie „Za życiem”.",
        `Najpóźniej ${p.parental.leadDays} dni przed rozpoczęciem urlopu rodzicielskiego złóż wniosek u pracodawcy i dołącz kopię zaświadczenia.`,
        "Jeśli zasiłek wypłaca ZUS, we wniosku złóż oświadczenie, że dziecko ma zaświadczenie „Za życiem”.",
      ],
      basis: "Art. 182¹a § 1–2 Kodeksu pracy; art. 4 ust. 3 ustawy z 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”; art. 61b ust. 4a ustawy zasiłkowej.",
    },
    {
      id: "choroba-matki",
      title: "Choroba lub śmierć matki",
      acknowledgement: "To bardzo trudna sytuacja dla całej rodziny, dlatego wyjaśniamy, kto może przejąć opiekę nad dzieckiem i zasiłek.",
      charities: ["fundacja-nagle-sami", "telefon-zaufania-116-123", "fundacja-itaka-centrum-wsparcia"],
      applies: [
        "Urlop macierzyński i zasiłek może przejąć ojciec dziecka albo inny członek najbliższej rodziny.",
        `Gdy matka jest w szpitalu i nie może opiekować się dzieckiem — po wykorzystaniu przez nią ${p.takeoverAfterWeeks} tygodni urlopu, na czas pobytu w szpitalu.`,
        `Gdy matka ma orzeczenie o niezdolności do samodzielnej egzystencji — po ${p.takeoverAfterWeeks} tygodniach, na pozostałą część urlopu.`,
        "Gdy matka zmarła — od dnia następującego po dniu jej śmierci, na pozostałą część urlopu.",
        "Jeśli matka nie miała ubezpieczenia chorobowego, ojciec może dostać zasiłek w razie jej śmierci albo niezdolności do samodzielnej egzystencji.",
      ],
      documents: [
        "Pobyt w szpitalu: zaświadczenie ze szpitala o pobycie matki.",
        "Niezdolność do samodzielnej egzystencji: kopia orzeczenia.",
        "Śmierć matki: skrócony odpis aktu zgonu.",
      ],
      steps: [
        "Osoba, która przejmuje opiekę, składa wniosek o urlop macierzyński u swojego pracodawcy. Jeśli nie jest pracownikiem, składa w ZUS wniosek ZAM.",
        "Do wniosku dołącza dokument z listy powyżej.",
        lossPage.questions,
      ],
      basis: "Art. 180 § 6–15 Kodeksu pracy; art. 29 ust. 5–9 ustawy zasiłkowej.",
    },
  ];
}
