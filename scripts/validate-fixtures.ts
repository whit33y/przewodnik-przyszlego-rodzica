/**
 * Fixture gate (plan 02 §7 checklist, automated part).
 * 1. JSON parses, `id` matches the folder, zod schema (src/integrations/case-schema.ts).
 * 2. PII scan. The private name list (.work/names.txt) is read at validation time only and never committed;
 *    tokens of ≥4 letters, matched as whole words.
 * 3. Checklist: printed expected fields have provenance, date sanity, months sanity, refusals carry reason
 *    codes and alerts, printed daily = round(base × rate / 30), tiers equal the derived tiers.
 */
import fs from "node:fs";
import path from "node:path";
import { caseExpectedSchema, caseInputSchema, deriveTiers, type CaseExpected, type CaseInput } from "../src/integrations/case-schema";

const root = path.join(process.cwd(), "data", "cases");
const namesFile = path.join(process.cwd(), ".work", "names.txt");
const names = fs.existsSync(namesFile)
  ? fs
      .readFileSync(namesFile, "utf8")
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter((n) => n.length >= 4)
  : [];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameRes = names.map((n) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(n)}(?![\\p{L}\\p{N}])`, "iu"));

const piiPatterns: [RegExp, string][] = [
  [/(?<![\d.])\d{11}(?![\d.])/, "11-digit number (PESEL?)"],
  [/(?<![\d.])\d{10}(?![\d.])/, "10-digit number (NIP/phone?)"],
  [/\d{26}/, "bank account"],
  [/\b\d{2}-\d{3}\b/, "postcode"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "e-mail"],
  [/\bul\.\s/i, "street"],
];

let errors = 0;
let warnings = 0;
let count = 0;
const fail = (id: string, msg: string) => {
  console.error(`✗ ${id}: ${msg}`);
  errors++;
};
const warn = (id: string, msg: string) => {
  console.warn(`! ${id}: ${msg}`);
  warnings++;
};

const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const isRealDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const ORDER: Record<string, number> = { maternity: 1, maternityOnAdoption: 1, supplementary: 2, parental: 3 };

function checklist(id: string, input: CaseInput, expected: CaseExpected) {
  // Real calendar dates everywhere.
  const allDates = JSON.stringify({ f: input.facts, p: input.plan, e: expected }).match(/"\d{4}-\d{2}-\d{2}"/g) ?? [];
  for (const q of allDates) if (!isRealDate(q.slice(1, -1))) fail(id, `invalid calendar date ${q}`);

  // Plan blocks: order maternity → supplementary → parental per parent.
  const blocks = [...input.plan.blocks].sort((a, b) => day(a.from) - day(b.from));
  for (const parent of ["claimant", "other"] as const) {
    let last = 0;
    for (const b of blocks.filter((x) => x.parent === parent && ORDER[x.type])) {
      if (ORDER[b.type] < last) fail(id, `plan block ${b.id}: ${b.type} after a later leave type`);
      last = Math.max(last, ORDER[b.type]);
    }
  }

  // Expected periods: to = from + days − 1; birth within the maternity window.
  const ev = input.facts.event;
  const birth = ev.kind === "birth" ? ev.date : undefined;
  for (const [i, b] of expected.benefits.entries()) {
    if (b.from && b.to && b.days && day(b.to.value) - day(b.from.value) + 1 !== b.days.value) {
      fail(id, `benefits[${i}] ${b.type}: from/to/days inconsistent (${b.from.value}..${b.to.value} ≠ ${b.days.value} days)`);
    }
    if (b.type === "maternity" && birth && b.from && b.to && input.facts.claimant.role === "mother") {
      if (day(birth) < day(b.from.value) || day(birth) > day(b.to.value) + 1) fail(id, `benefits[${i}]: birth ${birth} outside maternity window`);
      if (day(b.from.value) < day(birth) - 42) fail(id, `benefits[${i}]: maternity starts more than 6 weeks before birth`);
    }
    for (const [j, p] of (b.payments ?? []).entries()) {
      if (day(p.to) - day(p.from) + 1 !== p.days) fail(id, `benefits[${i}].payments[${j}]: days ≠ to − from + 1`);
    }
    // Printed triple: daily === round(base × rate / 30).
    if (b.base?.evidence === "printed" && b.rateBps?.evidence === "printed" && b.daily?.evidence === "printed") {
      const calc = Math.floor((2 * b.base.value * b.rateBps.value + 300_000) / 600_000);
      if (calc !== b.daily.value) fail(id, `benefits[${i}]: printed daily ${b.daily.value} ≠ round(base × rate / 30) = ${calc} (re-check OCR)`);
    }
  }

  // Every printed expected field needs provenance somewhere (a fact/plan entry or a payment source page).
  const hasPrinted = expected.benefits.some((b) => JSON.stringify(b).includes('"printed"'));
  if (hasPrinted && Object.keys(input.provenance).length === 0) fail(id, "printed expected values but no provenance entries");
  for (const t of input.facts.claimant.titles) {
    if (t.statedBenefitBase !== undefined) {
      const key = Object.keys(input.provenance).find((k) => k.endsWith("statedBenefitBase"));
      if (!key) fail(id, `title ${t.id}: statedBenefitBase without provenance`);
    }
    // Months: ≤12 per reference window, no duplicates, positive bases.
    const seen = new Set<string>();
    for (const m of t.months) {
      if (seen.has(m.month)) fail(id, `title ${t.id}: duplicate month ${m.month}`);
      seen.add(m.month);
      if (m.contributionBase <= 0 && !m.contributionHoliday && m.fullMonthInsured !== false) warn(id, `title ${t.id}: month ${m.month} has base ≤ 0`);
      if (m.daysWorked !== undefined && m.daysDue !== undefined && m.daysWorked > m.daysDue) fail(id, `title ${t.id}: ${m.month} daysWorked > daysDue`);
    }
    if (t.months.length > 24) warn(id, `title ${t.id}: ${t.months.length} month records (more than two reference windows)`);
    if (t.to && day(t.to) < day(t.from)) fail(id, `title ${t.id}: to before from`);
  }

  // Refusals carry ≥1 reason code and ≥1 expected alert.
  if (expected.outcome.value === "refused") {
    if (expected.outcome.reasonCodes.length === 0) fail(id, "refused outcome without reason codes");
    if (expected.expectedAlerts.length === 0) fail(id, "refused outcome without expected alerts");
  }
  if (expected.outcome.value === "granted" && expected.outcome.reasonCodes.length > 0) warn(id, "granted outcome lists reason codes");

  // Tiers are derived, not hand-set.
  const tiers = deriveTiers(expected);
  if (tiers.duration !== expected.tiers.duration || tiers.amount !== expected.tiers.amount) {
    fail(id, `tiers ${JSON.stringify(expected.tiers)} ≠ derived ${JSON.stringify(tiers)}`);
  }
  if (expected.knownDivergence && expected.knownDivergence.fields.length === 0) fail(id, "knownDivergence without fields");
}

if (fs.existsSync(root)) {
  let divergences = 0;
  for (const id of fs.readdirSync(root).filter((d) => !d.startsWith("_") && fs.statSync(path.join(root, d)).isDirectory()).sort()) {
    const parsed: Record<string, unknown> = {};
    for (const file of ["input.json", "expected.json"]) {
      const p = path.join(root, id, file);
      if (!fs.existsSync(p)) {
        fail(id, `missing ${file}`);
        continue;
      }
      const text = fs.readFileSync(p, "utf8");
      let json: { id?: string };
      try {
        json = JSON.parse(text);
      } catch (e) {
        fail(id, `${file}: invalid JSON (${(e as Error).message})`);
        continue;
      }
      if (json.id !== id) fail(id, `${file}: id "${json.id}" does not match folder`);
      const scan = text.replace(/"[a-f0-9]{64}"/g, '""'); // hashes are not PII
      for (const [re, what] of piiPatterns) if (re.test(scan)) fail(id, `${file}: possible PII — ${what}`);
      if (nameRes.some((re) => re.test(scan))) fail(id, `${file}: contains a token from the private name list`);
      const schema = file === "input.json" ? caseInputSchema : caseExpectedSchema;
      const res = schema.safeParse(json);
      if (!res.success) {
        for (const issue of res.error.issues.slice(0, 8)) fail(id, `${file}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
      } else parsed[file] = res.data;
    }
    const input = parsed["input.json"] as CaseInput | undefined;
    const expected = parsed["expected.json"] as CaseExpected | undefined;
    if (input && expected) {
      checklist(id, input, expected);
      if (expected.knownDivergence) divergences++;
    }
    count++;
  }
  if (divergences > 5) fail("_all", `${divergences} cases use knownDivergence (max 5)`);
}
if (errors) {
  console.error(`\nfixtures:validate — ${errors} problem(s) in ${count} case(s).`);
  process.exit(1);
}
console.log(
  `fixtures:validate — ${count} case(s) OK${warnings ? `, ${warnings} warning(s)` : ""}${names.length ? "" : " (private name list not present: name scan skipped)"}.`,
);
