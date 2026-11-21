import type { SystemId } from "./types";

export interface SourceMeta {
  id: SystemId;
  /** Registry name as shown to the user. */
  label: string;
  /** What we read — plain Polish. */
  reads: string;
  /** Why we need it. */
  purpose: string;
  /** Without it calculations are impossible; we would have to ask manually. */
  required: boolean;
  latencyMs: number;
}

/** Order = order on the consent and fetch screens. */
export const SOURCES: SourceMeta[] = [
  { id: "mobywatel", label: "mObywatel", reads: "imię, płeć i rok urodzenia", purpose: "Żeby wiedzieć, kim jesteś — bez wpisywania danych.", required: true, latencyMs: 300 },
  { id: "zus-konto", label: "ZUS — konto ubezpieczonego", reads: "tytuły ubezpieczenia, okresy ubezpieczenia chorobowego, podstawy składek z 12 miesięcy", purpose: "Sprawdzamy, czy masz prawo do zasiłku, i liczymy jego wysokość.", required: true, latencyMs: 900 },
  { id: "zus-platnik", label: "ZUS — dane płatnika", reads: "czy Twój pracodawca zgłasza do ubezpieczenia chorobowego ponad 20 osób", purpose: "Mówimy, kto wypłaci zasiłek: pracodawca czy ZUS.", required: false, latencyMs: 700 },
  { id: "zus-saldo", label: "ZUS — rozliczenia składek", reads: "zaległości w składkach na dziś i na dzień porodu", purpose: "Zaległość ponad 1% minimalnego wynagrodzenia blokuje wypłatę zasiłku.", required: false, latencyMs: 1100 },
  { id: "zus-ezla", label: "ZUS — zwolnienia lekarskie (e-ZLA)", reads: "zwolnienia lekarskie z ostatnich 12 miesięcy, kod B (ciąża)", purpose: "Zasiłek chorobowy w ciąży i ciągłość podstawy wymiaru.", required: false, latencyMs: 800 },
  { id: "zus-swiadczenia", label: "ZUS — wypłacone świadczenia", reads: "zasiłki już wypłacone Tobie i drugiemu rodzicowi", purpose: "Liczymy, ile urlopu zostało i ile części już wykorzystano.", required: false, latencyMs: 1000 },
  { id: "zus-postepowania", label: "ZUS — postępowania", reads: "decyzje w sprawie podlegania ubezpieczeniom", purpose: "Uwzględniamy rozstrzygnięcia, które już zapadły.", required: false, latencyMs: 600 },
  { id: "ceidg", label: "CEIDG", reads: "status działalności gospodarczej i okresy zawieszenia", purpose: "Zawieszenie firmy przed porodem odbiera prawo do zasiłku.", required: false, latencyMs: 1300 },
  { id: "krs", label: "KRS", reads: "czy pracodawca jest w likwidacji lub upadłości", purpose: "Przy likwidacji pracodawcy przysługuje zasiłek w wysokości macierzyńskiego.", required: false, latencyMs: 1200 },
  { id: "rsc", label: "Rejestr stanu cywilnego", reads: "akt urodzenia dziecka, drugi rodzic", purpose: "Nie poprosimy Cię o odpis aktu urodzenia.", required: false, latencyMs: 1500 },
  { id: "ezdrowie", label: "e-zdrowie (P1)", reads: "przewidywana data porodu, pobyt dziecka w szpitalu", purpose: "Wyliczamy urlop przed porodem i urlop uzupełniający.", required: false, latencyMs: 1800 },
];

export const sourceById = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SystemId, SourceMeta>;
