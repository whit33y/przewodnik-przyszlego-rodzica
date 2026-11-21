import fs from "node:fs";
import path from "node:path";
import { evaluate } from "@/engine";
import { assemble } from "@/server/assemble";
import { loadParams } from "../load";
const sets = loadParams();
const dir = path.resolve(__dirname, "../../../data/personas");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const a = assemble({ payloads: p.systems, meta: {}, answers: p.presetAnswers ?? {}, overrides: [], asOf: p.asOf, mode: "mobywatel" });
  try {
    const r = evaluate(a.facts, null, sets);
    console.log(f, r.mode, r.outcome.value, JSON.stringify(r.alerts.map((x) => [x.code, x.severity])), JSON.stringify(r.defaultPlan?.blocks.map((b) => [b.id, b.from, b.days])));
  } catch (e) { console.log(f, "THROW", (e as Error).stack?.slice(0, 500)); }
}
for (const f of ["monika.json", "patrycja.json"]) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const a = assemble({ payloads: p.systems, meta: {}, answers: p.presetAnswers ?? {}, overrides: [], asOf: p.asOf, mode: "mobywatel" });
  const r = evaluate(a.facts, null, sets);
  console.log(f, JSON.stringify(a.facts.claimant.paidBenefits), JSON.stringify(a.facts.claimant.sickNotes), JSON.stringify(r.periods.map((x) => [x.type, x.from, x.to, x.days, x.status, x.reasonCode])), JSON.stringify((a.facts.event as {children:unknown}).children));
}
