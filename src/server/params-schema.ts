/**
 * The single source for parameter sets (plan 06 §3): a zod schema of ParameterSet with bounds and
 * `.meta({ label, unit, group, help, citation })` per field. The admin form is generated from it, the admin API
 * validates with it and `fixtures:validate` checks data/params/*.json against it.
 * No "server-only" import: unit tests and scripts use it too.
 */
import { z } from "zod";
import type { ParameterSet } from "@/engine/types";
import { formatBound, formatParam, type ParamUnit } from "@/lib/param-units";

export const GROUPS = [
  { id: "wages", title: "Wynagrodzenia i podstawa wymiaru" },
  { id: "rates", title: "Stawki zasiłków" },
  { id: "leave", title: "Wymiar urlopów macierzyńskiego i rodzicielskiego" },
  { id: "paternity", title: "Urlop ojcowski" },
  { id: "supplementary", title: "Uzupełniający urlop macierzyński" },
  { id: "loss", title: "Strata dziecka" },
  { id: "adoption", title: "Przysposobienie i piecza zastępcza" },
  { id: "sickness", title: "Zasiłek chorobowy" },
  { id: "arrears", title: "Zaległości składkowe i płatnik" },
  { id: "tax", title: "Podatek i kwota minimalna" },
  { id: "risk", title: "Ryzyko weryfikacji tytułu ubezpieczenia" },
  { id: "interpretation", title: "Interpretacje przepisów" },
] as const;
export type GroupId = (typeof GROUPS)[number]["id"];

export interface Readings {
  /** What the engine does when the flag is on (two sentences). */
  yes: string;
  /** What it does when the flag is off (two sentences). */
  no: string;
  /** Why the default is what it is: the case or source that supports it. */
  support: string;
}

export interface ParamMeta {
  label: string;
  unit: ParamUnit;
  group: GroupId;
  help?: string;
  citation?: string;
  readings?: Readings;
  options?: { value: string; label: string }[];
}

/** Serializable description of one form field (built from the schema, passed to the client form). */
export interface FieldSpec extends ParamMeta {
  path: string;
  min?: number;
  max?: number;
}

type M = Omit<ParamMeta, "unit">;

const range = (unit: ParamUnit, min: number, max: number, m: M) =>
  z
    .number({ error: "Wpisz liczbę." })
    .int({ error: "Wartość musi być liczbą całkowitą." })
    .min(min, { error: min === 0 ? "Wartość nie może być ujemna." : `Najmniej ${formatBound(unit, min)}.` })
    .max(max, { error: `Najwyżej ${formatBound(unit, max)}.` })
    .meta({ ...m, unit });

const money = (m: M, min = 0) => range("grosze", min, 1_000_000_000, m);
const bps = (m: M, max = 10_000, min = 0) => range("bps", min, max, m);
const weeks = (m: M) => range("weeks", 0, 200, m);
const days = (m: M, max = 1000) => range("days", 0, max, m);
const months = (m: M) => range("months", 0, 120, m);
const years = (m: M) => range("years", 0, 30, m);
const count = (m: M, max = 100, min = 0) => range("count", min, max, m);
const grams = (m: M) => range("grams", 0, 5000, m);
const flag = (m: M) => z.boolean({ error: "Wybierz Tak albo Nie." }).meta({ ...m, unit: "bool" });
const interp = (m: Omit<M, "group"> & { readings: Readings }) => z.boolean({ error: "Wybierz jedną z interpretacji." }).meta({ ...m, unit: "interpretation", group: "interpretation" });
const fraction = (m: M) =>
  z
    .object({ num: z.number().int().min(1).max(100), den: z.number().int().min(1).max(100) }, { error: "Wpisz ułamek, np. 1/2." })
    .strict()
    .refine((f) => f.num <= f.den, { error: "Ułamek nie może być większy niż 1." })
    .meta({ ...m, unit: "fraction" });
const fixed = <V extends number>(v: V, m: M) => z.literal(v, { error: `Stała ustawowa: ${v}. Zmiana wymaga zmiany silnika.` }).meta({ ...m, unit: "fixed" });

const isoDate = z.iso.date({ error: "Wpisz prawidłową datę (RRRR-MM-DD)." });

const G = <T extends GroupId>(group: T) => group;

export const parameterSetSchema = z
  .object({
    id: z.string().min(1).max(40).regex(/^[A-Za-z0-9._~-]+$/, { error: "Nieprawidłowy identyfikator." }),
    validFrom: isoDate,
    label: z.string().trim().min(3, { error: "Nazwa musi mieć co najmniej 3 znaki." }).max(120, { error: "Nazwa może mieć najwyżej 120 znaków." }),
    sources: z
      .array(z.string().trim().min(1).max(200, { error: "Jedno źródło może mieć najwyżej 200 znaków." }))
      .min(1, { error: "Podaj co najmniej jedno źródło (Dz.U.)." })
      .max(20, { error: "Najwyżej 20 źródeł." }),
    wage: z
      .object({
        minimumWage: money({ label: "Minimalne wynagrodzenie", group: G("wages"), help: "Wyznacza minimalną podstawę pracownika na pełnym etacie, próg zadłużenia (1%) i podstawę preferencyjną (30%).", citation: "obwieszczenie RM; UZ art. 45" }, 1),
        forecastAverageWage: money({ label: "Prognozowane przeciętne wynagrodzenie", group: G("wages"), help: "Podstawa minimalna osób prowadzących działalność (60%) i limit dobrowolnego ubezpieczenia (250%).", citation: "ustawa budżetowa; USUS art. 18 ust. 8" }, 1),
      })
      .strict(),
    deductions: z
      .object({
        employeeSocialBps: bps({ label: "Potrącenie składek społecznych pracownika", group: G("wages"), help: "Składki emerytalna, rentowa i chorobowa finansowane przez ubezpieczonego, odliczane od przychodu w podstawie zasiłku.", citation: "UZ art. 36 ust. 1, art. 3 pkt 4" }, 5000, 1),
      })
      .strict(),
    base: z
      .object({
        employeeFloorFullTime: flag({ label: "Podstawa pracownika na pełnym etacie nie niższa niż minimalne wynagrodzenie (po potrąceniu składek)", group: G("wages"), citation: "UZ art. 45" }),
        nonEmployeeMinBasePctOfForecastBps: bps({ label: "Minimalna podstawa składek osoby prowadzącej działalność (% prognozowanego przeciętnego)", group: G("wages"), citation: "USUS art. 18 ust. 8" }),
        preferentialBasePctOfMinWageBps: bps({ label: "Podstawa preferencyjna — „mały ZUS” (% minimalnego wynagrodzenia)", group: G("wages"), citation: "USUS art. 18a" }),
        voluntaryCapPctOfForecastBps: bps({ label: "Limit podstawy dobrowolnego ubezpieczenia chorobowego (% prognozowanego przeciętnego)", group: G("wages"), citation: "USUS art. 20 ust. 3" }, 100_000),
        afterTitleCapPctOfForecastBps: bps({ label: "Limit podstawy zasiłku po ustaniu tytułu (% przeciętnego wynagrodzenia)", group: G("wages"), citation: "UZ art. 46" }, 100_000),
        monthDays: fixed(30, { label: "Dzielnik podstawy dziennej", group: G("wages"), help: "Stała: podstawa dzienna to 1/30 podstawy miesięcznej.", citation: "UZ art. 36 ust. 3" }),
        noRecalcGapMonths: fixed(1, { label: "Przerwa bez ponownego ustalania podstawy (miesiące)", group: G("wages"), help: "Stała: przerwa krótsza niż miesiąc nie powoduje ponownego ustalenia podstawy.", citation: "UZ art. 43" }),
      })
      .strict(),
    rates: z
      .object({
        maternity: bps({ label: "Zasiłek macierzyński za urlop macierzyński", group: G("rates"), citation: "UZ art. 31 ust. 1" }),
        parental: bps({ label: "Zasiłek macierzyński za urlop rodzicielski", group: G("rates"), help: "Stawka w wariancie „100%, potem 70%”. Nie zmienia automatycznie wariantu uśrednionego — to osobny parametr.", citation: "UZ art. 31 ust. 2" }),
        averaged: bps({ label: "Wariant uśredniony (cały okres)", group: G("rates"), help: "Stawka po złożeniu wniosku w ciągu 21 dni od porodu.", citation: "UZ art. 31 ust. 3" }),
        otherParentReserved: bps({ label: "9 tygodni drugiego rodzica (część nieprzenoszalna)", group: G("rates"), citation: "UZ art. 31 ust. 3f" }),
        paternity: bps({ label: "Zasiłek macierzyński za urlop ojcowski", group: G("rates"), citation: "UZ art. 31 ust. 1" }),
        supplementary: bps({ label: "Zasiłek za uzupełniający urlop macierzyński", group: G("rates"), citation: "KP art. 180²; UZ art. 31" }),
        sicknessPregnancy: bps({ label: "Zasiłek chorobowy w ciąży", group: G("rates"), citation: "UZ art. 11 ust. 2" }),
        sicknessStandard: bps({ label: "Zasiłek chorobowy (zwykły)", group: G("rates"), citation: "UZ art. 11 ust. 1" }),
        careAllowance: bps({ label: "Zasiłek opiekuńczy", group: G("rates"), citation: "UZ art. 35" }),
        rehabPregnancy: bps({ label: "Świadczenie rehabilitacyjne w ciąży", group: G("rates"), citation: "UZ art. 19" }),
      })
      .strict(),
    maternity: z
      .object({
        weeksByChildren: z
          .object({
            "1": weeks({ label: "Urlop macierzyński — 1 dziecko", group: G("leave"), citation: "KP art. 180 § 1" }),
            "2": weeks({ label: "Urlop macierzyński — bliźnięta", group: G("leave"), citation: "KP art. 180 § 1" }),
            "3": weeks({ label: "Urlop macierzyński — troje dzieci", group: G("leave"), citation: "KP art. 180 § 1" }),
            "4": weeks({ label: "Urlop macierzyński — czworo dzieci", group: G("leave"), citation: "KP art. 180 § 1" }),
            "5plus": weeks({ label: "Urlop macierzyński — pięcioro i więcej dzieci", group: G("leave"), citation: "KP art. 180 § 1" }),
          })
          .strict(),
        preBirthMaxWeeks: weeks({ label: "Najdłuższa część urlopu przed porodem", group: G("leave"), citation: "KP art. 180 § 2" }),
        motherMandatoryWeeks: weeks({ label: "Część obowiązkowa matki", group: G("leave"), help: "Po jej wykorzystaniu matka może zrezygnować z reszty urlopu na rzecz ojca.", citation: "KP art. 180 § 4" }),
        motherMandatoryWeeksSpecial: weeks({ label: "Część obowiązkowa matki w sytuacjach szczególnych (szpital, niezdolność)", group: G("leave"), citation: "KP art. 180 § 6–13" }),
      })
      .strict(),
    parental: z
      .object({
        weeks: z
          .object({
            single: weeks({ label: "Urlop rodzicielski — 1 dziecko", group: G("leave"), citation: "KP art. 182¹a § 1" }),
            multiple: weeks({ label: "Urlop rodzicielski — więcej dzieci", group: G("leave"), citation: "KP art. 182¹a § 1" }),
          })
          .strict(),
        weeksZaZyciem: z
          .object({
            single: weeks({ label: "Urlop rodzicielski „Za życiem” — 1 dziecko", group: G("leave"), citation: "KP art. 182¹a § 2" }),
            multiple: weeks({ label: "Urlop rodzicielski „Za życiem” — więcej dzieci", group: G("leave"), citation: "KP art. 182¹a § 2" }),
          })
          .strict(),
        reservedWeeksPerParent: weeks({ label: "Część nieprzenoszalna każdego rodzica", group: G("leave"), citation: "KP art. 182¹a § 5" }),
        maxParts: count({ label: "Liczba części urlopu rodzicielskiego", group: G("leave"), citation: "KP art. 182¹a § 3" }, 20, 1),
        partsSharedBetweenParents: flag({ label: "Limit części wspólny dla obojga rodziców", group: G("leave"), citation: "KP art. 182¹c" }),
        untilEndOfYearChildTurns: years({ label: "Urlop do końca roku, w którym dziecko kończy (lat)", group: G("leave"), citation: "KP art. 182¹a § 3" }),
        workMaxFraction: fraction({ label: "Najwyższy wymiar pracy przy łączeniu z urlopem rodzicielskim", group: G("leave"), help: "Wpisz jako ułamek etatu, np. 1/2.", citation: "KP art. 182¹e § 1" }),
        combinedCapWeeks: z
          .object({
            single: weeks({ label: "Łączny limit urlopu łączonego z pracą — 1 dziecko", group: G("leave"), citation: "KP art. 182¹f" }),
            multiple: weeks({ label: "Łączny limit urlopu łączonego z pracą — więcej dzieci", group: G("leave"), citation: "KP art. 182¹f" }),
          })
          .strict(),
        combinedCapWeeksZaZyciem: z
          .object({
            single: weeks({ label: "Łączny limit łączenia z pracą „Za życiem” — 1 dziecko", group: G("leave"), citation: "KP art. 182¹f" }),
            multiple: weeks({ label: "Łączny limit łączenia z pracą „Za życiem” — więcej dzieci", group: G("leave"), citation: "KP art. 182¹f" }),
          })
          .strict(),
        applicationLeadDays: days({ label: "Wniosek o urlop rodzicielski — najpóźniej przed rozpoczęciem", group: G("leave"), citation: "KP art. 182¹d § 1" }, 365),
      })
      .strict(),
    paternity: z
      .object({
        days: days({ label: "Wymiar urlopu ojcowskiego", group: G("paternity"), citation: "KP art. 182³ § 1" }, 365),
        maxParts: count({ label: "Liczba części", group: G("paternity"), citation: "KP art. 182³ § 1" }, 10, 1),
        minPartDays: days({ label: "Najkrótsza część", group: G("paternity"), citation: "KP art. 182³ § 1" }, 365),
        untilChildMonths: months({ label: "Termin wykorzystania — do ukończenia przez dziecko (miesięcy)", group: G("paternity"), citation: "KP art. 182³ § 1 pkt 1" }),
        adoptionMaxChildAgeYears: years({ label: "Przysposobienie — wiek dziecka do (lat)", group: G("paternity"), citation: "KP art. 182³ § 1 pkt 2" }),
        applicationLeadDays: days({ label: "Wniosek — najpóźniej przed rozpoczęciem", group: G("paternity"), citation: "KP art. 182³ § 2" }, 365),
      })
      .strict(),
    supplementary: z
      .object({
        validFrom: isoDate.nullable().meta({ label: "Data wejścia w życie urlopu uzupełniającego", unit: "dateOrNull", group: G("supplementary"), help: "Puste pole: urlop uzupełniający nie obowiązuje w tym stanie prawnym.", citation: "ustawa z 6.12.2024" }),
        extremePretermBeforeWeek: weeks({ label: "Skrajny wcześniak: urodzony przed ukończeniem tygodnia ciąży", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 1" }),
        extremeMaxWeightG: grams({ label: "… albo z masą urodzeniową do", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 1" }),
        pretermBeforeWeek: weeks({ label: "Wcześniak: urodzony przed ukończeniem tygodnia ciąży", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 2" }),
        capWeeksExtreme: weeks({ label: "Najwyżej — skrajny wcześniak", group: G("supplementary"), citation: "KP art. 180² § 2 pkt 1" }),
        capWeeksPreterm: weeks({ label: "Najwyżej — wcześniak", group: G("supplementary"), citation: "KP art. 180² § 2 pkt 2" }),
        capWeeksTerm: weeks({ label: "Najwyżej — dziecko donoszone w szpitalu", group: G("supplementary"), citation: "KP art. 180² § 2 pkt 3" }),
        termMinConsecutiveDays: days({ label: "Dziecko donoszone: pobyt w szpitalu co najmniej (dni z rzędu)", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 3" }, 365),
        termFirstDayFrom: days({ label: "Pobyt w szpitalu między dniem życia (od)", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 3" }, 365),
        termFirstDayTo: days({ label: "… a dniem życia (do)", group: G("supplementary"), citation: "KP art. 180² § 1 pkt 3" }, 365),
        applicationLeadDays: days({ label: "Wniosek — najpóźniej przed rozpoczęciem", group: G("supplementary"), citation: "KP art. 180² § 4" }, 365),
      })
      .strict(),
    loss: z
      .object({
        weeksAfterStillbirthOrEarlyDeath: weeks({ label: "Urlop po martwym urodzeniu lub zgonie dziecka", group: G("loss"), citation: "KP art. 180¹ § 1" }),
        earlyDeathBeforeWeeks: weeks({ label: "Zgon dziecka przed ukończeniem (tygodni życia)", group: G("loss"), citation: "KP art. 180¹ § 1 pkt 1" }),
        minDaysFromDeath: days({ label: "Urlop co najmniej do (dni od zgonu)", group: G("loss"), citation: "KP art. 180¹ § 1" }, 365),
        funeralGrant: money({ label: "Zasiłek pogrzebowy", group: G("loss"), citation: "ustawa emerytalna art. 80" }),
      })
      .strict(),
    adoption: z
      .object({
        fosterMaxAgeYears: years({ label: "Piecza zastępcza — wiek dziecka do (lat)", group: G("adoption"), citation: "KP art. 183 § 1" }),
        fosterMaxAgeDeferredYears: years({ label: "… przy odroczonym obowiązku szkolnym (lat)", group: G("adoption"), citation: "KP art. 183 § 1" }),
        adoptionMaxAgeYears: years({ label: "Przysposobienie — wiek dziecka do (lat)", group: G("adoption"), citation: "KP art. 183 § 1" }),
        minLeaveWeeks: weeks({ label: "Urlop na warunkach macierzyńskiego — co najmniej", group: G("adoption"), citation: "KP art. 183 § 3" }),
        parentalWeeksReduced: weeks({ label: "Urlop rodzicielski — wymiar obniżony", group: G("adoption"), citation: "KP art. 183 § 4" }),
        parentalWeeksReducedZaZyciem: weeks({ label: "Urlop rodzicielski „Za życiem” — wymiar obniżony", group: G("adoption"), citation: "KP art. 183 § 4" }),
        averagedOptionDeadlineDays: days({ label: "Wybór wariantu uśrednionego — dni od przyjęcia dziecka", group: G("adoption"), citation: "UZ art. 31 ust. 3" }, 365),
      })
      .strict(),
    averagedOption: z
      .object({
        deadlineDaysAfterEvent: days({ label: "Wybór wariantu uśrednionego — dni od porodu", group: G("rates"), citation: "UZ art. 30a ust. 1" }, 365),
      })
      .strict(),
    sickness: z
      .object({
        waitingDaysMandatory: days({ label: "Okres wyczekiwania — ubezpieczenie obowiązkowe", group: G("sickness"), citation: "UZ art. 4 ust. 1 pkt 1" }, 365),
        waitingDaysVoluntary: days({ label: "Okres wyczekiwania — ubezpieczenie dobrowolne", group: G("sickness"), citation: "UZ art. 4 ust. 1 pkt 2" }, 365),
        bridgingGapDays: days({ label: "Przerwa, która nie przerywa ciągłości ubezpieczenia", group: G("sickness"), citation: "UZ art. 4 ust. 2" }, 365),
        sickPayDays: days({ label: "Wynagrodzenie chorobowe od pracodawcy", group: G("sickness"), citation: "KP art. 92 § 1" }, 365),
        sickPayDaysAge50: days({ label: "Wynagrodzenie chorobowe — pracownik po 50. roku życia", group: G("sickness"), citation: "KP art. 92 § 1" }, 365),
        benefitPeriodDays: days({ label: "Okres zasiłkowy", group: G("sickness"), citation: "UZ art. 8" }),
        benefitPeriodPregnancyDays: days({ label: "Okres zasiłkowy w ciąży", group: G("sickness"), citation: "UZ art. 8" }),
        afterTitleStartWithinDays: days({ label: "Niezdolność po ustaniu tytułu — powstała w ciągu", group: G("sickness"), citation: "UZ art. 7" }, 365),
        afterTitleMinDays: days({ label: "Niezdolność po ustaniu tytułu — trwająca co najmniej", group: G("sickness"), citation: "UZ art. 7" }, 365),
      })
      .strict(),
    arrears: z
      .object({
        thresholdPctOfMinWageBps: bps({ label: "Próg zadłużenia składkowego (% minimalnego wynagrodzenia)", group: G("arrears"), citation: "UZ art. 2a ust. 4" }, 10_000),
        expiryMonths: months({ label: "Spłata zadłużenia — w ciągu (miesięcy)", group: G("arrears"), help: "Po tym czasie prawo do zasiłku wygasa.", citation: "UZ art. 2a ust. 3" }),
      })
      .strict(),
    payer: z
      .object({
        ownPaymentAboveInsured: count({ label: "Płatnik sam wypłaca zasiłki, gdy zgłasza więcej niż (ubezpieczonych)", group: G("arrears"), citation: "UZ art. 61 ust. 1" }, 10_000),
        forwardWithinDays: days({ label: "Przekazanie wniosku do ZUS przez płatnika", group: G("arrears"), citation: "UZ art. 61b ust. 5" }, 365),
      })
      .strict(),
    minimumBenefit: z
      .object({
        netMonthly: money({ label: "Minimalny zasiłek macierzyński netto (miesięcznie)", group: G("tax"), help: "Kwota świadczenia rodzicielskiego; niższy zasiłek jest podwyższany.", citation: "UZ art. 31 ust. 3a" }),
        proration: z.enum(["calendarDays", "thirtieths"], { error: "Wybierz sposób liczenia." }).meta({
          label: "Kwota minimalna za niepełny miesiąc",
          unit: "enum",
          group: G("tax"),
          options: [
            { value: "calendarDays", label: "proporcjonalnie do dni kalendarzowych miesiąca" },
            { value: "thirtieths", label: "w trzydziestych częściach" },
          ],
          citation: "UZ art. 31 ust. 3b",
        }),
      })
      .strict(),
    tax: z
      .object({
        pitAdvanceBps: bps({ label: "Zaliczka na podatek dochodowy", group: G("tax"), citation: "ustawa o PIT art. 27, 41" }),
        roundToFullZloty: flag({ label: "Zaliczkę zaokrągla się do pełnych złotych", group: G("tax"), citation: "Ordynacja podatkowa art. 63" }),
      })
      .strict(),
    claims: z
      .object({
        limitationMonths: months({ label: "Przedawnienie prawa do zasiłku (miesiące)", group: G("arrears"), citation: "UZ art. 67" }),
      })
      .strict(),
    titleRisk: z
      .object({
        threshold: count({ label: "Liczba sygnałów, od której ostrzegamy o weryfikacji", group: G("risk") }, 20, 1),
        newTitleMonthsBeforeDue: months({ label: "Nowy tytuł ubezpieczenia na (miesięcy) przed porodem", group: G("risk") }),
        sickWithinDaysOfStart: days({ label: "Zwolnienie lekarskie w ciągu (dni) od zgłoszenia", group: G("risk") }, 365),
        smallFraction: fraction({ label: "Niski wymiar etatu (do)", group: G("risk") }),
        lateRegistrationDays: days({ label: "Spóźnione zgłoszenie do ubezpieczeń (dni)", group: G("risk") }, 365),
        dueDateWindowDays: days({ label: "Okno wokół terminu porodu (dni)", group: G("risk") }, 365),
        baseRaiseMonthsBeforeDue: months({ label: "Podwyższenie podstawy na (miesięcy) przed porodem", group: G("risk") }),
      })
      .strict(),
    interpretation: z
      .object({
        nineWeeksLostIfOtherParentUninsured: interp({
          label: "9 tygodni drugiego rodzica przepada, gdy nie jest on ubezpieczony",
          citation: "KP art. 182¹a § 5; UZ art. 29a",
          readings: {
            yes: "Część nieprzenoszalna drugiego rodzica przepada, gdy nie ma on tytułu do ubezpieczenia. Ubezpieczony rodzic dostaje 32 (34) tygodnie urlopu rodzicielskiego.",
            no: "Gdy drugi rodzic nie jest ubezpieczony, jego 9 tygodni przechodzi na ubezpieczonego rodzica. Ubezpieczony rodzic dostaje pełne 41 (43) tygodni.",
            support: "Domyślnie „Tak” — tak rozstrzygnięto sprawę B3-03 (ojciec, matka nieubezpieczona: 32 tygodnie).",
          },
        }),
        art30CoversParental: interp({
          label: "Zasiłek po ustaniu zatrudnienia (art. 30) obejmuje też urlop rodzicielski",
          citation: "UZ art. 30 ust. 1; KP art. 177 § 3",
          readings: {
            yes: "Gdy umowę przedłużono do dnia porodu albo pracodawcę zlikwidowano, zasiłek przysługuje za cały okres macierzyńskiego i rodzicielskiego. ZUS wypłaca go bezpośrednio.",
            no: "Po ustaniu zatrudnienia zasiłek przysługuje tylko za okres odpowiadający urlopowi macierzyńskiemu. Urlop rodzicielski wymagałby nowego tytułu do ubezpieczenia.",
            support: "Domyślnie „Tak” — tak rozstrzygnięto sprawy B1-10 i B6-07.",
          },
        }),
        art30PreBirthIncludesUnlawfulTermination: interp({
          label: "Zasiłek do porodu (art. 30 ust. 3) także po bezprawnym rozwiązaniu umowy",
          citation: "UZ art. 30 ust. 3",
          readings: {
            yes: "Zasiłek w wysokości macierzyńskiego do dnia porodu przysługuje także, gdy sąd orzekł o bezprawnym rozwiązaniu umowy. Rozszerza to listę z art. 30 ust. 3 na zasadzie analogii.",
            no: "Zasiłek do dnia porodu przysługuje tylko po ogłoszeniu upadłości lub likwidacji pracodawcy. To odczyt literalny art. 30 ust. 3.",
            support: "Domyślnie „Nie” — odczyt literalny; w 86 sprawach nie ma przypadku rozstrzygającego inaczej.",
          },
        }),
        fatherSharedPartAtAveragedRate: interp({
          label: "Ojciec biorący część wspólną dostaje stawkę uśrednioną matki",
          citation: "UZ art. 31 ust. 3",
          readings: {
            yes: "Gdy matka wybrała wariant uśredniony, ojciec za część wspólną urlopu rodzicielskiego dostaje tę samą stawkę. Wyjątkiem jest jego 9 tygodni (70%).",
            no: "Ojciec za każdą część urlopu rodzicielskiego dostaje stawkę urlopu rodzicielskiego. Wybór matki dotyczy tylko jej zasiłku.",
            support: "Domyślnie „Tak” — za poradnikiem ZUS 2026; w 86 sprawach brak przypadku przeciwnego.",
          },
        }),
        supplementaryForNonEmployees: interp({
          label: "Urlop uzupełniający przysługuje także osobom niebędącym pracownikami",
          citation: "UZ art. 29 ust. 1; KP art. 180²",
          readings: {
            yes: "Osoba prowadząca działalność lub zleceniobiorca dostaje zasiłek za okres odpowiadający urlopowi uzupełniającemu. Warunki są te same co dla pracownika.",
            no: "Zasiłek za okres urlopu uzupełniającego dostaje tylko pracownik. Pozostali ubezpieczeni mają wyłącznie urlop macierzyński i rodzicielski.",
            support: "Domyślnie „Tak” — tak rozstrzygnięto sprawy B6-10 i B6-11 (prowadzące działalność).",
          },
        }),
        stillbornCountsForMaternityLength: interp({
          label: "Dziecko martwo urodzone liczy się do wymiaru urlopu przy porodzie mnogim",
          citation: "KP art. 180 § 1, art. 180¹",
          readings: {
            yes: "Wymiar urlopu macierzyńskiego przy porodzie mnogim ustala się według liczby wszystkich urodzonych dzieci, także martwo urodzonych. Strata jednego dziecka nie skraca wymiaru wynikającego z porodu mnogiego.",
            no: "Wymiar ustala się tylko według dzieci urodzonych żywo. Przy stracie jednego z bliźniąt matka ma wymiar jak przy jednym dziecku.",
            support: "Domyślnie „Tak” — zgodnie ze sprawą B2-08 (trojaczki, jedno dziecko martwo urodzone).",
          },
        }),
      })
      .strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const w = p.maternity.weeksByChildren;
    const order = ["1", "2", "3", "4", "5plus"] as const;
    for (let i = 1; i < order.length; i++) if (w[order[i]] < w[order[i - 1]]) issue(["maternity", "weeksByChildren", order[i]], "Wymiar nie może być krótszy niż przy mniejszej liczbie dzieci.");
    if (p.maternity.motherMandatoryWeeks > w["1"]) issue(["maternity", "motherMandatoryWeeks"], "Część obowiązkowa nie może przekraczać całego urlopu macierzyńskiego.");
    if (p.maternity.preBirthMaxWeeks > w["1"]) issue(["maternity", "preBirthMaxWeeks"], "Część przed porodem nie może przekraczać całego urlopu macierzyńskiego.");
    if (p.parental.weeks.multiple < p.parental.weeks.single) issue(["parental", "weeks", "multiple"], "Przy więcej niż jednym dziecku urlop nie może być krótszy.");
    if (p.parental.weeksZaZyciem.single < p.parental.weeks.single) issue(["parental", "weeksZaZyciem", "single"], "Urlop „Za życiem” nie może być krótszy niż zwykły.");
    if (p.parental.weeksZaZyciem.multiple < p.parental.weeks.multiple) issue(["parental", "weeksZaZyciem", "multiple"], "Urlop „Za życiem” nie może być krótszy niż zwykły.");
    if (p.parental.reservedWeeksPerParent > p.parental.weeks.single) issue(["parental", "reservedWeeksPerParent"], "Część nieprzenoszalna nie może przekraczać całego urlopu rodzicielskiego.");
    if (p.wage.minimumWage > p.wage.forecastAverageWage) issue(["wage", "minimumWage"], "Minimalne wynagrodzenie nie może być wyższe niż prognozowane przeciętne.");
    if (p.sickness.sickPayDaysAge50 > p.sickness.sickPayDays) issue(["sickness", "sickPayDaysAge50"], "Nie może być dłuższe niż wynagrodzenie chorobowe ogółem.");
    if (p.supplementary.extremePretermBeforeWeek > p.supplementary.pretermBeforeWeek) issue(["supplementary", "extremePretermBeforeWeek"], "Próg skrajnego wcześniactwa nie może być późniejszy niż próg wcześniactwa.");
    if (p.supplementary.termFirstDayFrom > p.supplementary.termFirstDayTo) issue(["supplementary", "termFirstDayTo"], "Koniec przedziału nie może być wcześniej niż początek.");
  });

export type ParameterSetInput = z.infer<typeof parameterSetSchema>;

// Compile-time guard: the schema's output must be assignable to the engine's ParameterSet.
const _typecheck = (p: ParameterSetInput): ParameterSet => p;
void _typecheck;

const HEADER_KEYS = new Set(["id", "validFrom", "label", "sources"]);

type AnySchema = z.ZodType & { meta(): Record<string, unknown> | undefined };

function walk(schema: z.ZodType, prefix: string, out: FieldSpec[]) {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
  if (!shape) return;
  for (const [key, child] of Object.entries(shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!prefix && HEADER_KEYS.has(key)) continue;
    const meta = (child as AnySchema).meta() as ParamMeta | undefined;
    if (meta?.unit) {
      const num = child as unknown as { minValue?: number | null; maxValue?: number | null };
      out.push({ path, ...meta, ...(typeof num.minValue === "number" ? { min: num.minValue } : {}), ...(typeof num.maxValue === "number" ? { max: num.maxValue } : {}) });
    } else walk(child, path, out);
  }
}

let cached: FieldSpec[] | null = null;
/** Every editable field in schema order (header fields id/validFrom/label/sources excluded). */
export function fieldSpecs(): FieldSpec[] {
  if (!cached) {
    const out: FieldSpec[] = [];
    walk(parameterSetSchema, "", out);
    cached = out;
  }
  return cached;
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  for (const k of keys.slice(0, -1)) {
    cur[k] = { ...((cur[k] as Record<string, unknown>) ?? {}) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys.at(-1)!] = value;
  return clone as T;
}

export interface DiffEntry {
  path: string;
  label: string;
  unit: ParamUnit;
  group: GroupId;
  from: unknown;
  to: unknown;
  fromText: string;
  toText: string;
}

/** Changed parameter fields (header fields excluded): published → draft. */
export function diffSets(from: unknown, to: unknown): DiffEntry[] {
  return fieldSpecs().flatMap((f) => {
    const a = getPath(from, f.path);
    const b = getPath(to, f.path);
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    return [{ path: f.path, label: f.label, unit: f.unit, group: f.group, from: a, to: b, fromText: formatParam(f.unit, a, f.options), toText: formatParam(f.unit, b, f.options) }];
  });
}

/** zod issues → { "rates.parental": "Najwyżej 100%." } (first message per path). */
export function issuesToFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const i of error.issues) {
    const key = i.path.join(".") || "_";
    if (!fields[key]) fields[key] = i.message;
  }
  return fields;
}
