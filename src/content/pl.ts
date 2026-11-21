/**
 * Polish copy for engine codes. The engine returns codes and values only; every user-facing
 * sentence lives here — plain language, short sentences, legal terms explained.
 */
import type { AlertCode, Citation, DocumentCode, FixAction, LeaveType, ReasonCode, Role, TitleKind } from "@/engine/types";

type Vals = Record<string, string | number | undefined>;
const fill = (t: string, v: Vals = {}) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : "…"));

export const leaveLabel: Record<LeaveType | "funeralGrant" | "careAllowance" | "parentalBenefitMunicipal", string> = {
  sickPay: "Wynagrodzenie chorobowe",
  sickness: "Zasiłek chorobowy w ciąży",
  rehabilitation: "Świadczenie rehabilitacyjne",
  art30PreBirth: "Zasiłek w wysokości zasiłku macierzyńskiego",
  maternity: "Zasiłek macierzyński — urlop macierzyński",
  maternityOnAdoption: "Zasiłek macierzyński — urlop na warunkach macierzyńskiego",
  supplementary: "Zasiłek macierzyński — uzupełniający urlop macierzyński",
  parental: "Zasiłek macierzyński — urlop rodzicielski",
  paternity: "Zasiłek macierzyński — urlop ojcowski",
  funeralGrant: "Zasiłek pogrzebowy",
  careAllowance: "Zasiłek opiekuńczy",
  parentalBenefitMunicipal: "Świadczenie rodzicielskie (z gminy)",
};

/** Short names for timelines and tables. */
export const leaveShort: Record<LeaveType, string> = {
  sickPay: "Wynagrodzenie chorobowe",
  sickness: "Zasiłek chorobowy",
  rehabilitation: "Świadczenie rehabilitacyjne",
  art30PreBirth: "Zasiłek do porodu",
  maternity: "Urlop macierzyński",
  maternityOnAdoption: "Urlop na warunkach macierzyńskiego",
  supplementary: "Urlop uzupełniający",
  parental: "Urlop rodzicielski",
  paternity: "Urlop ojcowski",
};

export const leaveExplain: Partial<Record<LeaveType | "funeralGrant" | "parentalBenefitMunicipal", string>> = {
  sickness: "Gdy w ciąży jesteś niezdolna do pracy. Za zwolnienie z kodem B dostajesz 100% podstawy.",
  rehabilitation: "Po wyczerpaniu zasiłku chorobowego, jeśli lekarz orzecznik ZUS uzna, że dalsze leczenie rokuje powrót do pracy. W ciąży — 100% podstawy.",
  art30PreBirth: "Gdy w ciąży straciłaś pracę z powodu likwidacji lub upadłości pracodawcy. Wypłaca ZUS do dnia porodu.",
  maternity: "Pierwsze 20 tygodni po urodzeniu jednego dziecka (dłużej przy ciąży mnogiej). Matka musi wykorzystać co najmniej 14 tygodni.",
  supplementary: "Dodatkowe tygodnie, gdy dziecko urodziło się przedwcześnie lub długo było w szpitalu. Do 8 albo do 15 tygodni.",
  parental: "41 tygodni po urlopie macierzyńskim (43 przy ciąży mnogiej). Każdy z rodziców ma 9 tygodni, których nie można przekazać drugiemu.",
  paternity: "14 dni dla ojca, do ukończenia przez dziecko 12 miesięcy. Można podzielić na 2 części po co najmniej 7 dni.",
  funeralGrant: "7 000 zł na pokrycie kosztów pogrzebu — także po urodzeniu martwego dziecka.",
  parentalBenefitMunicipal: "1 000 zł miesięcznie z gminy dla osób, którym nie przysługuje zasiłek macierzyński.",
};

export const reasonText: Record<ReasonCode, string> = {
  NOT_INSURED_AT_EVENT: "W dniu porodu (przyjęcia dziecka) nie ma ubezpieczenia chorobowego.",
  NOT_INSURED_AT_PART_START: "W dniu rozpoczęcia tej części urlopu nie ma ubezpieczenia chorobowego.",
  NO_SICKNESS_INSURANCE_ON_TITLE: "Ten tytuł ubezpieczenia nie obejmuje ubezpieczenia chorobowego.",
  TITLE_INVALIDATED: "ZUS wydał decyzję, że ta umowa nie daje tytułu do ubezpieczenia.",
  TITLE_END_NOT_QUALIFYING: "Umowa skończyła się przed porodem z przyczyny, która nie daje prawa do zasiłku po ustaniu ubezpieczenia.",
  NO_INSURANCE_SCHEME: "Przy uldze na start nie podlegasz ubezpieczeniu chorobowemu.",
  ARREARS_UNPAID: "Na dzień powstania prawa są zaległości w składkach powyżej 1% minimalnego wynagrodzenia.",
  ARREARS_RIGHT_EXPIRED: "Zaległość nie została spłacona w ciągu 6 miesięcy — prawo do zasiłku wygasło.",
  WAITING_PERIOD: "Zasiłek chorobowy przysługuje dopiero po okresie wyczekiwania (30 lub 90 dni ubezpieczenia).",
  BENEFIT_PERIOD_EXHAUSTED: "Wyczerpany okres zasiłkowy (270 dni w ciąży).",
  PARTS_LIMIT: "Urlop rodzicielski można podzielić najwyżej na 5 części — łącznie dla obojga rodziców.",
  POOL_EXCEEDED: "Plan przekracza przysługujący wymiar urlopu.",
  EXCESS_DAYS: "Zaplanowano więcej dni, niż przysługuje — nadwyżka nie zostanie opłacona.",
  MOTHER_MINIMUM_WEEKS: "Matka musi wykorzystać co najmniej 14 tygodni urlopu macierzyńskiego.",
  RESERVED_WEEKS: "9 tygodni urlopu rodzicielskiego jest zarezerwowane dla każdego z rodziców i nie przechodzi na drugiego.",
  DEADLINE_PASSED: "Termin na złożenie wniosku minął.",
  CHILD_AGE_LIMIT: "Dziecko przekroczyło wiek, do którego przysługuje urlop.",
  FOSTER_PROFESSIONAL: "Zawodowej rodzinie zastępczej zasiłek macierzyński nie przysługuje.",
  NO_LIVING_CHILD: "Urlop rodzicielski nie przysługuje, gdy dziecko nie żyje.",
  CERTIFICATE_MISSING: "Brakuje wymaganego zaświadczenia.",
  TRANSITIONAL_RULE_NOT_MET: "Nie są spełnione warunki przepisu przejściowego.",
  WORK_FRACTION_TOO_HIGH: "Łącząc urlop rodzicielski z pracą, można pracować najwyżej na pół etatu.",
  NOT_CONTIGUOUS: "Części urlopu muszą następować bezpośrednio po sobie.",
};

export interface AlertCopy {
  title: string;
  body: string;
}

const alertCopy: Record<AlertCode, AlertCopy> = {
  TITLE_LIKELY_VERIFIED: {
    title: "ZUS prawdopodobnie sprawdzi Twoją umowę",
    body: "Umowa zaczęła się niedługo przed porodem lub zwolnieniem. To nie odmowa — ale zbierz dowody, że naprawdę pracujesz: umowę, listę obecności, badania lekarskie, szkolenie BHP, przelewy wynagrodzenia, maile. Sprawdzenie może potrwać 2–4 miesiące.",
  },
  NOT_INSURED_ON_DUE_DATE: {
    title: "W dniu porodu nie będziesz mieć ubezpieczenia chorobowego",
    body: "Bez ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie przysługuje. Masz czas do {deadline}, żeby to zmienić.",
  },
  INSURANCE_GAP_BEFORE_PART: {
    title: "Przerwa w ubezpieczeniu przed kolejną częścią urlopu",
    body: "Ubezpieczenie chorobowe kończy się {onDate}, a kolejna część urlopu zaczyna się później. Zgłoś się ponownie do ubezpieczenia chorobowego do {deadline}.",
  },
  VOLUNTARY_SICKNESS_NOT_JOINED: {
    title: "Nie masz dobrowolnego ubezpieczenia chorobowego",
    body: "Przy zleceniu i działalności ubezpieczenie chorobowe jest dobrowolne. Bez niego nie dostaniesz zasiłku macierzyńskiego. Zgłoś się (formularz ZUA lub ZZA) — ubezpieczenie zacznie się od dnia, w którym ZUS dostanie zgłoszenie.",
  },
  BUSINESS_SUSPENDED_NEAR_DUE_DATE: {
    title: "Zawieszenie działalności w okolicy porodu odbierze prawo do zasiłku",
    body: "W czasie zawieszenia nie podlegasz ubezpieczeniu chorobowemu. Jeśli w dniu porodu działalność będzie zawieszona, zasiłek macierzyński nie przysługuje. Przesuń zawieszenie na czas po porodzie.",
  },
  REREGISTER_AFTER_MATERNITY: {
    title: "Po zasiłku macierzyńskim zgłoś się ponownie do ubezpieczenia",
    body: "Gdy pobierasz zasiłek, dobrowolne ubezpieczenie chorobowe wygasa. Jeśli kolejną część urlopu zgłosisz osobno, musisz mieć ubezpieczenie w dniu jej rozpoczęcia. Złóż ZUA do {deadline}.",
  },
  NO_SCHEME_ULGA_NA_START: {
    title: "Przy uldze na start nie masz ubezpieczenia chorobowego",
    body: "W czasie ulgi na start płacisz tylko składkę zdrowotną. Żeby mieć prawo do zasiłku, zrezygnuj z ulgi i zgłoś się do ubezpieczeń społecznych z dobrowolnym chorobowym.",
  },
  CONTRACT_ENDS_BEFORE_BIRTH: {
    title: "Umowa kończy się przed porodem",
    body: "Jeśli umowa skończy się przed porodem, zasiłek przysługuje tylko w szczególnych przypadkach (np. likwidacja pracodawcy). Umowa na czas określony przedłuża się do dnia porodu, jeśli kończy się po 3. miesiącu ciąży.",
  },
  ARREARS_OWN: {
    title: "Zaległość w składkach: {amount}",
    body: "Zaległość ponad {threshold} blokuje wypłatę zasiłku. Spłać ją przed porodem. Jeśli nie spłacisz w ciągu 6 miesięcy od dnia porodu, prawo do zasiłku wygaśnie ({deadline}). Układ ratalny nie wystarczy.",
  },
  ARREARS_PAYER: {
    title: "Zaległość na koncie płatnika: {amount}",
    body: "Jako osoba współpracująca masz prawo do zasiłku tylko wtedy, gdy płatnik (osoba prowadząca działalność) nie ma zaległości ponad {threshold}. Termin spłaty: {deadline}.",
  },
  WAITING_PERIOD_NOT_MET: {
    title: "Zasiłek chorobowy od {onDate}",
    body: "Zasiłek chorobowy przysługuje po okresie wyczekiwania. Zasiłku macierzyńskiego to nie dotyczy — przysługuje od pierwszego dnia ubezpieczenia.",
  },
  RATE_DEADLINE_21_DAYS: {
    title: "Masz czas do {deadline} na wybór 81,5%",
    body: "Jeśli złożysz wniosek o urlop macierzyński i rodzicielski razem najpóźniej 21 dni po porodzie, dostaniesz 81,5% przez cały okres. Później — 100% za macierzyński i 70% za rodzicielski.",
  },
  DAY_COUNT_MISMATCH: {
    title: "Liczba dni nie zgadza się z wymiarem urlopu",
    body: "Zaplanowano {planned} dni, a przysługuje {allowed}. Popraw daty, żeby nie stracić dni ani nie dostać odmowy za nadwyżkę.",
  },
  PARTS_LIMIT_NEAR: {
    title: "Wykorzystujecie już {used} z 5 części urlopu rodzicielskiego",
    body: "Limit 5 części jest wspólny dla obojga rodziców. Szósta część zostanie odrzucona. Połącz krótsze okresy w dłuższe.",
  },
  TOP_UP_STATEMENT_NEEDED: {
    title: "Zasiłek wyniesie mniej niż 1 000 zł — dołącz oświadczenie",
    body: "Jeśli zasiłek netto jest niższy niż 1 000 zł, ZUS podwyższy go do tej kwoty. Warunek: oświadczenie, że nie masz innego tytułu do ubezpieczenia. Dodamy je do wniosku.",
  },
  LOW_BASE: {
    title: "Niska podstawa wymiaru zasiłku",
    body: "Zasiłek liczymy od Twojej podstawy składek. Przy preferencyjnym ZUS, Małym ZUS Plus lub niepełnym etacie będzie niższy.",
  },
  BASE_DILUTED_ART48A: {
    title: "Podstawa zasiłku będzie uśredniona",
    body: "Masz ubezpieczenie chorobowe krócej niż 12 miesięcy. ZUS uśredni podstawę z minimalną podstawą za brakujące miesiące, więc wyższa składka zadeklarowana teraz podniesie zasiłek tylko częściowo.",
  },
  BASE_CHANGE_SCRUTINY: {
    title: "Podwyższona niedawno podstawa składek może zostać sprawdzona",
    body: "Znaczne podwyższenie podstawy krótko przed porodem ZUS zwykle weryfikuje. Zachowaj dokumenty uzasadniające wysokość przychodu.",
  },
  PATERNITY_EXPIRES: {
    title: "Urlop ojcowski trzeba wykorzystać do {deadline}",
    body: "Urlop ojcowski przysługuje do ukończenia przez dziecko 12 miesięcy. Wniosek złóż pracodawcy co najmniej 7 dni wcześniej.",
  },
  NO_PARENTAL_IN_FIRST_YEAR: {
    title: "Urlop rodzicielski w pierwszym roku",
    body: "Przy wyborze 81,5% za urlop rodzicielski wykorzystany po 1. roku życia dziecka zasiłek wynosi 70%.",
  },
  OTHER_PARENT_INFO_MISSING: {
    title: "Potrzebujemy informacji o drugim rodzicu",
    body: "ZUS zapyta, czy drugi rodzic korzysta z urlopu i z której puli (32 czy 9 tygodni). Dołącz jego oświadczenie do wniosku, żeby uniknąć wezwania.",
  },
  CERTIFICATE_TYPE: {
    title: "Poproś lekarza o właściwe zaświadczenie",
    body: "Do tego urlopu potrzebne jest konkretne zaświadczenie (np. „Za życiem” albo zaświadczenie o pobycie dziecka w szpitalu). Inne zaświadczenie oznacza wezwanie do uzupełnienia.",
  },
  EMPLOYER_CERTIFICATE_PENDING: {
    title: "ZUS czeka na zaświadczenie płatnika (Z-3)",
    body: "Bez zaświadczenia płatnika ZUS nie wypłaci zasiłku. Poproś dział kadr o przesłanie Z-3 przez PUE/eZUS.",
  },
  CLAIM_LIMITATION: {
    title: "Wniosek złóż do {deadline}",
    body: "Prawo do zasiłku przedawnia się po 6 miesiącach od zakończenia okresu, za który przysługuje.",
  },
  PARENTAL_HORIZON: {
    title: "Urlop rodzicielski do końca roku, w którym dziecko kończy 6 lat",
    body: "Niewykorzystana część przepada po {deadline}.",
  },
};

export function alertText(code: AlertCode, values: Vals = {}): AlertCopy {
  const c = alertCopy[code] ?? { title: code, body: "" };
  return { title: fill(c.title, values), body: fill(c.body, values) };
}

export const fixLabel: Record<FixAction, string> = {
  PAY_ARREARS: "Jak spłacić zaległość",
  FILE_ZUA: "Zgłoś się do ubezpieczenia chorobowego",
  KEEP_BUSINESS_ACTIVE: "Przesuń zawieszenie działalności",
  COLLECT_PROOF_OF_WORK: "Lista dowodów do zebrania",
  FILE_WITHIN_21_DAYS: "Złóż wniosek w terminie",
  CORRECT_DAYS: "Popraw liczbę dni w planie",
  MERGE_PARTS: "Połącz części urlopu",
  ADD_SINGLE_TITLE_STATEMENT: "Dodaj oświadczenie do wniosku",
  ASK_DOCTOR_FOR_CERTIFICATE: "Jakie zaświadczenie?",
  ADD_OTHER_PARENT_STATEMENT: "Dodaj oświadczenie drugiego rodzica",
  USE_PATERNITY_BEFORE: "Zaplanuj urlop ojcowski",
  ASK_EMPLOYER_Z3: "Poproś pracodawcę o Z-3",
  APPLY_MUNICIPAL_BENEFIT: "Świadczenie rodzicielskie z gminy",
};

export const fixHref: Partial<Record<FixAction, string>> = {
  CORRECT_DAYS: "/plan",
  MERGE_PARTS: "/plan",
  USE_PATERNITY_BEFORE: "/plan",
  FILE_WITHIN_21_DAYS: "/wnioski",
  ADD_SINGLE_TITLE_STATEMENT: "/wnioski",
  ADD_OTHER_PARENT_STATEMENT: "/wnioski",
  PAY_ARREARS: "/kroki#skladki",
  FILE_ZUA: "/kroki#ubezpieczenie",
  KEEP_BUSINESS_ACTIVE: "/kroki#dzialalnosc",
  COLLECT_PROOF_OF_WORK: "/kroki#dowody",
  ASK_DOCTOR_FOR_CERTIFICATE: "/kroki#zaswiadczenia",
  ASK_EMPLOYER_Z3: "/kroki#pracodawca",
  APPLY_MUNICIPAL_BENEFIT: "/wsparcie#swiadczenie-rodzicielskie",
};

export const titleKindLabel: Record<TitleKind, string> = {
  employment: "Umowa o pracę",
  mandate: "Umowa zlecenia",
  selfEmployed: "Działalność gospodarcza",
  collaborator: "Osoba współpracująca",
  childcareLeave: "Urlop wychowawczy",
  maternityBenefit: "Pobieranie zasiłku macierzyńskiego",
  unemployed: "Bezrobocie",
  none: "Brak tytułu",
};

export const roleLabel: Record<Role, string> = {
  mother: "Matka",
  father: "Ojciec",
  adoptive: "Rodzic adopcyjny",
  foster: "Rodzina zastępcza",
  otherFamily: "Inny członek rodziny",
};

export const documentLabel: Record<string, string> = {
  ZAM: "Wniosek o zasiłek macierzyński (ZAM)",
  "ZAS-53": "Wniosek o zasiłek chorobowy (ZAS-53)",
  "ZAS-55": "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego (ZAS-55)",
  "ZAS-26": "Oświadczenie do zasiłku przy przyjęciu dziecka (ZAS-26)",
  "Z-3": "Zaświadczenie płatnika składek (Z-3)",
  "Z-3a": "Zaświadczenie płatnika — zleceniobiorca (Z-3a)",
  "Z-10": "Wniosek o zasiłek po ustaniu tytułu (Z-10)",
  "ZAS-12": "Oświadczenie do zasiłku (ZAS-12)",
  LEAVE_APP_MATERNITY: "Wniosek o urlop macierzyński (do pracodawcy)",
  LEAVE_APP_PARENTAL: "Wniosek o urlop rodzicielski (do pracodawcy)",
  LEAVE_APP_PATERNITY: "Wniosek o urlop ojcowski (do pracodawcy)",
  LEAVE_APP_SUPPLEMENTARY: "Wniosek o uzupełniający urlop macierzyński (do pracodawcy)",
  LEAVE_APP_PART_TIME: "Wniosek o łączenie urlopu z pracą (do pracodawcy)",
  BIRTH_ACT: "Odpis aktu urodzenia",
  CERT_STILLBIRTH: "Zaświadczenie o urodzeniu martwego dziecka",
  CERT_ZA_ZYCIEM: "Zaświadczenie lekarskie „Za życiem”",
  CERT_HOSPITAL: "Zaświadczenie o pobycie dziecka w szpitalu",
  CERT_PREGNANCY: "Zaświadczenie o ciąży",
  COURT_ORDER: "Postanowienie sądu o przysposobieniu / umieszczeniu dziecka",
  FOSTER_CERT: "Zaświadczenie o pełnieniu funkcji rodziny zastępczej",
  SINGLE_TITLE_STATEMENT: "Oświadczenie o jedynym tytule do ubezpieczenia",
  OTHER_PARENT_STATEMENT: "Oświadczenie drugiego rodzica",
  E_ZLA: "Zwolnienie lekarskie e-ZLA",
};

export const docCodeLabel: Record<DocumentCode, string> = {
  birthAct: "Akt urodzenia",
  stillbirthCert: "Zaświadczenie o urodzeniu martwego dziecka",
  zaZyciemCert: "Zaświadczenie „Za życiem”",
  hospitalStayCert: "Zaświadczenie o pobycie w szpitalu",
  courtOrder: "Postanowienie sądu",
  interimCareOrder: "Postanowienie o pieczy tymczasowej",
  fosterCert: "Zaświadczenie rodziny zastępczej",
  pregnancyCert: "Zaświadczenie o ciąży",
};

export function documentName(code: string): string {
  return documentLabel[code] ?? code;
}

const actName: Record<Citation["act"], string> = {
  UZ: "ustawa zasiłkowa",
  KP: "Kodeks pracy",
  RD: "rozporządzenie w sprawie dokumentów",
  RW: "rozporządzenie w sprawie wniosków",
  USUS: "ustawa o systemie ubezpieczeń społecznych",
  KC: "Kodeks cywilny",
};

export function citationText(c: Citation): string {
  return `art. ${c.article.replace(/^art\.\s*/, "")} ${actName[c.act] ?? c.act}`;
}

export const ratePct = (bps: number) => `${(bps / 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`;
