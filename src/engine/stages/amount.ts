/**
 * Amount stage (digest 02 §3.4, R-AMT-MIN).
 * daily = round½up(base × rate × (1 − work) / 30); gross = daily × days, split per calendar month; PIT advance 12%
 * rounded to full złoty; net = gross − PIT. Minimum benefit (UZ 31 ust. 3a–3c): when the monthly net of the
 * maternity benefit is below the świadczenie rodzicielskie (1 000 zł) and the single-title statement is present,
 * it is topped up to that amount, prorated for partial months (`minimumBenefit.proration`).
 */
import { C } from "../cite";
import { addTrace, MATERNITY_TYPES, type Ctx } from "../context";
import { daysInYearMonth, splitByMonth } from "../dates";
import { dailyBenefit, divRoundHalfUp, pitAdvance } from "../money";
import type { Grosze, YearMonth } from "../types";

/** The prorated monthly floor for `days` benefit days in a month. */
export function proratedFloor(ctx: Ctx, month: YearMonth, days: number): Grosze {
  const mb = ctx.params.minimumBenefit;
  if (mb.proration === "thirtieths") return divRoundHalfUp(mb.netMonthly * Math.min(days, 30), 30);
  return divRoundHalfUp(mb.netMonthly * days, daysInYearMonth(month));
}

/** Months in which the claimant's maternity-type net falls below the prorated floor: { month → shortfall }. */
export function topUpShortfalls(ctx: Ctx): Map<YearMonth, Grosze> {
  const byMonth = new Map<YearMonth, { days: number; net: Grosze }>();
  for (const s of ctx.segments) {
    if (s.parent !== "claimant" || s.status === "refused" || !MATERNITY_TYPES.has(s.type)) continue;
    for (const m of s.months) {
      const cur = byMonth.get(m.month) ?? { days: 0, net: 0 };
      byMonth.set(m.month, { days: cur.days + m.days, net: cur.net + m.net });
    }
  }
  const out = new Map<YearMonth, Grosze>();
  for (const [month, v] of [...byMonth.entries()].sort()) {
    const floor = proratedFloor(ctx, month, Math.min(v.days, daysInYearMonth(month)));
    if (v.net < floor) out.set(month, floor - v.net);
  }
  return out;
}

export function run(ctx: Ctx): Ctx {
  const t = ctx.params.tax;
  for (const s of ctx.segments) {
    s.daily = dailyBenefit(s.base, s.rateBps, s.workReductionBps ?? 0, ctx.params.base.monthDays);
    if (s.status === "refused") {
      s.gross = 0;
      s.months = [];
    } else {
      s.months = splitByMonth(s.from, s.to).map((m) => {
        const gross = s.daily * m.days;
        const pit = pitAdvance(gross, t.pitAdvanceBps, t.roundToFullZloty);
        return { month: m.month, days: m.days, gross, pitAdvance: pit, net: gross - pit, topUp: 0 };
      });
      s.gross = s.daily * s.days;
    }
    addTrace(ctx, "amount", "R-AMT-DAILY", {
      factPaths: [`plan.blocks[${s.blockIndex}]`],
      paramKeys: ["base.monthDays", "tax.pitAdvanceBps", "tax.roundToFullZloty"],
      inputs: { blockId: s.block.id, segment: s.key, base: s.base, rateBps: s.rateBps, workReductionBps: s.workReductionBps ?? 0, days: s.days },
      output: { daily: s.daily, gross: s.gross, status: s.status },
      citations: C.baseDaily,
    });
  }

  // Minimum benefit top-up (only with the single-title statement; otherwise an alert asks for it).
  const shortfalls = topUpShortfalls(ctx);
  if (shortfalls.size > 0 && ctx.plan.singleTitleStatement) {
    for (const [month, short] of shortfalls) {
      const target = [...ctx.segments].reverse().find((s) => s.parent === "claimant" && s.status !== "refused" && MATERNITY_TYPES.has(s.type) && s.months.some((m) => m.month === month));
      const entry = target?.months.find((m) => m.month === month);
      if (entry) entry.topUp = short;
    }
    addTrace(ctx, "amount", "R-AMT-MIN", {
      factPaths: ["plan.singleTitleStatement"],
      paramKeys: ["minimumBenefit.netMonthly", "minimumBenefit.proration"],
      inputs: { months: [...shortfalls.keys()] },
      output: { topUpTotal: [...shortfalls.values()].reduce((a, b) => a + b, 0) },
      citations: C.topUp,
    });
  }
  return ctx;
}
