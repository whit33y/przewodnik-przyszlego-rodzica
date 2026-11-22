import { randomInt } from "node:crypto";
import { selectParameterSet } from "@/engine";
import { arrearsThreshold } from "@/engine/params";
import { aboveThreshold, snapshotOn } from "@/engine/stages/gating";
import { apiError, json, requireContext } from "@/server/api";
import { evaluateFacts } from "@/server/engine-facade";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Simulated "zaświadczenie o stanie rozliczeń" on a given day (default: the birth / due date).
 * Threshold, snapshot choice and the threshold test are the engine's own functions; whether the arrears block the
 * benefit comes from the engine Result (alerts / withheld entitlements), not from a re-implemented rule.
 */
export async function GET(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const f = ctx.assembled.facts;
  const eventDay = (f.event.kind === "birth" ? f.event.date ?? f.event.expectedDate : f.event.takenIntoCareOn) ?? f.asOf;
  const q = new URL(req.url).searchParams.get("onDate");
  if (q !== null && !ISO.test(q)) return apiError(422, "VALIDATION", "Podaj datę w formacie RRRR-MM-DD.", { onDate: "RRRR-MM-DD" });
  const onDate = q ?? eventDay;
  if (ctx.assembled.unverified.includes("zus-saldo")) {
    return apiError(409, "NOT_FETCHED", "Nie pobraliśmy danych o rozliczeniach składek — wyraź zgodę na pobranie z ZUS albo sprawdź saldo w PUE/eZUS.");
  }
  const { result, sets } = await evaluateFacts(f, ctx.answers.plan ?? null);
  const threshold = arrearsThreshold(selectParameterSet(sets, onDate));
  const account = f.claimant.titles.some((t) => t.kind === "collaborator") ? "payer" : "own";
  const snap = snapshotOn(f.claimant.arrears, account, onDate);
  const repaid = Boolean(snap?.repaidOn && snap.repaidOn <= onDate);
  const blocksPayment = result
    ? result.alerts.some((a) => (a.code === "ARREARS_OWN" || a.code === "ARREARS_PAYER") && a.severity === "blocking") ||
      result.entitlements.some((e) => e.reasonCode === "ARREARS_UNPAID" || e.reasonCode === "ARREARS_RIGHT_EXPIRED")
    : null;
  return json({
    onDate,
    account,
    amount: snap ? (repaid ? 0 : (snap.amount ?? null)) : 0,
    snapshotOn: snap?.onDate ?? null,
    threshold,
    aboveThreshold: snap ? !repaid && aboveThreshold(snap, threshold) : false,
    /** Engine verdict on the day the right to maternity benefit arises. */
    blocksPayment,
    issuedAt: new Date().toISOString(),
    number: `ZUS-SIM-${String(randomInt(0, 100_000_000)).padStart(8, "0")}`,
  });
}
