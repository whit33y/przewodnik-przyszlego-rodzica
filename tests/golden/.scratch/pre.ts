import { evaluate } from "@/engine";
import { loadCases, loadParams } from "../load";
import { preEventFacts } from "../pre-event";
const sets = loadParams();
for (const c of loadCases()) {
  if (c.id !== process.env.ONLY) continue;
  const f = preEventFacts(c.input);
  const r = evaluate(f, null, sets);
  console.log(JSON.stringify({ asOf: f.asOf, ev: f.event, used: f.otherParent?.used, paid: f.claimant.paidBenefits }).slice(0, 1500));
  console.log(JSON.stringify(r.defaultPlan?.blocks));
  console.log(JSON.stringify(r.periods.map((p) => [p.type, p.from, p.days, p.status, p.reasonCode])));
  console.log(JSON.stringify(r.alerts.map((a) => [a.code, a.severity, a.onDate])), JSON.stringify(r.pools.parentalParts));
}
