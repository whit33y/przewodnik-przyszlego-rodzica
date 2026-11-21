import { json, requireContext } from "@/server/api";
import { getPublishedParams } from "@/server/params-repo";

/** Simulated "zaświadczenie o niezaleganiu / stan zadłużenia" on a given day (default: due date). */
export async function GET(req: Request) {
  const ctx = await requireContext();
  if (ctx instanceof Response) return ctx;
  const f = ctx.assembled.facts;
  const onDate = new URL(req.url).searchParams.get("onDate") ?? (f.event.kind === "birth" ? f.event.date ?? f.event.expectedDate : f.event.takenIntoCareOn) ?? f.asOf;
  const { sets } = await getPublishedParams();
  const set = [...sets].reverse().find((s) => s.validFrom <= onDate) ?? sets[0];
  const minimumWage = (set as unknown as { wage: { minimumWage: number } }).wage.minimumWage;
  const thresholdBps = (set as unknown as { arrears: { thresholdPctOfMinWageBps: number } }).arrears.thresholdPctOfMinWageBps;
  const threshold = Math.round((minimumWage * thresholdBps) / 10000);
  const latest = [...f.claimant.arrears].sort((a, b) => a.onDate.localeCompare(b.onDate)).pop();
  const amount = latest && !latest.repaidOn ? (latest.amount ?? null) : 0;
  const blocks = latest ? !latest.repaidOn && (latest.aboveThreshold || (latest.amount ?? 0) > threshold) : false;
  return json({ onDate, account: latest?.account ?? "own", amount, threshold, blocksPayment: blocks, issuedAt: new Date().toISOString(), number: `ZUS-SIM-${ctx.state.sid.slice(0, 8).toUpperCase()}` });
}
