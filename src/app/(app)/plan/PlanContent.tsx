import { loadContext } from "@/server/context";
import { evaluatePlan, initialPlan } from "@/server/plan-service";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { AlertList } from "../../_shell/AlertList";
import { NeedsSession } from "../../_shell/NeedsSession";
import { Planner } from "./Planner";

export async function PlanContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const { facts, missing } = ctx.assembled;
  if (missing.some((q) => q.required)) {
    return (
      <Notice tone="info" title="Najpierw kilka informacji" actions={<Button href="/sytuacja">Uzupełnij</Button>}>
        <p>Żeby ułożyć plan, potrzebujemy przewidywanej daty porodu lub przyjęcia dziecka.</p>
      </Notice>
    );
  }
  const ev = facts.event;
  const loss = ev.kind === "birth" && ev.children.length > 0 && ev.children.every((c) => c.bornAlive === false || Boolean(c.deathDate));
  if (loss) {
    return (
      <Notice tone="neutral" title="Plan urlopów nie jest teraz potrzebny" hideToneWord actions={<Button href="/kroki" variant="secondary">Co i kiedy trzeba załatwić</Button>}>
        <p>Przysługuje Ci urlop i zasiłek macierzyński po stracie dziecka — szczegóły znajdziesz w zakładce „Uprawnienia”. Nie musisz niczego planować ani wybierać.</p>
      </Notice>
    );
  }
  const init = await initialPlan(facts, ctx.state.plan, ctx.state.mode === "case" ? ctx.answers.plan : undefined);
  const notEntitled = init.result && !init.result.entitlements.some((e) => (e.status === "granted" || e.status === "withheld" || e.status === "partial") && ["maternity", "maternityOnAdoption", "parental", "paternity"].includes(e.benefit));
  if (!init.plan || notEntitled) {
    const blocking = init.result?.alerts.filter((a) => a.severity === "blocking" || a.severity === "high") ?? [];
    return (
      <>
        <Notice tone="caution" title="Najpierw trzeba to naprawić" hideToneWord>
          <p>Na dziś nie przysługuje Ci zasiłek macierzyński, więc nie ma czego planować. Zobacz, co możesz zrobić.</p>
        </Notice>
        {blocking.length ? <AlertList alerts={blocking} headingLevel={2} /> : null}
      </>
    );
  }
  const out = await evaluatePlan(facts, init.plan);
  if (!out.result) {
    return (
      <Notice tone="caution" title="Nie możemy teraz przeliczyć planu" role="alert">
        <p>Spróbuj ponownie za chwilę.</p>
      </Notice>
    );
  }
  const anchor = ev.kind === "birth" ? (ev.date ?? ev.expectedDate!) : ev.takenIntoCareOn;
  const op = facts.otherParent;
  const a = ctx.answers;
  const reg = ctx.persona?.systems;
  const whatIf = {
    eventKind: ev.kind,
    childrenCount: ev.kind === "birth" ? ev.children.length : 1,
    zaZyciem: ev.kind === "birth" && ev.children.some((c) => c.zaZyciem),
    hospital: a.whatIf?.hospital ?? { category: "none" as const, days: 0 },
    known: {
      eventKind: ctx.state.mode === "case" || Boolean(reg?.rsc?.event),
      children: ctx.state.mode === "case" || Boolean(reg?.rsc?.event) || Boolean(reg?.ezdrowie?.children?.length),
      zaZyciem: ctx.state.mode === "case" || Boolean(reg?.ezdrowie?.children?.some((c) => c.zaZyciem !== undefined)),
      hospital: ctx.state.mode === "case" || Boolean(reg?.ezdrowie?.children?.some((c) => c.hospitalStays?.length || c.gestationalWeek)),
    },
  };
  return (
    <Planner
      key={`${anchor}|${JSON.stringify(whatIf)}|${JSON.stringify(op ?? null)}`}
      whatIf={whatIf}
      initial={{ plan: init.plan, origin: init.origin, result: out.result, alt: out.alt }}
      claimantRole={facts.claimant.role}
      otherRole={op && op.insured !== "no" ? op.role : null}
      otherHasData={Boolean(op?.person || op?.estimatedBase)}
      anchor={anchor}
      anchorLabel={ev.kind === "birth" ? (ev.date ? "Poród" : "Termin porodu") : "Przyjęcie dziecka"}
      adoption={ev.kind !== "birth"}
      caseMode={ctx.state.mode === "case"}
      today={facts.asOf}
    />
  );
}
