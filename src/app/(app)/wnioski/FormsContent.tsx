import { recipientLabel } from "@/content/forms";
import { loadContext } from "@/server/context";
import type { FormSpec } from "@/server/forms";
import { loadGuidance } from "@/server/guidance";
import { Card } from "@/ui/components/Card/Card";
import { Notice } from "@/ui/components/Notice/Notice";
import { StatusBadge } from "@/ui/components/StatusBadge/StatusBadge";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { NeedsSession } from "../../_shell/NeedsSession";
import { formatDateTime, formsText, submissionRecipient, submissionTitle } from "./format";
import s from "./Wnioski.module.css";

function FormCard({ f }: { f: FormSpec }) {
  const badge = f.disabledReason ? <StatusBadge tone="neutral" label="Jeszcze niedostępny" /> : f.status === "sent" ? <StatusBadge tone="positive" label={f.recipient === "employer" ? formsText.statusHanded : formsText.statusSent} /> : <StatusBadge tone="info" label={formsText.statusTodo} />;
  return (
    <Card as="li" compact linkCard heading={<TextLink href={`/wnioski/${f.slug}`}>{f.short}</TextLink>} headingLevel={3} aside={badge}>
      <p className={s.muted}>{f.disabledReason ?? f.about}</p>
      <p className={s.small}>
        Odbiorca: {recipientLabel[f.recipient]}
        {f.lastSubmission ? ` · ${f.recipient === "employer" ? "przekazano" : "wysłano"} ${formatDateTime(f.lastSubmission.createdAt)}` : ""}
      </p>
    </Card>
  );
}

export async function FormsContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const g = await loadGuidance(ctx);
  const leave = g.forms.filter((f) => f.category === "leave");
  const benefit = g.forms.filter((f) => f.category === "benefit");
  const other = g.forms.filter((f) => f.category === "other");
  const hasLeaveBlocks = (g.plan?.blocks ?? []).some((b) => b.parent === "claimant" && ["maternity", "maternityOnAdoption", "parental", "paternity", "supplementary"].includes(b.type));
  return (
    <div className={s.layout}>
      <section className={s.section} aria-labelledby="urlopy">
        <h2 id="urlopy">{formsText.leaveHeading}</h2>
        {leave.length ? (
          <ul className={s.grid}>
            {leave.map((f) => (
              <FormCard key={f.slug} f={f} />
            ))}
          </ul>
        ) : (
          <Notice tone="info" title="Nie składasz wniosków o urlop" hideToneWord>
            <p>{hasLeaveBlocks || benefit.length ? formsText.nonEmployee : "Na podstawie Twojej sytuacji nie ma teraz wniosków o urlop do złożenia."}</p>
          </Notice>
        )}
      </section>
      {benefit.length ? (
        <section className={s.section} aria-labelledby="zasilki">
          <h2 id="zasilki">{formsText.benefitHeading}</h2>
          <ul className={s.grid}>
            {benefit.map((f) => (
              <FormCard key={f.slug} f={f} />
            ))}
          </ul>
        </section>
      ) : null}
      <section className={s.section} aria-labelledby="inne">
        <h2 id="inne">{formsText.otherHeading}</h2>
        <ul className={s.grid}>
          {other.map((f) => (
            <FormCard key={f.slug} f={f} />
          ))}
        </ul>
      </section>
      <section className={s.section} aria-labelledby="wyslane" id="wyslane-lista">
        <h2 id="wyslane">{formsText.sentHeading}</h2>
        {g.submissions.length ? (
          <ul className={s.sentList}>
            {g.submissions.map((sub) => (
              <li key={sub.id}>
                <TextLink href={`/wnioski/wyslane/${sub.id}`} className={s.mono}>
                  {sub.id}
                </TextLink>
                <span>
                  {submissionTitle(sub, g.forms)} <span className={s.small}>→ {submissionRecipient(sub)}</span>
                </span>
                <span className={s.small}>{formatDateTime(sub.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.muted}>{formsText.noneSent}</p>
        )}
        <p className={s.small}>{formsText.simNote}</p>
      </section>
    </div>
  );
}
