/**
 * Case fixture → simulated registry payloads. A sample case "logs in" through exactly the same
 * pipeline as a demo persona: Facts are split into the systems that would hold them, then
 * re-assembled. Round-trip is tested over every fixture (tests/unit/split-assemble.test.ts).
 */
import type { Facts, Plan } from "@/engine/types";
import type { Answers, SystemPayloads } from "./types";

export function splitFacts(facts: Facts, plan?: Plan): { systems: Partial<SystemPayloads>; answers: Answers } {
  const c = facts.claimant;
  const systems: Partial<SystemPayloads> = {
    mobywatel: { displayName: "", sex: c.sex, birthYear: c.birthYear },
    "zus-konto": {
      role: c.role,
      titles: c.titles.map((t) => {
        const copy = { ...t };
        delete copy.suspensions;
        return copy;
      }),
      ...(c.flags ? { flags: c.flags } : {}),
    },
    "zus-saldo": { arrears: c.arrears },
    "zus-ezla": { sickNotes: c.sickNotes },
    "zus-swiadczenia": { paidBenefits: c.paidBenefits, ...(facts.otherParent?.used?.length ? { otherParentUsed: facts.otherParent.used } : {}) },
    "zus-postepowania": { insuranceDecisions: c.insuranceDecisions },
    ceidg: { suspensions: c.titles.flatMap((t) => (t.suspensions ?? []).map((s) => ({ titleId: t.id, ...s }))) },
    krs: { payerStatus: c.titles.filter((t) => t.payer.status).map((t) => ({ ref: t.payer.ref, status: t.payer.status! })) },
  };
  const ev = facts.event;
  if (ev.kind === "birth") {
    if (ev.date || ev.occurred) systems.rsc = { event: { kind: "birth", date: ev.date, occurred: ev.occurred, children: ev.children.map(({ ref, bornAlive, deathDate }) => ({ ref, bornAlive, deathDate })) }, otherParentKnown: Boolean(facts.otherParent) };
    systems.ezdrowie = { expectedDate: ev.expectedDate, children: ev.children.map(({ ref, gestationalWeek, birthWeightG, hospitalStays, zaZyciem }) => ({ ref, gestationalWeek, birthWeightG, hospitalStays, zaZyciem })) };
  } else {
    systems.rsc = { event: { kind: ev.kind, takenIntoCareOn: ev.takenIntoCareOn, finalOrderOn: ev.finalOrderOn, interimOrderOn: ev.interimOrderOn, children: ev.children.map(({ ref, birthDate }) => ({ ref, birthDate })) }, otherParentKnown: Boolean(facts.otherParent) };
  }
  // Fields no registry owns (circumstances, statements) travel unchanged as case extras.
  const answers: Answers = {
    plan,
    caseExtras: {
      parameterDate: facts.parameterDate,
      mode: facts.mode,
      event: ev,
      otherParent: facts.otherParent,
      claimantRole: c.role,
    },
  };
  return { systems: stripUndefined(systems), answers };
}

export function stripUndefined<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
