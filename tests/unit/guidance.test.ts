import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate, type ParameterSet } from "@/engine";
import type { Answers, PersonaFile } from "@/integrations/types";
import { fixHref } from "@/content/pl";
import { guideAnchors } from "@/content/steps";
import { assemble } from "@/server/assemble";
import { buildLeaveDoc, buildSheet, requiredForms, type GuidanceInput, type SourceRef } from "@/server/forms";
import { buildIcs, foldLine } from "@/server/ics";
import { buildSteps } from "@/server/steps";

const root = path.resolve(__dirname, "../../data");
const params = fs
  .readdirSync(path.join(root, "params"))
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, "params", f), "utf8")) as ParameterSet);
const personas = fs
  .readdirSync(path.join(root, "personas"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, "personas", f), "utf8")) as PersonaFile);

function inputFor(p: PersonaFile, submissions: GuidanceInput["submissions"] = []): GuidanceInput {
  const answers: Answers = { ...(p.presetAnswers ?? {}) };
  if (p.id === "magdalena") answers.expectedDate = "2027-03-12"; // e-zdrowie is "down" for her — the user types it
  let otherParentPerson;
  if (p.otherParent?.consented) {
    answers.otherParent = { mode: "consent" };
    otherParentPerson = { ...assemble({ payloads: p.otherParent.systems, meta: {}, answers: {}, overrides: [], asOf: p.asOf, mode: "mobywatel" }).facts.claimant, role: p.otherParent.role };
  }
  const a = assemble({ payloads: p.systems, meta: {}, answers, overrides: [], asOf: p.asOf, mode: "mobywatel", otherParentPerson });
  const r0 = evaluate(a.facts, null, params);
  const plan = answers.plan ?? r0.defaultPlan ?? null;
  const result = plan ? evaluate(a.facts, plan, params) : r0;
  const sources = Object.fromEntries(Object.entries(a.provenance).map(([k, v]) => [k, v.source as SourceRef]));
  const ev = a.facts.event;
  const registered = ev.kind === "birth" ? Boolean(ev.date && a.provenance["facts.event.date"]?.source === "rsc") : true;
  return { facts: a.facts, plan, result, submissions, registered, displayName: p.systems.mobywatel?.displayName, today: a.facts.asOf, sources };
}

const banned = /gratulacj|maluszek|!|niestety|musisz natychmiast/i;

describe("guidance — steps", () => {
  it("loads nine personas", () => expect(personas.length).toBe(9));

  for (const p of personas) {
    describe(p.id, () => {
      const input = inputFor(p);
      const forms = requiredForms(input);
      const steps = buildSteps({ ...input, forms });

      it("lists every document and deadline exactly once", () => {
        const docRefs = steps.flatMap((s) => s.refs.documents);
        const dlRefs = steps.flatMap((s) => s.refs.deadlines);
        expect(docRefs.sort()).toEqual(input.result!.documents.map((d) => d.code).sort());
        expect(dlRefs.sort()).toEqual(input.result!.deadlines.map((d) => `${d.code}|${d.blockId ?? ""}`).sort());
      });

      it("never asks for registry-obtainable documents", () => {
        for (const d of input.result!.documents.filter((x) => x.obtainableFromRegistry)) {
          const s = steps.find((x) => x.refs.documents.includes(d.code))!;
          expect(s.state).toBe("notNeeded");
          expect(s.body).toMatch(/^Nie musisz/);
          expect(s.formHref).toBeUndefined();
        }
      });

      it("uses plain, calm copy", () => {
        for (const s of steps) {
          expect(s.title).not.toMatch(banned);
          expect(s.body ?? "").not.toMatch(/gratulacj|maluszek|niestety|musisz natychmiast/i);
        }
      });

      it("links only to forms that exist", () => {
        for (const s of steps) if (s.formSlug) expect(forms.some((f) => f.slug === s.formSlug)).toBe(true);
      });

      it("builds every form document", () => {
        for (const f of forms) {
          if (f.category === "leave") expect(buildLeaveDoc(f, input), f.slug).not.toBeNull();
          if (f.category === "benefit") expect(buildSheet(f, input), f.slug).not.toBeNull();
        }
      });

      it("exports a valid calendar without personal data", () => {
        const ics = buildIcs(steps, new Date("2026-11-21T10:00:00Z"));
        expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
        expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
        expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
        expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe((ics.match(/END:VEVENT/g) ?? []).length);
        const name = p.systems.mobywatel?.displayName ?? "";
        expect(ics).not.toContain(name.split(" ")[0]);
        expect(ics).not.toMatch(/zł/);
        const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
        expect(new Set(uids).size).toBe(uids.length);
      });
    });
  }

  it("every /kroki fix link has an anchor in the guide", () => {
    for (const href of Object.values(fixHref)) if (href?.startsWith("/kroki#")) expect(guideAnchors).toContain(href.slice(7));
  });
});

describe("guidance — routing and forms", () => {
  const by = (id: string) => inputFor(personas.find((p) => p.id === id)!);

  it("employee of a large employer files with the employer, employer pays", () => {
    const r = by("magdalena").result!;
    expect(r.routing).toMatchObject({ fileWith: "employer", benefitPayer: "payer" });
  });

  it("employee of a small firm files with the employer, ZUS pays, employer forwards Z-3", () => {
    const input = by("bartosz");
    expect(input.result!.routing).toMatchObject({ fileWith: "employer", benefitPayer: "zus", payerForwardsWithinDays: 7 });
    const steps = buildSteps({ ...input, forms: requiredForms(input) });
    const z3 = steps.find((s) => s.refs.documents.includes("Z-3"))!;
    expect(z3.who).toBe("employer");
    expect(z3.title).toMatch(/Pracodawca przekazuje/);
  });

  it("self-employed files with ZUS via PUE and gets no leave applications", () => {
    const input = by("weronika");
    expect(input.result!.routing).toMatchObject({ fileWith: "zus", channel: ["pue", "paper"] });
    const forms = requiredForms(input);
    expect(forms.filter((f) => f.category === "leave")).toEqual([]);
    expect(forms.map((f) => f.slug)).toContain("zam");
    const steps = buildSteps({ ...input, forms });
    const arrears = steps.find((s) => s.refs.alerts.includes("ARREARS_OWN"))!;
    expect(arrears.group).toBe("now");
    expect(arrears.fix?.href).toBe("/kroki#skladki");
  });

  it("father gets paternity and parental applications pre-filled from the plan", () => {
    const input = by("bartosz");
    const forms = requiredForms(input);
    const pat = forms.find((f) => f.kind === "leave-paternity")!;
    const doc = buildLeaveDoc(pat, input)!;
    expect(doc.request[0]).toContain("23.01.2027");
    expect(forms.find((f) => f.kind === "leave-parental")).toBeTruthy();
  });

  it("maternity application carries the joint parental request and 81.5%", () => {
    const input = by("magdalena");
    const f = requiredForms(input).find((x) => x.kind === "leave-maternity")!;
    const doc = buildLeaveDoc(f, input)!;
    expect(doc.statements.map((s) => s.id)).toEqual(expect.arrayContaining(["jointParental", "rate815"]));
  });

  it("part-time parental block yields the combining-with-work application with working time", () => {
    const input = by("magdalena");
    const plan = structuredClone(input.plan!);
    const par = plan.blocks.find((b) => b.type === "parental")!;
    par.workFraction = { num: 1, den: 2 };
    const result = evaluate(input.facts, plan, params);
    const i2 = { ...input, plan, result };
    const work = requiredForms(i2).find((f) => f.kind === "leave-parental-work")!;
    expect(work).toBeTruthy();
    const doc = buildLeaveDoc(work, i2)!;
    expect(doc.fields.find((x) => x.id === "workTime")?.value).toBe("1/2 etatu");
  });

  it("USC copy request is disabled before the birth is registered and enabled after", () => {
    expect(requiredForms(by("magdalena")).find((f) => f.kind === "usc-birth")?.disabledReason).toBeTruthy();
    expect(requiredForms(by("monika")).find((f) => f.kind === "usc-birth")?.disabledReason).toBeUndefined();
  });

  it("loss persona: no USC request, no parental, neutral steps", () => {
    const input = by("patrycja");
    const forms = requiredForms(input);
    expect(forms.find((f) => f.kind === "usc-birth")).toBeUndefined();
    expect(forms.find((f) => f.kind === "leave-parental")).toBeUndefined();
    const doc = buildLeaveDoc(forms.find((f) => f.kind === "leave-maternity")!, input)!;
    expect(doc.statements).toEqual([]);
  });

  it("a stored submission marks the step done", () => {
    const base = by("magdalena");
    const forms0 = requiredForms(base);
    const slug = forms0.find((f) => f.kind === "leave-maternity")!.slug;
    const input = { ...base, submissions: [{ id: "PRAC-2026-ABCDEF", kind: slug, createdAt: "2026-11-21T10:00:00Z" }] };
    const forms = requiredForms(input);
    expect(forms.find((f) => f.slug === slug)?.status).toBe("sent");
    const step = buildSteps({ ...input, forms }).find((s) => s.formSlug === slug)!;
    expect(step.state).toBe("done");
    expect(step.submissionId).toBe("PRAC-2026-ABCDEF");
  });

  it("ZAM sheet periods match the plan", () => {
    const input = by("magdalena");
    const sheet = buildSheet(requiredForms(input).find((f) => f.kind === "zam")!, input)!;
    expect(sheet.rows.find((r) => r.id === "period-1")?.value).toBe("od 12.03.2027 do 29.07.2027");
    expect(sheet.rows.find((r) => r.id === "bank")?.value).toBeUndefined();
  });
});

describe("ics folding", () => {
  it("folds long UTF-8 lines at 75 octets", () => {
    const line = `SUMMARY:${"Zażółć gęślą jaźń ".repeat(10)}`;
    const folded = foldLine(line);
    expect(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});
