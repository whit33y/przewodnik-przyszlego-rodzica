import "server-only";
import { z } from "zod";
import { selectParameterSet } from "@/engine";
import { addMonths, isValidDate } from "@/engine/dates";
import type { Facts, ISODate, Result } from "@/engine/types";
import type { ManualFacts } from "@/integrations/types";
import { assemble } from "./assemble";
import { engineParams, evaluateFacts } from "./engine-facade";
import { validateStateless } from "./evaluate-input";

/**
 * "Planuję dziecko": the same engine in prospective mode with a hypothetical due date.
 * Nothing here is persisted — the hypothetical date lives in the URL until the user saves it.
 */

const shiftYears = (iso: ISODate, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

/** Default hypothetical due date: the known due date when it is still ahead, else "today" + 9 months. */
export function defaultDueDate(asOf: ISODate, known?: ISODate): ISODate {
  return known && known > asOf ? known : addMonths(asOf, 9);
}

/** The due date from the DateInput fields (`termin-d`, `termin-m`, `termin-y`), bounded to the next two years. */
export function dueDateFromQuery(q: Record<string, string | string[] | undefined>, asOf: ISODate): { value?: ISODate; error?: string } {
  const get = (k: string) => (typeof q[k] === "string" ? (q[k] as string).trim() : "");
  const [d, m, y] = [get("termin-d"), get("termin-m"), get("termin-y")];
  if (!d && !m && !y) return {};
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return { error: "Wpisz pełną datę, np. 15 8 2027." };
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  if (!isValidDate(iso)) return { error: "Taka data nie istnieje." };
  if (iso <= asOf || iso > shiftYears(asOf, 2)) return { error: "Podaj datę w ciągu najbliższych dwóch lat." };
  return { value: iso };
}

/** Facts as they would stand on a hypothetical due date: no birth yet, one child expected, no plan (maximum entitlement). */
export function prospectiveFacts(facts: Facts, due: ISODate): Facts {
  const f = structuredClone(facts);
  delete f.mode;
  delete f.parameterDate;
  f.event = { kind: "birth", expectedDate: due, children: [{ ref: "child-1" }] };
  return f;
}

export interface Checkup {
  due: ISODate;
  asOf: ISODate;
  result: Result;
  facts: Facts;
}

export async function runCheckup(facts: Facts, due: ISODate): Promise<Checkup | null> {
  const f = prospectiveFacts(facts, due);
  const { result } = await evaluateFacts(f, null);
  return result ? { due, asOf: f.asOf, result, facts: f } : null;
}

// ── Logged-out: four questions ─────────────────────────────────────────────

export const WORK = ["employment", "mandate", "selfEmployed", "none"] as const;

const questionsSchema = z.object({
  praca: z.enum(WORK, { error: "Wybierz formę pracy." }),
  chorobowe: z.enum(["tak", "nie", "nie-wiem"], { error: "Odpowiedz, czy masz ubezpieczenie chorobowe." }),
  zaleglosci: z.enum(["tak", "nie"], { error: "Odpowiedz, czy masz zaległości w składkach." }),
});

export interface PlanningAnswers {
  praca?: (typeof WORK)[number];
  chorobowe?: "tak" | "nie" | "nie-wiem";
  od?: ISODate;
  zaleglosci?: "tak" | "nie";
}

export type QuestionsCheck = { state: "empty" } | { state: "invalid"; values: PlanningAnswers; errors: Record<string, string> } | { state: "ok"; values: Required<Omit<PlanningAnswers, "od">> & { od?: ISODate }; due: ISODate };

/** Parses the GET form; a submitted form is recognised by the `sprawdz` field. */
export function parseQuestions(q: Record<string, string | string[] | undefined>, today: ISODate): QuestionsCheck {
  if (q.sprawdz === undefined) return { state: "empty" };
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const parsed = questionsSchema.safeParse({ praca: one("praca"), chorobowe: one("chorobowe"), zaleglosci: one("zaleglosci") });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] = i.message;
  const values: PlanningAnswers = { praca: parsed.success ? parsed.data.praca : (WORK as readonly string[]).includes(one("praca") ?? "") ? (one("praca") as PlanningAnswers["praca"]) : undefined };
  // "Od kiedy": required unless the person does not work.
  const get = (k: string) => (one(k) ?? "").trim();
  const [d, m, y] = [get("od-d"), get("od-m"), get("od-y")];
  let od: ISODate | undefined;
  if (d || m || y) {
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!/^\d{4}$/.test(y) || !isValidDate(iso)) errors.od = "Wpisz pełną, poprawną datę, np. 1 3 2025.";
    else if (iso > today || iso < "1960-01-01") errors.od = "Data musi być z przeszłości.";
    else od = iso;
  } else if (values.praca && values.praca !== "none") errors.od = "Wpisz, od kiedy pracujesz w tej formie.";
  const due = dueDateFromQuery(q, today);
  if (due.error) errors.termin = due.error;
  if (Object.keys(errors).length || !parsed.success) {
    return { state: "invalid", values: { ...values, chorobowe: parsed.success ? parsed.data.chorobowe : undefined, zaleglosci: parsed.success ? parsed.data.zaleglosci : undefined, od }, errors };
  }
  return { state: "ok", values: { ...parsed.data, od }, due: due.value ?? defaultDueDate(today) };
}

/** The four answers → manual facts → assembled Facts, validated like any stateless input before the engine sees them. */
export async function factsFromQuestions(values: Extract<QuestionsCheck, { state: "ok" }>["values"], today: ISODate, due: ISODate): Promise<Facts | null> {
  const work = values.praca;
  const manual: ManualFacts = {
    role: "mother",
    sex: "F",
    work,
    since: values.od ?? today,
    sicknessInsurance: work === "none" ? "none" : work === "employment" ? "mandatory" : values.chorobowe === "tak" ? "voluntary" : "none",
    arrears: work === "selfEmployed" ? values.zaleglosci === "tak" : undefined,
    ...(work === "employment" ? { fraction: { num: 1, den: 1 } } : {}),
  };
  const deductionBps = selectParameterSet(await engineParams(), today).deductions.employeeSocialBps;
  const { facts } = assemble({ payloads: {}, meta: {}, answers: { manual, expectedDate: due }, overrides: [], asOf: today, mode: "manual", deductionBps });
  const check = validateStateless(facts);
  return check.ok ? check.facts : null;
}
