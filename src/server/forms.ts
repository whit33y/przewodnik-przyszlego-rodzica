/**
 * Forms catalogue and pre-filled documents for /wnioski — pure (no I/O, no clock), unit-tested.
 * Leave applications follow the content the RW regulation requires (Dz.U. 2025 poz. 322);
 * ZAM / ZAS-53 / ZAS-55 are "dane do wniosku" sheets, not replicas. Spec: docs/plan/05-phase-4-guidance.md §3.
 */
import { addDays, diffDays } from "@/engine/dates";
import type { Facts, ISODate, PlanBlock, Plan, Result } from "@/engine/types";
import { leaveShort } from "@/content/pl";
import {
  attachmentText,
  endReasonText,
  formsText,
  leaveCopy,
  leaveGenitive,
  pueCopy,
  sheetCopy,
  sheetRow,
  statementText,
  uscCopy,
  type FormKind,
} from "@/content/forms";
import { fill } from "@/content/steps";
import { formatDateShort, formatDuration } from "@/lib/format";

export type { FormKind };
export type SourceRef = "plan" | "mobywatel" | "rsc" | "ezdrowie" | "zus-konto" | "zus-ezla" | "zus-swiadczenia" | "user" | "sprawa";

export interface SubmissionLike {
  id: string;
  kind: string;
  createdAt: string;
}

/** Everything the guidance builders need — assembled once per request by src/server/guidance.ts. */
export interface GuidanceInput {
  facts: Facts;
  plan: Plan | null;
  result: Result | null;
  submissions: SubmissionLike[];
  /** Birth (or care event) is in the civil-status registry. */
  registered: boolean;
  displayName?: string;
  /** Evaluation date ("today"). */
  today: ISODate;
  /** facts path → source, from the assembler. */
  sources?: Record<string, SourceRef>;
}

export interface FormSpec {
  slug: string;
  kind: FormKind;
  category: "leave" | "benefit" | "other";
  title: string;
  short: string;
  about: string;
  recipient: "employer" | "zus" | "usc";
  blockId?: string;
  /** n-th block of this type for the claimant (1-based). */
  part?: number;
  status: "todo" | "sent";
  lastSubmission?: SubmissionLike;
  disabledReason?: string;
}

// ───────── shared helpers ─────────

export function eventDate(f: Facts): ISODate | undefined {
  return f.event.kind === "birth" ? (f.event.date ?? f.event.expectedDate) : f.event.takenIntoCareOn;
}

export function eventOccurred(f: Facts): boolean {
  return f.event.kind === "birth" ? Boolean(f.event.date || f.event.occurred) : true;
}

export function isLoss(f: Facts): boolean {
  return f.event.kind === "birth" && f.event.children.length > 0 && f.event.children.every((c) => c.bornAlive === false || Boolean(c.deathDate));
}

export function claimantBlocks(plan: Plan | null): PlanBlock[] {
  return (plan?.blocks ?? []).filter((b) => b.parent === "claimant").sort((a, b) => a.from.localeCompare(b.from));
}

export function blockPeriod(b: PlanBlock, result: Result | null): { from: ISODate; to: ISODate; days: number } {
  const periods = result?.periods.filter((p) => p.blockId === b.id) ?? [];
  if (periods.length) {
    const from = periods.map((p) => p.from).sort()[0];
    const to = periods.map((p) => p.to).sort().at(-1)!;
    return { from, to, days: diffDays(from, to) + 1 };
  }
  return { from: b.from, to: addDays(b.from, b.days - 1), days: b.days };
}

const LEAVE_TYPES = new Set(["maternity", "maternityOnAdoption", "supplementary", "parental", "paternity"]);

function hasDoc(result: Result | null, code: string) {
  return Boolean(result?.documents.some((d) => d.code === code));
}

function slugFor(base: string, n: number, total: number) {
  return total > 1 && n > 1 ? `${base}-${n}` : base;
}

function latest(subs: SubmissionLike[], slug: string) {
  return subs.filter((s) => s.kind === slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ───────── catalogue ─────────

/** Forms this person needs, with recipient from routing and status from stored submissions. */
export function requiredForms(input: GuidanceInput): FormSpec[] {
  const { facts, plan, result, submissions } = input;
  const out: Omit<FormSpec, "status" | "lastSubmission">[] = [];
  const blocks = claimantBlocks(plan).filter((b) => LEAVE_TYPES.has(b.type));
  const leave = (kind: keyof typeof leaveCopy, b: PlanBlock | undefined, n = 1, total = 1) => {
    const c = leaveCopy[kind];
    out.push({ slug: slugFor(c.slug, n, total), kind, category: "leave", title: total > 1 ? `${c.title} — część ${n}` : c.title, short: total > 1 ? `${c.short} — część ${n}` : c.short, about: c.about, recipient: "employer", blockId: b?.id, part: n });
  };

  if (hasDoc(result, "LEAVE_APP_MATERNITY")) {
    const mat = blocks.find((b) => b.type === "maternity" || b.type === "maternityOnAdoption");
    if (mat) leave(mat.takeover ? "leave-takeover" : mat.type === "maternityOnAdoption" ? "leave-adoption" : "leave-maternity", mat);
  }
  if (hasDoc(result, "LEAVE_APP_SUPPLEMENTARY")) {
    const sup = blocks.find((b) => b.type === "supplementary");
    if (sup) leave("leave-supplementary", sup);
  }
  if (hasDoc(result, "LEAVE_APP_PARENTAL")) {
    const par = blocks.filter((b) => b.type === "parental");
    par.forEach((b, i) => leave("leave-parental", b, i + 1, par.length));
    const work = par.filter((b) => b.workFraction && b.workFraction.num > 0);
    work.forEach((b, i) => leave("leave-parental-work", b, i + 1, work.length));
  }
  if (hasDoc(result, "LEAVE_APP_PATERNITY")) {
    const pat = blocks.filter((b) => b.type === "paternity");
    pat.forEach((b, i) => leave("leave-paternity", b, i + 1, pat.length));
  }
  const resigned = (plan?.blocks ?? []).find((b) => b.parent === "other" && b.takeover === "afterResignation");
  if (resigned && facts.claimant.role === "mother" && blocks.some((b) => b.type === "maternity")) leave("leave-resignation", resigned);

  const fileWith = result?.routing.fileWith ?? "zus";
  if (hasDoc(result, "ZAM")) out.push({ slug: sheetCopy.zam.slug, kind: "zam", category: "benefit", title: sheetCopy.zam.title, short: sheetCopy.zam.short, about: sheetCopy.zam.about, recipient: fileWith });
  if (hasDoc(result, "ZAS-55")) out.push({ slug: sheetCopy["zas-55"].slug, kind: "zas-55", category: "benefit", title: sheetCopy["zas-55"].title, short: sheetCopy["zas-55"].short, about: sheetCopy["zas-55"].about, recipient: "zus" });
  if (hasDoc(result, "ZAS-53")) out.push({ slug: sheetCopy["zas-53"].slug, kind: "zas-53", category: "benefit", title: sheetCopy["zas-53"].title, short: sheetCopy["zas-53"].short, about: sheetCopy["zas-53"].about, recipient: "zus" });

  if (facts.event.kind === "birth" && !isLoss(facts)) {
    out.push({ slug: uscCopy.slug, kind: "usc-birth", category: "other", title: uscCopy.title, short: uscCopy.short, about: uscCopy.about, recipient: "usc", disabledReason: input.registered ? undefined : uscCopy.disabled });
  }
  out.push({ slug: pueCopy.slug, kind: "pue-question", category: "other", title: pueCopy.title, short: pueCopy.short, about: pueCopy.about, recipient: "zus" });

  return out.map((f) => {
    const last = latest(submissions, f.kind === "pue-question" ? "pue-query" : f.slug);
    return { ...f, status: last ? "sent" : "todo", lastSubmission: last };
  });
}

export function findForm(forms: FormSpec[], slug: string): FormSpec | undefined {
  return forms.find((f) => f.slug === slug);
}

// ───────── leave applications ─────────

export interface DocField {
  id: string;
  label: string;
  value?: string;
  source?: SourceRef;
  /** Rendered as an input the user can fill or correct. */
  editable?: boolean;
}

export interface DocStatement {
  id: string;
  text: string;
  checked: boolean;
}

export interface DocAttachment {
  text: string;
  note?: string;
}

export interface LeaveDoc {
  slug: string;
  kind: FormKind;
  heading: string;
  legal: string;
  applicant: { name?: string; source?: SourceRef };
  today: ISODate;
  request: string[];
  fields: DocField[];
  statements: DocStatement[];
  attachments: DocAttachment[];
}

const d = formatDateShort;
const range = (p: { from: ISODate; to: ISODate }) => `od ${d(p.from)} do ${d(p.to)}`;

function birthActAttachment(input: GuidanceInput): DocAttachment {
  const doc = input.result?.documents.find((x) => x.code === "BIRTH_ACT");
  if (doc?.obtainableFromRegistry) return { text: attachmentText.birthAct, note: attachmentText.birthActRegistry };
  if (!eventOccurred(input.facts)) return { text: attachmentText.birthAct, note: "dołączysz po rejestracji urodzenia" };
  return { text: attachmentText.birthAct };
}

function careAttachments(f: Facts): DocAttachment[] {
  if (f.event.kind === "adoption") return [{ text: attachmentText.courtPetition }];
  if (f.event.kind === "foster") return [{ text: attachmentText.fosterOrder }];
  return [];
}

function src(input: GuidanceInput, path: string): SourceRef | undefined {
  return input.sources?.[path];
}

function otherParentalOverlap(input: GuidanceInput, p: { from: ISODate; to: ISODate }) {
  return (input.plan?.blocks ?? [])
    .filter((b) => b.parent === "other" && b.type === "parental")
    .map((b) => blockPeriod(b, input.result))
    .filter((o) => o.from <= p.to && o.to >= p.from);
}

function parentalPartNumber(input: GuidanceInput, b: PlanBlock) {
  const used = input.facts.claimant.paidBenefits.filter((x) => x.type === "parental").length + (input.facts.otherParent?.used.filter((x) => x.type === "parental").length ?? 0);
  const all = (input.plan?.blocks ?? []).filter((x) => x.type === "parental").sort((a, c) => a.from.localeCompare(c.from));
  return used + all.findIndex((x) => x.id === b.id) + 1;
}

function jointParental(input: GuidanceInput, endOfMaternity: ISODate) {
  const blocks = claimantBlocks(input.plan);
  const sup = blocks.find((b) => b.type === "supplementary");
  const after = sup ? blockPeriod(sup, input.result).to : endOfMaternity;
  const par = blocks.find((b) => b.type === "parental");
  if (!par) return null;
  const p = blockPeriod(par, input.result);
  return diffDays(after, p.from) === 1 ? p : null;
}

export function buildLeaveDoc(spec: FormSpec, input: GuidanceInput): LeaveDoc | null {
  if (spec.category !== "leave") return null;
  const { facts, plan, result } = input;
  const c = leaveCopy[spec.kind as keyof typeof leaveCopy];
  const block = (plan?.blocks ?? []).find((b) => b.id === spec.blockId);
  if (!block) return null;
  const p = blockPeriod(block, result);
  const dur = formatDuration(p.days);
  const ev = facts.event;
  const doc: LeaveDoc = { slug: spec.slug, kind: spec.kind, heading: c.heading, legal: c.legal, applicant: { name: input.displayName, source: input.displayName ? "mobywatel" : undefined }, today: input.today, request: [], fields: [], statements: [], attachments: [] };
  const period: DocField = { id: "period", label: "Okres urlopu", value: `${range(p)} (${dur})`, source: "plan" };
  const loss = isLoss(facts);

  switch (spec.kind) {
    case "leave-maternity": {
      const birth = ev.kind === "birth" ? ev : undefined;
      const born = birth?.date;
      const due = birth?.expectedDate;
      const preBirth = Boolean((born ?? due) && p.from < (born ?? due)!);
      if (preBirth) {
        doc.request.push(`Proszę o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu, od dnia ${d(p.from)}.`);
        doc.request.push(`Pozostałą część urlopu proszę udzielić bezpośrednio po porodzie — łącznie ${dur}.`);
      } else if (!born && due) {
        doc.request.push(`Proszę o udzielenie urlopu macierzyńskiego od dnia porodu w wymiarze ${dur}. Przewidywana data porodu to ${d(due)} — według niej urlop potrwa do ${d(p.to)}.`);
      } else {
        doc.request.push(`Proszę o udzielenie urlopu macierzyńskiego w okresie ${range(p)} (${dur}).`);
      }
      doc.fields.push(period);
      if (born) doc.fields.push({ id: "birthDate", label: "Data porodu", value: d(born), source: src(input, "facts.event.date") });
      else if (due) doc.fields.push({ id: "dueDate", label: "Przewidywana data porodu", value: d(due), source: src(input, "facts.event.expectedDate") });
      if (birth && birth.children.length > 1) doc.fields.push({ id: "children", label: "Liczba dzieci urodzonych przy jednym porodzie", value: String(birth.children.length), source: src(input, "facts.event.children") ?? "plan" });
      if (!loss) {
        const joint = jointParental(input, p.to);
        if (joint) {
          doc.statements.push({ id: "jointParental", text: fill(statementText.jointParental, { from: d(joint.from), to: d(joint.to), duration: formatDuration(joint.days) }), checked: true });
          if (plan?.rateOption === "averaged81_5") doc.statements.push({ id: "rate815", text: statementText.rate815, checked: true });
        }
      }
      if (preBirth || (!born && due)) doc.attachments.push({ text: attachmentText.dueDateCert });
      if (loss) doc.attachments.push({ text: attachmentText.stillbirthCert });
      else doc.attachments.push(birthActAttachment(input));
      break;
    }
    case "leave-adoption": {
      doc.request.push(`Proszę o udzielenie urlopu na warunkach urlopu macierzyńskiego w okresie ${range(p)} (${dur}).`);
      doc.fields.push(period);
      if (ev.kind !== "birth") {
        doc.fields.push({ id: "childName", label: "Imię i nazwisko dziecka", editable: true });
        const born = ev.children[0]?.birthDate;
        if (born) doc.fields.push({ id: "childBirth", label: "Data urodzenia dziecka", value: d(born), source: src(input, "facts.event.children") ?? "rsc" });
        doc.fields.push({ id: "takenIntoCare", label: "Data przyjęcia dziecka na wychowanie", value: d(ev.takenIntoCareOn), source: src(input, "facts.event.takenIntoCareOn") });
        doc.statements.push({ id: "takenIntoCare", text: fill(statementText.takenIntoCare, { date: d(ev.takenIntoCareOn) }), checked: true });
      }
      const joint = jointParental(input, p.to);
      if (joint) {
        doc.statements.push({ id: "jointParental", text: fill(statementText.jointParental, { from: d(joint.from), to: d(joint.to), duration: formatDuration(joint.days) }), checked: true });
        if (plan?.rateOption === "averaged81_5") doc.statements.push({ id: "rate815", text: statementText.rate815, checked: true });
      }
      doc.attachments.push(...careAttachments(facts));
      break;
    }
    case "leave-parental": {
      doc.request.push(`Proszę o udzielenie urlopu rodzicielskiego w okresie ${range(p)} (${dur}).`);
      doc.fields.push(period);
      doc.fields.push({ id: "part", label: "Część urlopu", value: `${parentalPartNumber(input, block)}. część (najwyżej 5 części łącznie dla obojga rodziców)`, source: "plan" });
      const before = claimantBlocks(plan).filter((b) => b.type === "parental" && b.from < block.from).map((b) => blockPeriod(b, result));
      const paid = facts.claimant.paidBenefits.filter((x) => x.type === "parental");
      const usedDays = before.reduce((s, x) => s + x.days, 0) + paid.reduce((s, x) => s + diffDays(x.from, x.to) + 1, 0);
      const usedParts = before.length + paid.length;
      doc.fields.push({ id: "used", label: "Dotychczas wykorzystany urlop rodzicielski", value: usedParts ? `${formatDuration(usedDays)} w ${usedParts} ${usedParts === 1 ? "części" : "częściach"}` : "nie wykorzystano", source: "plan" });
      if (block.workFraction && block.workFraction.num > 0) doc.fields.push({ id: "work", label: "Praca w czasie urlopu", value: `${block.workFraction.num}/${block.workFraction.den} etatu — osobny wniosek o łączenie urlopu z pracą`, source: "plan" });
      if (block.pool === "ownNineWeeks") doc.statements.push({ id: "ownNine", text: statementText.ownNineWeeks, checked: true });
      const overlap = otherParentalOverlap(input, p);
      doc.statements.push(
        overlap.length
          ? { id: "otherParent", text: fill(statementText.otherParentalIn, { periods: overlap.map(range).join(", ") }), checked: true }
          : { id: "otherParent", text: statementText.otherNoParental, checked: true },
      );
      if (ev.kind === "birth") doc.attachments.push(birthActAttachment(input));
      else doc.attachments.push(...careAttachments(facts));
      if (ev.children.some((ch) => ch.zaZyciem)) doc.attachments.push({ text: attachmentText.zaZyciem });
      break;
    }
    case "leave-parental-work": {
      const f = block.workFraction!;
      const ext = result?.periods.filter((x) => x.blockId === block.id).reduce((s, x) => s + (x.extensionDays ?? 0), 0) ?? 0;
      doc.request.push(`Proszę o umożliwienie łączenia korzystania z urlopu rodzicielskiego z wykonywaniem pracy u Pracodawcy w wymiarze ${f.num}/${f.den} etatu, w okresie ${range(p)}.`);
      doc.fields.push({ id: "workTime", label: "Wymiar czasu pracy", value: `${f.num}/${f.den} etatu`, source: "plan" });
      doc.fields.push({ id: "period", label: "Okres łączenia urlopu z pracą", value: range(p), source: "plan" });
      if (ext > 0) doc.fields.push({ id: "extension", label: "Wydłużenie urlopu z powodu pracy", value: formatDuration(ext), source: "plan" });
      doc.statements.push({ id: "extWork", text: fill(statementText.extensionWork, { extension: ext > 0 ? formatDuration(ext) : "—" }), checked: false });
      doc.statements.push({ id: "extNoWork", text: statementText.extensionNoWork, checked: false });
      break;
    }
    case "leave-paternity": {
      doc.request.push(`Proszę o udzielenie urlopu ojcowskiego w okresie ${range(p)} (${dur}).`);
      doc.fields.push(period);
      doc.fields.push({ id: "part", label: "Część urlopu", value: `${spec.part ?? 1}. część (najwyżej 2 części)`, source: "plan" });
      const earlier = [
        ...facts.claimant.paidBenefits.filter((x) => x.type === "paternity").map((x) => ({ from: x.from, to: x.to })),
        ...claimantBlocks(plan).filter((b) => b.type === "paternity" && b.from < block.from).map((b) => blockPeriod(b, result)),
      ];
      doc.statements.push(earlier.length ? { id: "paternityUsed", text: fill(statementText.paternityUsed, { periods: earlier.map(range).join(", ") }), checked: true } : { id: "paternityUsed", text: statementText.paternityNotUsed, checked: true });
      doc.attachments.push(ev.kind === "adoption" ? { text: attachmentText.adoptionOrder } : birthActAttachment(input));
      break;
    }
    case "leave-supplementary": {
      const mat = claimantBlocks(plan).find((b) => b.type === "maternity");
      doc.request.push(`Proszę o udzielenie uzupełniającego urlopu macierzyńskiego w okresie ${range(p)} (${dur}).`);
      if (mat) doc.fields.push({ id: "maternityEnd", label: "Termin zakończenia urlopu macierzyńskiego", value: d(blockPeriod(mat, result).to), source: "plan" });
      doc.fields.push(period);
      const otherSup = (plan?.blocks ?? []).some((b) => b.parent === "other" && b.type === "supplementary");
      if (!otherSup) doc.statements.push({ id: "otherNoSup", text: statementText.otherNoSupplementary, checked: true });
      doc.attachments.push({ text: attachmentText.hospitalCert });
      break;
    }
    case "leave-resignation": {
      doc.request.push(`Rezygnuję z pozostałej części urlopu macierzyńskiego. Wrócę do pracy od dnia ${d(p.from)}.`);
      doc.fields.push({ id: "return", label: "Termin powrotu do pracy", value: d(p.from), source: "plan" });
      doc.attachments.push({ text: attachmentText.fatherApplication });
      break;
    }
    case "leave-takeover": {
      doc.request.push(`Proszę o udzielenie pozostałej części urlopu macierzyńskiego w okresie ${range(p)} (${dur}).`);
      doc.fields.push(period);
      doc.fields.push({ id: "childName", label: "Imię i nazwisko dziecka", editable: true });
      if (ev.kind === "birth" && ev.date) doc.fields.push({ id: "childBirth", label: "Data urodzenia dziecka", value: d(ev.date), source: src(input, "facts.event.date") });
      doc.fields.push({ id: "motherPreBirth", label: "Urlop macierzyński matki wykorzystany przed porodem", editable: true });
      doc.statements.push({ id: "notify", text: statementText.takeoverNotify, checked: false });
      doc.attachments.push(birthActAttachment(input), { text: attachmentText.motherStatement });
      break;
    }
    default:
      return null;
  }
  return doc;
}

// ───────── "dane do wniosku" sheets ─────────

export interface SheetRow {
  id: string;
  label: string;
  value?: string;
  note?: string;
  source?: SourceRef;
}

export interface DataSheet {
  slug: string;
  kind: FormKind;
  title: string;
  intro: string;
  rows: SheetRow[];
  link: { href: string; label: string };
  recipient: "employer" | "zus";
}

function rateRow(input: GuidanceInput): SheetRow {
  if (isLoss(input.facts)) return { id: "rate", label: sheetRow.rate, value: sheetRow.rate100, source: "plan" };
  return { id: "rate", label: sheetRow.rate, value: input.plan?.rateOption === "averaged81_5" ? sheetRow.rate815 : sheetRow.rateSplit, source: "plan" };
}

function bankRow(): SheetRow {
  return { id: "bank", label: sheetRow.bank, note: sheetRow.bankNote };
}

export function buildSheet(spec: FormSpec, input: GuidanceInput): DataSheet | null {
  const { facts, result } = input;
  const ev = facts.event;
  if (spec.kind === "zam") {
    const c = sheetCopy.zam;
    const rows: SheetRow[] = [];
    const periods = claimantBlocks(input.plan).filter((b) => LEAVE_TYPES.has(b.type));
    rows.push({ id: "type", label: sheetRow.benefitType, value: `Zasiłek macierzyński za okres ${[...new Set(periods.map((b) => leaveGenitive[b.type] ?? leaveShort[b.type]))].join(", ")}`, source: "plan" });
    periods.forEach((b, i) => {
      const p = blockPeriod(b, result);
      rows.push({ id: `period-${i + 1}`, label: fill(sheetRow.period, { leave: leaveShort[b.type].toLowerCase() }), value: range(p), source: "plan" });
    });
    rows.push(rateRow(input));
    if (ev.kind === "birth") {
      if (ev.date) rows.push({ id: "childBirth", label: sheetRow.childBirth, value: d(ev.date), source: input.sources?.["facts.event.date"] });
      else if (ev.expectedDate) rows.push({ id: "childExpected", label: sheetRow.childExpected, value: d(ev.expectedDate), note: sheetRow.childExpectedNote, source: input.sources?.["facts.event.expectedDate"] });
      rows.push({ id: "children", label: sheetRow.childrenCount, value: String(Math.max(1, ev.children.length)), source: input.sources?.["facts.event.children"] ?? "plan" });
      if (!isLoss(facts)) rows.push({ id: "pesel", label: sheetRow.childPesel, note: input.registered ? sheetRow.childPeselRegistry : sheetRow.childPeselLater });
      if (isLoss(facts)) rows.push({ id: "document", label: sheetRow.document, value: result?.documents.some((x) => x.code === "BIRTH_ACT_STILLBORN") ? "Akt urodzenia z adnotacją" : "Zaświadczenie o urodzeniu martwego dziecka" });
    } else {
      rows.push({ id: "takenIntoCare", label: sheetRow.takenIntoCare, value: d(ev.takenIntoCareOn), source: input.sources?.["facts.event.takenIntoCareOn"] });
      const born = ev.children[0]?.birthDate;
      if (born) rows.push({ id: "childBirth", label: sheetRow.childBirthDate, value: d(born), source: input.sources?.["facts.event.children"] ?? "rsc" });
    }
    if (periods.some((b) => b.type === "parental")) {
      const claimantParental = periods.filter((b) => b.type === "parental").map((b) => blockPeriod(b, result));
      const overlap = (input.plan?.blocks ?? [])
        .filter((b) => b.parent === "other" && b.type === "parental")
        .map((b) => blockPeriod(b, result))
        .filter((o) => claimantParental.some((p) => o.from <= p.to && o.to >= p.from));
      rows.push({ id: "otherParent", label: sheetRow.otherParent, value: overlap.length ? fill(sheetRow.otherParentIn, { periods: overlap.map(range).join(", ") }) : sheetRow.otherParentNone, source: "plan" });
    }
    rows.push(bankRow());
    if (result?.documents.some((x) => x.code === "SINGLE_TITLE_STATEMENT")) rows.push({ id: "singleTitle", label: sheetRow.singleTitle, note: sheetRow.singleTitleNote });
    rows.push({ id: "fileWith", label: sheetRow.fileWith, value: spec.recipient === "employer" ? "U pracodawcy — przekaże wniosek dalej albo sam wypłaci zasiłek" : "W ZUS — przez PUE/eZUS albo na papierze" });
    return { slug: spec.slug, kind: spec.kind, title: c.title, intro: c.intro, rows, link: c.link, recipient: spec.recipient === "employer" ? "employer" : "zus" };
  }
  if (spec.kind === "zas-53") {
    const c = sheetCopy["zas-53"];
    const rows: SheetRow[] = facts.claimant.sickNotes.map((n, i) => ({ id: `sick-${i + 1}`, label: sheetRow.sickPeriod, value: range(n), note: i === 0 ? sheetRow.sickNote : undefined, source: "zus-ezla" as const }));
    rows.push(bankRow(), { id: "annex4", label: sheetRow.annex4, note: sheetRow.annex4Note });
    return { slug: spec.slug, kind: spec.kind, title: c.title, intro: c.intro, rows, link: c.link, recipient: "zus" };
  }
  if (spec.kind === "zas-55") {
    const c = sheetCopy["zas-55"];
    const rows: SheetRow[] = [];
    const art30 = claimantBlocks(input.plan).find((b) => b.type === "art30PreBirth");
    if (art30) rows.push({ id: "art30", label: sheetRow.art30Period, value: range(blockPeriod(art30, result)), source: "plan" });
    const ended = facts.claimant.titles.find((t) => t.endReason && endReasonText[t.endReason]);
    if (ended?.endReason) rows.push({ id: "reason", label: sheetRow.art30Reason, value: endReasonText[ended.endReason], source: "zus-konto" });
    rows.push({ id: "docs", label: sheetRow.art30Docs, value: sheetRow.art30DocsValue }, bankRow());
    return { slug: spec.slug, kind: spec.kind, title: c.title, intro: c.intro, rows, link: c.link, recipient: "zus" };
  }
  return null;
}

/** Plain JSON pre-fill for GET /api/v1/forms/{kind}. */
export function formPrefill(spec: FormSpec, input: GuidanceInput) {
  if (spec.category === "leave") return { form: spec, document: buildLeaveDoc(spec, input) };
  if (spec.category === "benefit") return { form: spec, sheet: buildSheet(spec, input) };
  if (spec.kind === "usc-birth") return { form: spec, usc: { applicant: input.displayName ?? null, types: uscCopy.types, purposes: uscCopy.purposes, delivery: uscCopy.delivery, note: uscCopy.zusNote } };
  return { form: spec, pue: { topics: pueCopy.topics, answerWithinDays: 7 } };
}

export const recipientPrefix = { employer: "PRAC", zus: "ZUS", usc: "USC" } as const;
export { formsText };
