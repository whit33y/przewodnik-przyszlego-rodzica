/**
 * "Dlaczego?" — one plain Polish sentence per engine trace step, keyed by ruleId.
 * The engine records inputs and outputs only (grosze, basis points, ISO dates); every word lives here.
 * Unknown rules fall back to a generic sentence per stage, so a new engine rule never shows raw JSON to a parent.
 */
import type { LeaveType, ReasonCode, Stage, TraceStep } from "@/engine/types";
import { formatDateLong, formatDuration, formatMoney, plural } from "@/lib/format";
import { leaveShort, ratePct, reasonText, roleLabel } from "./pl";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const date = (v: unknown) => (str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string) ? formatDateLong(v as string) : undefined);
const money = (v: unknown) => (num(v) !== undefined ? formatMoney(v as number) : undefined);
const pct = (v: unknown) => (num(v) !== undefined ? ratePct(v as number) : undefined);
const days = (v: unknown) => (num(v) !== undefined ? formatDuration(v as number) : undefined);
const leave = (v: unknown) => (str(v) ? (leaveShort as Record<string, string>)[v as string] ?? (v as string) : "urlop");
const who = (v: unknown) => (v === "other" ? "drugi rodzic" : "Ty");
const reason = (v: unknown) => (str(v) && (reasonText as Record<string, string>)[v as string] ? reasonText[v as ReasonCode] : undefined);

export const stageLabel: Record<Stage, string> = {
  params: "Parametry prawne",
  insurance: "Ubezpieczenie",
  event: "Zdarzenie",
  lengths: "Wymiar urlopu",
  allocation: "Podział urlopu",
  rate: "Stawka zasiłku",
  base: "Podstawa wymiaru",
  amount: "Kwota",
  gating: "Warunki wypłaty",
  routing: "Kto wypłaca i gdzie złożyć",
  alerts: "Ostrzeżenia",
  outcome: "Rozstrzygnięcie",
};

const purposeText: Record<string, string> = {
  event: "w dniu porodu lub przyjęcia dziecka",
  dueDate: "w przewidywanym dniu porodu",
  partStart: "w dniu rozpoczęcia tej części urlopu",
  sickness: "w czasie zwolnienia lekarskiego",
};

const baseMethodText: Record<string, string> = {
  employee12m: "średnia z 12 miesięcy przed powstaniem prawa",
  employeeShort: "średnia z pełnych miesięcy, bo umowa trwa krócej niż 12 miesięcy",
  employeeFirstMonth: "wynagrodzenie umówione na pierwszy miesiąc",
  employeeNewWorkTime: "przeliczona po zmianie wymiaru czasu pracy",
  nonEmployee12m: "średnia zadeklarowanych podstaw z 12 miesięcy",
  nonEmployeeArt48a: "uśredniona z minimalną podstawą za brakujące miesiące (art. 48a)",
  nonEmployeeFirstMonth: "podstawa z pierwszego miesiąca ubezpieczenia",
  carriedOver: "przejęta z wcześniejszego zasiłku (bez przerwy między zasiłkami)",
  stated: "podana w dokumentach",
};

const rateReason: Record<string, string> = {
  "R-AMT-MAT100": "urlop macierzyński przy wyborze 100% / 70%",
  "R-AMT-MAT100-LOSS": "po stracie dziecka zasiłek wynosi zawsze 100%",
  "R-AMT-MAT100-PAT": "urlop ojcowski jest płatny w 100%",
  "R-AMT-MAT100-SUPP": "uzupełniający urlop macierzyński jest płatny w 100%",
  "R-AMT-815": "wniosek o cały urlop złożony w ciągu 21 dni od porodu — jedna stawka 81,5%",
  "R-AMT-815-1Y": "część urlopu rodzicielskiego po 1. roku życia dziecka — 70%",
  "R-AMT-PAR70": "urlop rodzicielski przy wyborze 100% / 70%",
  "R-AMT-9W": "Twoje 9 tygodni urlopu rodzicielskiego, których nie można przekazać",
  "R-AMT-ART30": "zasiłek po likwidacji lub upadłości pracodawcy — do dnia porodu",
  "R-AMT-REHAB": "świadczenie rehabilitacyjne w ciąży",
  "R-AMT-SICK": "zasiłek chorobowy",
};

const loss = (o: Rec) => (o.loss === "total" ? "po stracie dziecka" : o.loss === "partial" ? "gdy nie wszystkie dzieci przeżyły" : "");

type Sentence = (s: { inputs: Rec; output: unknown; ruleId: string }) => string | undefined;

const sentences: Record<string, Sentence> = {
  "PARAMS-SELECT": ({ inputs, output }) => {
    const o = rec(output);
    return `Stosujemy przepisy i kwoty obowiązujące od ${date(o.validFrom) ?? "…"}${date(inputs.date) ? ` — liczymy na dzień ${date(inputs.date)}` : ""}.`;
  },
  "B5-B10-EVENT": ({ output }) => {
    const o = rec(output);
    const n = num(o.childrenCount) ?? 1;
    const live = num(o.liveCount);
    if (o.loss === "total") return `Dziecko nie żyje (urodzenie martwe lub zgon wkrótce po porodzie) — stosujemy przepisy o stracie dziecka.`;
    const base = n > 1 ? `Poród ${n} ${plural(n, "dziecka", "dzieci", "dzieci")} (ciąża mnoga)` : "Poród jednego dziecka";
    const parts = [base];
    if (o.loss === "partial" && live !== undefined) parts.push(`żyje ${live} z nich`);
    if (o.zaZyciem) parts.push("z zaświadczeniem „Za życiem”");
    return `${parts.join(", ")}.`;
  },
  "B6-CARE-EVENT": ({ inputs, output }) => {
    const o = rec(output);
    const kind = inputs.kind === "foster" ? "Przyjęcie dziecka do rodziny zastępczej" : "Przyjęcie dziecka na wychowanie (adopcja)";
    return `${kind}${date(inputs.date) ? ` ${date(inputs.date)}` : ""}.${reason(o.careRefusal) ? ` ${reason(o.careRefusal)}` : ""}`;
  },
  "KP-180-1-TABLE": ({ inputs, output }) => {
    const n = num(rec(inputs).children) ?? 1;
    return `Urlop macierzyński przy ${n} ${plural(n, "dziecku", "dzieciach", "dzieciach")}: ${days(rec(output).maternityDays) ?? "…"}.`;
  },
  "KP-180-1": ({ inputs, output }) => `Urlop macierzyński ${loss(inputs) || "po stracie dziecka"}: ${days(rec(output).maternityDays) ?? "…"}.`,
  "KP-183-ADOPTION": ({ output }) => {
    const o = rec(output);
    return `Urlop na warunkach urlopu macierzyńskiego przy przyjęciu dziecka: ${days(o.maternityDays) ?? "…"}${o.reducedAdoptionCase ? " (skrócony ze względu na wiek dziecka)" : ""}.`;
  },
  "KP-182-1A-POOL": ({ output }) => {
    const o = rec(output);
    if (num(o.parentalTotal) === 0) return "Urlop rodzicielski nie przysługuje.";
    return `Urlop rodzicielski: ${days(o.parentalTotal) ?? "…"} dla obojga rodziców; ${days(o.reserved) ?? "9 tygodni"} z tego przysługuje tylko każdemu z rodziców osobno${date(o.parentalDeadline) ? `. Wykorzystasz go do ${date(o.parentalDeadline)}` : ""}.`;
  },
  "KP-180-2-SUPPLEMENTARY": ({ output }) => {
    const o = rec(output);
    if (!num(o.weeks)) return "Uzupełniający urlop macierzyński nie przysługuje — dziecko nie urodziło się przedwcześnie ani nie przebywało długo w szpitalu.";
    return `Uzupełniający urlop macierzyński: ${days((num(o.weeks) ?? 0) * 7)} (najwyżej ${num(o.cap) ?? "…"} tygodni).`;
  },
  "KP-182-3-PATERNITY": ({ output }) => {
    const o = rec(output);
    return `Urlop ojcowski: ${days(o.paternityDays) ?? "14 dni"}${date(o.paternityExpiresOn) ? `, do wykorzystania do ${date(o.paternityExpiresOn)}` : ""}.`;
  },
  "R-ELIG-INSURED-AT-EVENT": ({ inputs, output }) => {
    const o = rec(output);
    const when = date(inputs.date ?? inputs.onDate);
    const purpose = purposeText[str(inputs.purpose) ?? ""] ?? "";
    const insured = o.insured === true;
    const head = `${when ? `${when} — ` : ""}${purpose ? `${purpose} ` : ""}${insured ? `masz ubezpieczenie chorobowe${o.mode === "voluntary" ? " (dobrowolne)" : ""}` : "nie masz ubezpieczenia chorobowego"}`.replace(/^./, (c) => c.toUpperCase());
    return `${head}.${!insured && reason(o.reasonCode) ? ` ${reason(o.reasonCode)}` : ""}`;
  },
  "R-ELIG-AFTER-TITLE-MAT": ({ inputs }) => `${date(inputs.onDate) ?? "W dniu porodu"} umowa już nie trwa, ale ustała przez likwidację lub upadłość pracodawcy — zasiłek przysługuje mimo to.`,
  "UZ-7-AFTER-TITLE": ({ inputs }) => `${date(inputs.onDate) ?? "W tym dniu"} ubezpieczenie już nie trwa, ale niezdolność do pracy zaczęła się w ciągu 14 dni od jego ustania — zasiłek przysługuje.`,
  "R-AMT-815-1Y-TOPUP": ({ output }) => {
    const o = rec(output);
    return `Za urlop rodzicielski po 1. roku życia dziecka stawka spada do ${pct(o.parentalRate) ?? "70%"}${num(o.daysAfterFirstYear) ? ` (${days(o.daysAfterFirstYear)})` : ""}.`;
  },
  "R-BASE-AFTER-TITLE-CAP": ({ output }) => `Podstawę zasiłku po ustaniu ubezpieczenia ograniczamy do ${money(rec(output).base) ?? "limitu"} (100% prognozowanego przeciętnego wynagrodzenia).`,
  "R-AMT-DAILY": ({ inputs, output }) => {
    const o = rec(output);
    const status = o.status === "withheld" ? " — wypłata wstrzymana" : o.status === "refused" ? " — nie przysługuje" : "";
    if (!num(inputs.base)) return `Brakuje danych o zarobkach, więc kwoty za ${days(inputs.days) ?? "ten okres"} nie liczymy${status}.`;
    return `Dziennie ${money(o.daily) ?? "…"} (${money(inputs.base)} × ${pct(inputs.rateBps)} ÷ 30); za ${days(inputs.days) ?? "…"} razem ${money(o.gross) ?? "…"} brutto${status}.`;
  },
  "R-AMT-MIN": ({ output }) => `Zasiłek netto byłby niższy niż 1 000 zł miesięcznie — ZUS go podwyższy (łącznie o ${money(rec(output).topUpTotal) ?? "…"}).`,
  "R-ELIG-ARREARS": ({ inputs, output }) => {
    const o = rec(output);
    const when = date(inputs.rightArisesOn) ?? "w dniu powstania prawa";
    if (o.blocked) {
      const amt = money(inputs.amount ?? o.amount);
      return `${when}: zaległość w składkach${amt ? ` ${amt}` : ""} przekracza próg ${money(o.threshold) ?? "1% minimalnego wynagrodzenia"} — wypłata wstrzymana do spłaty${date(o.expiresOn) ? ` (prawo wygasa ${date(o.expiresOn)})` : ""}.`;
    }
    if (date(o.repaidOn)) return `Zaległość spłacona ${date(o.repaidOn)} — nie blokuje wypłaty.`;
    return `${when}: brak zaległości w składkach ponad próg ${money(o.threshold) ?? "1% minimalnego wynagrodzenia"}.`;
  },
  "R-ELIG-WAIT-SICK": ({ output }) => {
    const o = rec(output);
    return `Okres wyczekiwania (${days(o.waitingDays) ?? "30 dni"} ubezpieczenia): zasiłek chorobowy przysługuje od ${date(o.firstPayable) ?? "…"}.`;
  },
  "R-SICK-BENEFIT-PERIOD": ({ output }) => {
    const o = rec(output);
    return `Okres zasiłkowy: najwyżej ${days(o.limit) ?? "…"}${date(o.exhaustedFrom) ? `; wyczerpany od ${date(o.exhaustedFrom)}` : ""}.`;
  },
  "R-PAY-1": ({ output }) => {
    const o = rec(output);
    const payer = o.benefitPayer === "payer" ? "Twój pracodawca (zgłasza do ubezpieczenia chorobowego ponad 20 osób)" : "ZUS";
    const where = o.fileWith === "employer" ? "u pracodawcy" : "w ZUS";
    return `Zasiłek wypłaci ${payer}; wniosek składasz ${where}.`;
  },
  ALERTS: ({ output }) => {
    const n = Array.isArray(output) ? output.length : 0;
    return n ? `Sprawdziliśmy ryzyka: ${n} ${plural(n, "ostrzeżenie", "ostrzeżenia", "ostrzeżeń")}.` : "Sprawdziliśmy ryzyka — bez ostrzeżeń.";
  },
  OUTCOME: ({ output }) => {
    const v = rec(output).value;
    return v === "granted" ? "Wynik: zasiłek przysługuje." : v === "withheld" ? "Wynik: prawo jest, ale wypłata jest wstrzymana." : v === "partial" ? "Wynik: zasiłek przysługuje za część okresu." : "Wynik: zasiłek nie przysługuje.";
  },
};

/** Allocation rules: one block of the plan placed on the calendar. */
const allocationRules = new Set(["KP-180", "KP-183", "KP-180-2", "KP-182-1A", "KP-182-3", "UZ-30-3", "UZ-SICKNESS", "ALLOC"]);

function allocation({ inputs, output }: { inputs: Rec; output: unknown }): string {
  const segs = Array.isArray(output) ? output.map(rec) : [];
  const first = segs[0];
  const last = segs.at(-1);
  const refused = segs.filter((x) => x.status === "refused").reduce((a, x) => a + (num(x.days) ?? 0), 0);
  const total = segs.reduce((a, x) => a + (num(x.days) ?? 0), 0) || num(inputs.days);
  const span = first && last ? ` od ${date(first.from) ?? "…"} do ${date(last.to) ?? "…"}` : "";
  const by = inputs.parent ? ` (${who(inputs.parent)})` : "";
  return `${leave(inputs.type)}${by}${span}: ${days(total) ?? "…"}${refused ? `, z czego ${days(refused)} poza przysługującym wymiarem` : ""}.`;
}

function rate({ ruleId, inputs, output }: { ruleId: string; inputs: Rec; output: unknown }): string {
  const o = rec(output);
  const why = rateReason[ruleId];
  const work = num(o.workReductionBps) ? `, pomniejszona o ${pct(o.workReductionBps)} za pracę w trakcie urlopu` : "";
  return `Stawka ${pct(o.rateBps) ?? "…"} podstawy${why ? ` — ${why}` : ""}${work}.${inputs.assumedOnTime === true ? " Zakładamy, że wniosek złożysz w terminie." : ""}`;
}

function base({ output }: { output: unknown }): string {
  const o = rec(output);
  if (o.dataMissing) return "Brakuje danych o zarobkach — podstawy zasiłku nie da się policzyć.";
  const how = baseMethodText[str(o.method) ?? ""];
  const extras = [o.floorApplied ? "podniesiona do minimalnej podstawy" : "", o.capApplied ? "ograniczona do górnego limitu" : ""].filter(Boolean).join(", ");
  const months = num(o.monthsUsed);
  return `Podstawa wymiaru zasiłku: ${money(o.base) ?? "…"}${how ? ` — ${how}` : ""}${months && str(o.method) !== "stated" ? ` (${months} ${plural(months, "miesiąc", "miesiące", "miesięcy")})` : ""}${extras ? `; ${extras}` : ""}.`;
}

/** Plain Polish sentence for a trace step; falls back to the stage when a rule has no copy yet. */
export function traceSentence(step: TraceStep): string {
  const ctx = { ruleId: step.ruleId, inputs: rec(step.inputs), output: step.output };
  try {
    const own = sentences[step.ruleId]?.(ctx);
    if (own) return own;
    if (step.stage === "allocation" || allocationRules.has(step.ruleId)) return allocation(ctx);
    if (step.stage === "rate") return rate(ctx);
    if (step.stage === "base" || step.ruleId.startsWith("R-BASE-")) return base(ctx);
  } catch {
    // fall through to the generic sentence
  }
  return `Krok obliczeń: ${stageLabel[step.stage]?.toLowerCase() ?? "inne"}.`;
}

/** Labels for the technical details (input keys stay visible there, unchanged). */
export function traceValue(key: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "tak" : "nie";
  if (typeof v === "number") {
    if (/bps$/i.test(key)) return ratePct(v);
    if (/^(base|daily|gross|net|amount|threshold|topUp)/i.test(key)) return formatMoney(v);
    if (/days$/i.test(key)) return formatDuration(v);
    return String(v);
  }
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDateLong(v);
    if ((leaveShort as Record<string, string>)[v]) return leaveShort[v as LeaveType];
    if ((roleLabel as Record<string, string>)[v]) return roleLabel[v as keyof typeof roleLabel];
    return v;
  }
  const j = JSON.stringify(v);
  return j.length > 160 ? `${j.slice(0, 160)}…` : j;
}
