/**
 * "Co i kiedy" builder — pure: engine result + facts + plan + stored submissions → dated checklist.
 * Every `documents[]` and `deadlines[]` entry ends up in exactly one step (deadlines are merged into the
 * matching document step where one exists). Spec: docs/plan/05-phase-4-guidance.md §2.
 */
import { addDays } from "@/engine/dates";
import type { Alert, Citation, DocumentRequirement, ISODate, PlanBlock, Routing } from "@/engine/types";
import { alertText, documentName, fixHref, fixLabel, leaveShort } from "@/content/pl";
import { deadlineStep, documentStep, fill, syntheticStep, type StepCopy, type StepGroup, type StepWho } from "@/content/steps";
import { formatDateLong, formatMoney } from "@/lib/format";
import { blockPeriod, claimantBlocks, eventDate, isLoss, type FormSpec, type GuidanceInput } from "./forms";

export type { StepGroup, StepWho };
export type Channel = Routing["channel"][number];

export interface Step {
  id: string;
  group: StepGroup;
  date?: ISODate;
  /** "by" = deadline, "from" = something starts that day. */
  dateKind?: "by" | "from";
  hard: boolean;
  title: string;
  body?: string;
  who: StepWho;
  to?: "employer" | "zus" | "usc" | "you";
  channel?: Channel[];
  /** notNeeded = obtainable from a registry; done = a submission exists (or the benefit is already paid). */
  state: "todo" | "notNeeded" | "done";
  formHref?: string;
  formSlug?: string;
  /** Guide section on /kroki (#ubezpieczenie…). */
  anchor?: string;
  fix?: { href?: string; label: string };
  registrySource?: "rsc" | "zus-ezla";
  severity?: Alert["severity"];
  submissionId?: string;
  citations: Citation[];
  /** Engine entries this step represents (exactly-once check). */
  refs: { documents: string[]; deadlines: string[]; alerts: string[] };
}

export const GROUP_ORDER: StepGroup[] = ["now", "beforeBirth", "atBirth", "first21Days", "duringLeave", "afterLeave"];

const providedByWho: Record<DocumentRequirement["providedBy"], StepWho> = { claimant: "you", employer: "employer", otherParent: "otherParent", doctor: "doctor", court: "court", system: "system" };
const severityRank = { blocking: 0, high: 1, warning: 2, info: 3 } as const;

/** Application-type entries are placed by their date relative to the event (birth / taking into care). */
const DATE_GROUPED = new Set(["ZAM", "LEAVE_APP_MATERNITY", "LEAVE_APP_PARENTAL", "LEAVE_APP_PATERNITY", "LEAVE_APP_SUPPLEMENTARY", "RATE_OPTION_21_DAYS", "PARENTAL_APPLICATION", "PATERNITY_APPLICATION", "SUPPLEMENTARY_APPLICATION"]);

/** Alerts whose content is already a deadline or document step. */
function alertRepresented(a: Alert, docCodes: Set<string>, dlCodes: Set<string>): boolean {
  switch (a.fix?.action) {
    case "FILE_WITHIN_21_DAYS":
      return dlCodes.has("RATE_OPTION_21_DAYS");
    case "USE_PATERNITY_BEFORE":
      return dlCodes.has("PATERNITY_EXPIRY");
    case "ADD_OTHER_PARENT_STATEMENT":
      return [...docCodes].some((c) => c.startsWith("OTHER_PARENT_STATEMENT"));
    case "ADD_SINGLE_TITLE_STATEMENT":
      return docCodes.has("SINGLE_TITLE_STATEMENT");
    default:
      return false;
  }
}

function alertVals(a: Alert): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(a.values ?? {})) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = formatDateLong(v);
    else if (typeof v === "number" && /amount|threshold|base|gross|net/i.test(k)) out[k] = formatMoney(v);
    else out[k] = v;
  }
  if (a.deadline) out.deadline = formatDateLong(a.deadline);
  if (a.onDate) out.onDate = formatDateLong(a.onDate);
  return out;
}

export function buildSteps(input: GuidanceInput & { forms: FormSpec[] }): Step[] {
  const { facts, plan, result, forms } = input;
  if (!result) return [];
  const steps: Step[] = [];
  const E = eventDate(facts);
  const loss = isLoss(facts);
  const care = facts.event.kind !== "birth";
  const routing = result.routing;
  const docCodes = new Set(result.documents.map((x) => x.code));
  const dlCodes = new Set(result.deadlines.map((x) => x.code));
  const used = new Set<string>();
  const dlKey = (code: string, blockId?: string) => `${code}|${blockId ?? ""}`;
  const blocks = claimantBlocks(plan);
  const blockById = (id?: string) => (plan?.blocks ?? []).find((b) => b.id === id);
  const firstOf = (type: PlanBlock["type"]) => blocks.find((b) => b.type === type);
  const formFor = (pred: (f: FormSpec) => boolean) => forms.find(pred);
  const submitted = (slug?: string) => (slug ? input.submissions.filter((s) => s.kind === slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined);
  const paidMaternity = facts.claimant.paidBenefits.some((b) => b.type === "maternity" || b.type === "maternityOnAdoption");

  const groupByDate = (date: ISODate | undefined, fallback: StepGroup): StepGroup => {
    if (!date || !E) return fallback;
    if (date < E) return "beforeBirth";
    if (date <= addDays(E, 21)) return "first21Days";
    return fallback === "afterLeave" ? "afterLeave" : "duringLeave";
  };
  const channelFor = (who: StepWho, to?: string): Channel[] | undefined => {
    if (who !== "you" || !to || to === "you" || to === "usc") return undefined;
    if (to === routing.fileWith) return routing.channel;
    return to === "zus" ? ["pue", "paper"] : ["employerAny"];
  };
  const takeDeadline = (code: string, blockId?: string) => {
    const dl = result.deadlines.find((x) => x.code === code && (blockId === undefined || x.blockId === blockId) && !used.has(dlKey(x.code, x.blockId)));
    if (dl) used.add(dlKey(dl.code, dl.blockId));
    return dl;
  };

  // ── documents (LEAVE_APP_MATERNITY before ZAM so the 21-day deadline lands on the leave application) ──
  const order = (c: string) => (c === "LEAVE_APP_MATERNITY" ? 0 : c === "ZAM" ? 1 : 2);
  for (const doc of [...result.documents].sort((a, b) => order(a.code) - order(b.code))) {
    const mat = firstOf("maternity") ?? firstOf("maternityOnAdoption");
    const preBirth = doc.code === "LEAVE_APP_MATERNITY" && mat && facts.event.kind === "birth" && E && mat.from < E && !mat.takeover;
    let key = doc.code;
    if (doc.obtainableFromRegistry && documentStep[`${doc.code}:registry`]) key = `${doc.code}:registry`;
    else if (doc.code === "ZAM" && routing.fileWith === "zus") key = "ZAM:zus";
    else if (doc.code === "LEAVE_APP_MATERNITY" && care) key = "LEAVE_APP_MATERNITY:adoption";
    else if (preBirth) key = "LEAVE_APP_MATERNITY:preBirth";
    const copy: StepCopy = documentStep[key] ?? { title: documentName(doc.code), group: "duringLeave" };

    let dl;
    let block: PlanBlock | undefined;
    let formSlug: string | undefined;
    switch (doc.code) {
      case "LEAVE_APP_MATERNITY":
        block = mat;
        formSlug = formFor((f) => f.kind === "leave-maternity" || f.kind === "leave-adoption" || f.kind === "leave-takeover")?.slug;
        if (!preBirth) dl = takeDeadline("RATE_OPTION_21_DAYS");
        break;
      case "ZAM":
        formSlug = formFor((f) => f.kind === "zam")?.slug;
        dl = takeDeadline("RATE_OPTION_21_DAYS");
        break;
      case "LEAVE_APP_PARENTAL":
        block = firstOf("parental");
        formSlug = formFor((f) => f.kind === "leave-parental" && f.blockId === block?.id)?.slug;
        if (block) dl = takeDeadline("PARENTAL_APPLICATION", block.id);
        break;
      case "LEAVE_APP_PATERNITY":
        block = firstOf("paternity");
        formSlug = formFor((f) => f.kind === "leave-paternity" && f.blockId === block?.id)?.slug;
        if (block) dl = takeDeadline("PATERNITY_APPLICATION", block.id);
        break;
      case "LEAVE_APP_SUPPLEMENTARY":
        block = firstOf("supplementary");
        formSlug = formFor((f) => f.kind === "leave-supplementary")?.slug;
        dl = takeDeadline("SUPPLEMENTARY_APPLICATION");
        break;
      case "ZAS-53":
      case "ZAS-55":
        formSlug = formFor((f) => f.kind === doc.code.toLowerCase())?.slug;
        break;
      case "BIRTH_ACT":
        if (!doc.obtainableFromRegistry) formSlug = formFor((f) => f.kind === "usc-birth")?.slug;
        break;
    }

    const who: StepWho = copy.who ?? providedByWho[doc.providedBy];
    const to = who === "doctor" || who === "court" || (who === "otherParent" && doc.providedBy === "otherParent") ? "you" : doc.to;
    const sub = submitted(formSlug);
    const registry = Boolean(doc.obtainableFromRegistry);
    const date = dl?.date ?? doc.dueBy;
    const state: Step["state"] = registry ? "notNeeded" : sub ? "done" : paidMaternity && (doc.code === "LEAVE_APP_MATERNITY" || doc.code === "ZAM") ? "done" : "todo";
    steps.push({
      id: `doc:${doc.code}`,
      group: DATE_GROUPED.has(doc.code) ? groupByDate(date, copy.group) : copy.group,
      date,
      dateKind: date ? "by" : undefined,
      hard: Boolean(dl?.hard),
      title: copy.title,
      body: fill(copy.body ?? "", { from: block ? formatDateLong(blockPeriod(block, result).from) : undefined, forward: routing.payerForwardsWithinDays ?? 7 }) || undefined,
      who,
      to,
      channel: registry ? undefined : channelFor(who, to),
      state,
      formSlug,
      formHref: formSlug ? `/wnioski/${formSlug}` : undefined,
      anchor: doc.code.startsWith("CERT_") ? "zaswiadczenia" : doc.code === "Z-3" ? "pracodawca" : undefined,
      registrySource: registry ? (doc.code === "E-ZLA" ? "zus-ezla" : "rsc") : undefined,
      submissionId: sub?.id,
      citations: [...doc.citations, ...(dl?.citations ?? [])],
      refs: { documents: [doc.code], deadlines: dl ? [dlKey(dl.code, dl.blockId)] : [], alerts: [] },
    });
  }

  // ── deadlines not merged into a document ──
  for (const dl of result.deadlines) {
    const k = dlKey(dl.code, dl.blockId);
    if (used.has(k)) continue;
    used.add(k);
    const copy = deadlineStep[dl.code] ?? { title: dl.code, group: "duringLeave" as StepGroup };
    const block = blockById(dl.blockId);
    let formSlug: string | undefined;
    if (dl.code === "PARENTAL_APPLICATION") formSlug = formFor((f) => f.kind === "leave-parental" && f.blockId === dl.blockId)?.slug;
    if (dl.code === "PATERNITY_APPLICATION") formSlug = formFor((f) => f.kind === "leave-paternity" && f.blockId === dl.blockId)?.slug;
    if (dl.code === "RATE_OPTION_21_DAYS") formSlug = formFor((f) => f.kind === "zam" || f.kind === "leave-maternity")?.slug;
    const sub = submitted(formSlug);
    const vals = { date: formatDateLong(dl.date), from: block ? formatDateLong(blockPeriod(block, result).from) : undefined, leave: block ? leaveShort[block.type].toLowerCase() : "" };
    steps.push({
      id: `dl:${k}`,
      group: DATE_GROUPED.has(dl.code) ? groupByDate(dl.date, copy.group) : copy.group,
      date: dl.date,
      dateKind: "by",
      hard: dl.hard,
      title: fill(copy.title, vals),
      body: copy.body ? fill(copy.body, vals) : undefined,
      who: "you",
      to: dl.code === "PATERNITY_EXPIRY" || dl.code === "PARENTAL_HORIZON" ? undefined : (routing.fileWith as "employer" | "zus"),
      channel: dl.code === "PATERNITY_EXPIRY" || dl.code === "PARENTAL_HORIZON" ? undefined : routing.channel,
      state: sub ? "done" : "todo",
      formSlug,
      formHref: formSlug ? `/wnioski/${formSlug}` : undefined,
      submissionId: sub?.id,
      citations: dl.citations,
      refs: { documents: [], deadlines: [k], alerts: [] },
    });
  }

  // ── fixes from alerts ──
  for (const a of result.alerts) {
    if (!a.fix || alertRepresented(a, docCodes, dlCodes)) continue;
    const copy = alertText(a.code, alertVals(a));
    const href = fixHref[a.fix.action];
    const date = a.fix.byDate ?? a.deadline;
    steps.push({
      id: `alert:${a.code}`,
      group: a.code === "REREGISTER_AFTER_MATERNITY" ? "afterLeave" : "now",
      date,
      dateKind: date ? "by" : undefined,
      hard: a.severity === "blocking" || a.severity === "high",
      title: copy.title,
      body: copy.body,
      who: "you",
      state: "todo",
      fix: { href, label: fixLabel[a.fix.action] },
      anchor: href?.startsWith("/kroki#") ? href.slice(7) : undefined,
      formHref: href?.startsWith("/wnioski") ? href : undefined,
      severity: a.severity,
      citations: a.citations,
      refs: { documents: [], deadlines: [], alerts: [a.code] },
    });
  }

  // ── registration at USC (births) ──
  if (facts.event.kind === "birth") {
    const c = loss ? (input.registered ? syntheticStep.registerBirthLossDone : syntheticStep.registerBirthLoss) : input.registered ? syntheticStep.registerBirthDone : syntheticStep.registerBirth;
    const date = !input.registered && facts.event.date ? addDays(facts.event.date, 21) : undefined;
    steps.push({ id: "usc:register", group: "atBirth", date, dateKind: date ? "by" : undefined, hard: false, title: c.title, body: c.body, who: "you", to: "usc", state: input.registered ? "notNeeded" : "todo", registrySource: input.registered ? "rsc" : undefined, citations: [], refs: { documents: [], deadlines: [], alerts: [] } });
  }

  // ── return to work (employees) ──
  if (!loss && forms.some((f) => f.category === "leave")) {
    const ends = blocks.filter((b) => ["maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"].includes(b.type)).map((b) => blockPeriod(b, result).to).sort();
    const last = ends.at(-1);
    if (last && blocks.some((b) => b.type !== "paternity")) {
      steps.push({ id: "work:return", group: "afterLeave", date: addDays(last, 1), dateKind: "from", hard: false, title: syntheticStep.returnToWork.title, body: syntheticStep.returnToWork.body, who: "you", to: "employer", state: "todo", citations: [], refs: { documents: [], deadlines: [], alerts: [] } });
    }
  }

  return sortSteps(steps);
}

export function sortSteps(steps: Step[]): Step[] {
  const rank = (s: Step) => (s.state === "notNeeded" ? 2 : s.who === "employer" || s.who === "system" ? 1 : 0);
  return [...steps].sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (g) return g;
    if (a.group === "now") {
      const s = severityRank[a.severity ?? "info"] - severityRank[b.severity ?? "info"];
      if (s) return s;
    }
    const r = rank(a) - rank(b);
    if (r) return r;
    return (a.date ?? "9999").localeCompare(b.date ?? "9999");
  });
}

export function groupSteps(steps: Step[]): { group: StepGroup; steps: Step[] }[] {
  return GROUP_ORDER.map((group) => ({ group, steps: steps.filter((s) => s.group === group) })).filter((g) => g.steps.length);
}
