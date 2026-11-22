import type { ReactNode } from "react";
import { addDays, diffDays } from "@/engine/dates";
import type { Routing } from "@/engine/types";
import { citationText } from "@/content/pl";
import { channelLabel, fill, groupHeading, groupHeadingAdoption, groupHeadingLoss, routingCopy, stepsText, toLabel, whoLabel, type StepGroup } from "@/content/steps";
import { formatDateLong } from "@/lib/format";
import { loadContext } from "@/server/context";
import { eventDate, eventOccurred, isLoss } from "@/server/forms";
import { loadGuidance } from "@/server/guidance";
import { groupSteps, type Step } from "@/server/steps";
import type { Facts } from "@/engine/types";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { SourceBadge } from "@/ui/components/SourceBadge/SourceBadge";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { Steps, type StepItem } from "@/ui/components/Steps/Steps";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { NeedsSession } from "../../_shell/NeedsSession";
import s from "./Kroki.module.css";

function routingText(routing: Routing, facts: Facts) {
  if (routing.fileWith === "employer") {
    return routing.benefitPayer === "payer" ? routingCopy.employerPays : { ...routingCopy.employerForwards, why: fill(routingCopy.employerForwards.why, { days: routing.payerForwardsWithinDays ?? 7 }) };
  }
  if (facts.claimant.titles.some((t) => t.kind === "selfEmployed" || t.kind === "collaborator")) return routingCopy.zusSelf;
  if (facts.claimant.titles.some((t) => t.kind === "employment" && t.to)) return routingCopy.zusAfterTitle;
  return routingCopy.zusOther;
}

function RoutingStrip({ routing, facts }: { routing: Routing; facts: Facts }) {
  const t = routingText(routing, facts);
  return (
    <section className={s.routing} aria-labelledby="gdzie-skladasz">
      <h2 id="gdzie-skladasz" className={s.routingWhere}>
        Wnioski składasz <strong>{t.where}</strong>
      </h2>
      <p>{t.why}</p>
      <p className={s.small}>Podstawa: {routing.citations.map(citationText).join("; ")}</p>
    </section>
  );
}

function headingFor(group: StepGroup, facts: Facts, loss: boolean) {
  if (loss && groupHeadingLoss[group]) return groupHeadingLoss[group]!;
  if (facts.event.kind !== "birth" && groupHeadingAdoption[group]) return groupHeadingAdoption[group]!;
  return groupHeading[group];
}

function Counter({ facts, today }: { facts: Facts; today: string }) {
  const E = eventDate(facts);
  if (!E || !eventOccurred(facts)) return <p className={s.counter}>{facts.event.kind === "birth" ? stepsText.counterFromBirth : stepsText.counterFromCare}</p>;
  const end = addDays(E, 21);
  const left = diffDays(today, end);
  return <p className={s.counter}>{left >= 0 ? fill(stepsText.counterLeft, { n: left, date: formatDateLong(end) }) : fill(stepsText.counterPassed, { date: formatDateLong(end) })}</p>;
}

function stepItem(step: Step, today: string): StepItem {
  const meta: ReactNode[] = [];
  if (step.date) {
    const past = step.state === "todo" && step.dateKind === "by" && step.date < today;
    meta.push(
      <span key="date">
        {step.dateKind === "from" ? "od" : "do"} {formatDateLong(step.date)}
        {past ? <span className={s.past}> — {stepsText.overdue}</span> : null}
      </span>,
    );
  }
  meta.push(<span key="who">Kto: {whoLabel[step.who]}{step.to ? ` → ${toLabel[step.to]}` : ""}</span>);
  if (step.channel?.length) meta.push(<span key="ch">{step.channel.map((c) => channelLabel[c]).join(" lub ")}</span>);
  const sheet = step.formSlug === "zam" || step.formSlug?.startsWith("zas-");
  const notYours = step.state === "todo" && (step.who === "employer" || step.who === "system");
  return {
    state: step.state === "todo" ? "todo" : "done",
    title: step.title,
    meta: meta.flatMap((m, i) => (i ? [" · ", m] : [m])),
    body: (
      <span className={s.stepBody}>
        {step.body ? <span className={s.stepText}>{step.body}</span> : null}
        <span className={s.actions}>
          {step.registrySource ? <SourceBadge source={step.registrySource} /> : null}
          {notYours ? <StatusBadge tone="neutral" label={stepsText.notYours} /> : null}
          {step.state === "done" && step.submissionId ? (
            <>
              <StatusBadge tone="positive" label={stepsText.sent} />
              <TextLink href={`/wnioski/wyslane/${step.submissionId}`}>nr {step.submissionId}</TextLink>
            </>
          ) : null}
          {step.state === "done" && !step.submissionId ? <StatusBadge tone="positive" label={stepsText.alreadyPaid} /> : null}
          {step.state === "todo" && step.formHref && !step.fix ? (
            <Button href={step.formHref} size="sm" variant="secondary" icon="document">
              {sheet ? stepsText.openSheet : stepsText.fillForm}
            </Button>
          ) : null}
          {step.fix ? (
            step.fix.href ? (
              <Button href={step.fix.href} size="sm" variant="secondary">
                {step.fix.label}
              </Button>
            ) : (
              <strong>{step.fix.label}</strong>
            )
          ) : null}
          {step.anchor && !step.fix ? <TextLink href={`#${step.anchor}`}>Więcej w poradniku</TextLink> : null}
        </span>
      </span>
    ),
  };
}

export async function StepsContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const g = await loadGuidance(ctx);
  const facts = g.input.facts;
  const loss = isLoss(facts);
  const groups = groupSteps(g.steps);
  const hasDated = g.steps.some((x) => x.date && x.state !== "notNeeded");
  return (
    <div className={s.layout}>
      {g.missingEvent ? (
        <Notice tone="info" title="Brakuje daty porodu" actions={<Button href="/sytuacja">Uzupełnij</Button>}>
          <p>{stepsText.missingDate}</p>
        </Notice>
      ) : null}
      {loss ? (
        <Notice tone="neutral" title={stepsText.lossNote} hideToneWord>
          <p>
            <TextLink href="/trudna-sytuacja">{stepsText.lossLink}</TextLink>
          </p>
        </Notice>
      ) : null}
      {g.result ? <RoutingStrip routing={g.result.routing} facts={facts} /> : null}
      {hasDated ? (
        <div className={s.toolbar}>
          <Button href="/api/v1/steps.ics" download variant="secondary" icon="calendar" uppercase={false} {...{ prefetch: false }}>
            {stepsText.calendar}
          </Button>
          <span className={s.small}>{stepsText.calendarHint}</span>
        </div>
      ) : null}
      {groups.length === 0 ? <p>{stepsText.noSteps}</p> : null}
      {groups.map(({ group, steps }) => {
        const heading = headingFor(group, facts, loss);
        return (
          <section key={group} className={s.section} aria-labelledby={`grupa-${group}`}>
            <h2 id={`grupa-${group}`}>{heading}</h2>
            {group === "first21Days" && !loss ? <Counter facts={facts} today={g.input.today} /> : null}
            <Steps label={heading} items={steps.map((x) => stepItem(x, g.input.today))} />
          </section>
        );
      })}
    </div>
  );
}
