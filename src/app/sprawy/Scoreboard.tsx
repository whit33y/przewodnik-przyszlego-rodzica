import { connection } from "next/server";
import { readReport } from "@/server/cases-repo";
import s from "./Sprawy.module.css";

interface Tally {
  match: number;
  mismatch: number;
}
interface Report {
  totals?: { cases: number; outcomeTier?: { asserted: number; match: number }; durationFields?: Tally; amountFields?: Tally; reported?: number; knownDivergences?: number; alertRecallRefusals?: { refusals: number; recalled: number } };
  generatedAt?: string;
}
const sum = (t?: Tally) => (t ? t.match + t.mismatch : undefined);

export async function Scoreboard({ total }: { total: number }) {
  await connection();
  const r = (readReport() ?? {}) as Report;
  const t = r.totals;
  return (
    <section className={s.score} aria-labelledby="score-title">
      <h2 id="score-title" className="visually-hidden">
        Zgodność z rozstrzygnięciami ZUS
      </h2>
      <div className={s.metric}>
        <span className={s.big}>
          {t?.outcomeTier?.match ?? "—"}
          <small>/{t?.outcomeTier?.asserted ?? total}</small>
        </span>
        <span>spraw z takim samym rozstrzygnięciem jak ZUS (przyznanie / odmowa)</span>
      </div>
      <div className={s.metric}>
        <span className={s.big}>
          {t?.durationFields?.match ?? "—"}
          <small>/{sum(t?.durationFields) ?? "—"}</small>
        </span>
        <span>zgodnych dat i liczby dni zasiłku</span>
      </div>
      <div className={s.metric}>
        <span className={s.big}>
          {t?.amountFields?.match ?? "—"}
          <small>/{sum(t?.amountFields) ?? "—"}</small>
        </span>
        <span>zgodnych kwot co do grosza</span>
      </div>
      <p className={s.scoreNote}>
        Liczymy tylko wartości wydrukowane w aktach. {t?.knownDivergences ? `${t.knownDivergences} rozbieżności opisujemy przy sprawach. ` : ""}
        {t?.alertRecallRefusals ? `Przy ${t.alertRecallRefusals.recalled} z ${t.alertRecallRefusals.refusals} odmów nasz silnik ostrzegłby przed porodem. ` : ""}
        {r.generatedAt ? `Stan na ${r.generatedAt.slice(0, 10)}.` : ""}
      </p>
    </section>
  );
}
