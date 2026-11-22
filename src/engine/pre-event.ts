/**
 * Pre-event replay (plan 02 §8): what the app would have known 60 days before the decisive date.
 * Decisive date: the birth / taking into care when the claim starts there (maternity, Art. 30, pre-birth leave),
 * otherwise the first claimed block (a father's part, a separately claimed parental part, paternity).
 * Dropped: ZUS insurance decisions, benefits from the decisive date on, sick notes from then on, and — when the
 * decisive date is the birth — the birth date and every birth-only detail (the due date is kept).
 * Shared by the golden alert-recall suite and the case screen ("Co aplikacja pokazałaby wcześniej").
 */
import type { CaseInput } from "./case-types";
import { addDays } from "./dates";
import type { Facts } from "./types";

export function decisiveDate(input: Pick<CaseInput, "facts" | "plan">): string | undefined {
  const { facts, plan } = input;
  const e = facts.event;
  const eventDate = e.kind === "birth" ? e.date : e.takenIntoCareOn;
  const claimantBlocks = plan.blocks.filter((b) => b.parent === "claimant").map((b) => b.from).sort();
  const motherLike = facts.claimant.role !== "father";
  if (eventDate && motherLike && claimantBlocks.some((d) => d >= addDays(eventDate, -42) && d <= addDays(eventDate, 1))) return eventDate;
  return claimantBlocks[0] ?? eventDate ?? (e.kind === "birth" ? e.expectedDate : undefined);
}

export function preEventFacts(input: Pick<CaseInput, "facts" | "plan">): Facts {
  const facts = JSON.parse(JSON.stringify(input.facts)) as Facts;
  const decisive = decisiveDate(input) ?? facts.asOf;
  facts.asOf = addDays(decisive, -60);
  delete facts.mode;
  facts.claimant.insuranceDecisions = [];
  facts.claimant.paidBenefits = facts.claimant.paidBenefits.filter((b) => b.from < decisive);
  facts.claimant.sickNotes = facts.claimant.sickNotes.filter((n) => n.from < decisive);
  if (facts.otherParent) facts.otherParent.used = facts.otherParent.used.filter((b) => b.from < decisive);
  const e = facts.event;
  if (e.kind === "birth") {
    const birth = e.date;
    if (birth && birth === decisive) {
      e.expectedDate = e.expectedDate ?? birth;
      delete e.date;
      delete e.occurred;
      delete e.documents;
      e.children = e.children.map((c) => ({ ref: c.ref, zaZyciem: c.zaZyciem }));
      if (e.mother) delete e.mother.maternityUsed;
    }
  }
  return facts;
}
