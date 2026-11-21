/** Pure helpers for the planner (client + tests). Dates are ISO day strings; no time zones. */
import type { LeaveType, Plan, PlanBlock, PoolState, Result } from "@/engine/types";

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export const endOf = (b: Pick<PlanBlock, "from" | "days">) => addDays(b.from, b.days - 1);

const order: Record<string, number> = { maternity: 0, maternityOnAdoption: 0, supplementary: 1, parental: 2, paternity: 3 };

/** Leave types the parent plans. Pregnancy-time benefits (sick pay, sickness, Art. 30) come from facts and are read-only. */
export const LEAVE_TYPES = new Set<LeaveType>(["maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"]);
export const isLeave = (b: Pick<PlanBlock, "type">) => LEAVE_TYPES.has(b.type);

/** Leave blocks of one parent in chronological order. */
export function laneOf(plan: Plan, parent: PlanBlock["parent"]) {
  return plan.blocks.filter((b) => b.parent === parent && isLeave(b)).sort((a, b) => a.from.localeCompare(b.from) || (order[a.type] ?? 9) - (order[b.type] ?? 9));
}

export interface Chain {
  order: string[];
  linked: Record<string, boolean>;
}

/**
 * The family sequence: leave blocks of both parents (paternity excluded — it runs alongside),
 * in date order. A block is linked when it starts the day after its predecessor; linked blocks
 * move when an earlier block changes length. Presets and defaultPlan produce fully linked chains;
 * blocks used at the same time as another (or after a gap) start unlinked.
 */
export function initChain(plan: Plan): Chain {
  const seq = plan.blocks.filter((b) => isLeave(b) && b.type !== "paternity").sort((a, b) => a.from.localeCompare(b.from) || (order[a.type] ?? 9) - (order[b.type] ?? 9));
  const linked: Record<string, boolean> = {};
  seq.forEach((b, i) => {
    if (i > 0) linked[b.id] = b.from === addDays(seq[i - 1].from, seq[i - 1].days);
  });
  return { order: seq.map((b) => b.id), linked };
}

export function reflow(plan: Plan, chain: Chain): Plan {
  const byId = new Map(plan.blocks.map((b) => [b.id, { ...b }]));
  const ids = chain.order.filter((id) => byId.has(id));
  for (let i = 1; i < ids.length; i++) {
    if (chain.linked[ids[i]] === false) continue;
    const prev = byId.get(ids[i - 1])!;
    byId.get(ids[i])!.from = addDays(prev.from, prev.days);
  }
  return { ...plan, blocks: plan.blocks.map((b) => byId.get(b.id)!) };
}

export function newId(plan: Plan, type: LeaveType, parent: PlanBlock["parent"]) {
  let i = 1;
  while (plan.blocks.some((b) => b.id === `${type}-${parent}-${i}`)) i++;
  return `${type}-${parent}-${i}`;
}

export interface PresetContext {
  anchor: string;
  motherSide: "claimant" | "other" | null; // who is the mother in this plan
  fatherSide: "claimant" | "other" | null;
  pools: PoolState;
  adoption: boolean;
  rateOption: Plan["rateOption"];
  titleId?: string;
}

export type PresetId = "allMother" | "equal" | "fatherNine" | "partTime";

export const presetLabel: Record<PresetId, { title: string; hint: string }> = {
  allMother: { title: "Mama bierze wszystko", hint: "Tata: 14 dni urlopu ojcowskiego" },
  equal: { title: "Dzielimy po równo", hint: "Po 14 tygodniach mama przekazuje urlop tacie" },
  fatherNine: { title: "Tata bierze 9 tygodni", hint: "Jego część rodzicielskiego, której nie można przekazać" },
  partTime: { title: "Łączę urlop z pracą na pół etatu", hint: "Urlop rodzicielski wydłuża się dwukrotnie" },
};

/** Builds a complete plan from the statutory pools. Returns null when a preset does not apply. */
export function buildPreset(id: PresetId, c: PresetContext): Plan | null {
  const mom = c.motherSide ?? "claimant";
  const dad = c.fatherSide;
  const matType: LeaveType = c.adoption ? "maternityOnAdoption" : "maternity";
  const mat = c.pools.maternityDays.total;
  const sup = c.pools.supplementaryDays.total;
  const par = c.pools.parentalDays.total;
  const reserved = c.pools.parentalDays.reservedPerParent;
  const blocks: PlanBlock[] = [];
  let cursor = c.anchor;
  const push = (b: Omit<PlanBlock, "id" | "from"> & { from?: string }) => {
    const block: PlanBlock = { id: `${b.type}-${b.parent}-${blocks.filter((x) => x.type === b.type && x.parent === b.parent).length + 1}`, from: b.from ?? cursor, ...b, titleId: c.titleId && b.parent === "claimant" ? c.titleId : b.titleId };
    blocks.push(block);
    if (b.type !== "paternity") cursor = addDays(block.from, block.days);
    return block;
  };
  const needsDad = id === "equal" || id === "fatherNine";
  if (needsDad && !dad) return null;
  if (id === "equal") {
    const momMat = Math.min(mat, c.pools.maternityDays.motherMandatory || 98);
    push({ parent: mom, type: matType, days: momMat });
    if (mat > momMat) push({ parent: dad!, type: matType, days: mat - momMat, takeover: "afterResignation" });
    if (sup) push({ parent: mom, type: "supplementary", days: sup });
    const shared = par - 2 * reserved;
    const half = Math.floor(shared / 2 / 7) * 7;
    push({ parent: dad!, type: "parental", days: reserved + (shared - half), pool: "ownNineWeeks" });
    push({ parent: mom, type: "parental", days: reserved + half, pool: "ownNineWeeks" });
  } else {
    push({ parent: mom, type: matType, days: mat });
    if (sup) push({ parent: mom, type: "supplementary", days: sup });
    // The other parent's reserved weeks never pass to the mother (KP art. 182¹a §3), with or without a second lane.
    const momPar = par - reserved;
    // Combined with half-time work a block lasts twice as long in calendar days but uses the same pool days.
    push({ parent: mom, type: "parental", days: id === "partTime" ? momPar * 2 : momPar, pool: "shared", ...(id === "partTime" ? { workFraction: { num: 1, den: 2 } } : {}) });
    if (dad && id === "fatherNine") push({ parent: dad, type: "parental", days: reserved, pool: "ownNineWeeks" });
  }
  if (dad && !c.adoption) push({ parent: dad, type: "paternity", days: 14, from: c.anchor });
  return { rateOption: c.rateOption, blocks };
}

export interface CashRow {
  month: string;
  claimant: { gross: number; pit: number; net: number; topUp: number };
  other: { gross: number; pit: number; net: number; topUp: number };
}

export function cashFlow(result: Result): CashRow[] {
  const rows = new Map<string, CashRow>();
  const zero = () => ({ gross: 0, pit: 0, net: 0, topUp: 0 });
  for (const p of result.periods) {
    if (p.status === "refused") continue;
    for (const m of p.months) {
      const row = rows.get(m.month) ?? { month: m.month, claimant: zero(), other: zero() };
      const t = row[p.parent];
      t.gross += m.gross;
      t.pit += m.pitAdvance;
      t.net += m.net;
      t.topUp += m.topUp;
      rows.set(m.month, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
export const MONTHS_FULL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_FULL[m - 1]} ${y}`;
};
