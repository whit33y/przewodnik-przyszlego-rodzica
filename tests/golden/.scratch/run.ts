
import { evaluate, compare } from "@/engine";
import { loadCases, loadParams } from "../load";
(() => {
  const sets = loadParams();
  for (const c of loadCases()) {
    if (process.env.ONLY && c.id !== process.env.ONLY) continue;
    try {
      const r = evaluate(c.input.facts, c.input.plan, sets);
      const fr = compare(r, c.expected);
      const bad = fr.filter((f) => f.status === "mismatch");
      const rep = fr.filter((f) => f.status === "reported");
      console.log(`${c.id} ${r.outcome.value} [${r.outcome.reasonCodes}] mism=${bad.length} rep=${rep.length}`);
      for (const b of [...bad, ...rep]) console.log(`   ${b.status} ${b.path}: exp=${JSON.stringify(b.expected)} act=${JSON.stringify(b.actual)}`);
      if (process.env.ONLY) console.log(JSON.stringify(r.periods.map(p=>[p.type,p.parent,p.from,p.to,p.days,p.status,p.reasonCode,p.base,p.rateBps,p.daily]),null,0), JSON.stringify(r.bases), JSON.stringify(r.alerts.map(a=>[a.code,a.severity])));
    } catch (e) { console.log(c.id, "THROW", (e as Error).stack); }
  }
})();
