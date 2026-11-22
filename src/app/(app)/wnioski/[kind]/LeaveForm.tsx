import { formsText } from "@/content/forms";
import { formatDateShort } from "@/lib/format";
import type { LeaveDoc, SourceRef } from "@/server/forms";
import { Button } from "@/ui/components/Button/Button";
import { sourceLabel } from "@/ui/components/SourceBadge/SourceBadge";
import { PrintButton } from "../client";
import s from "../Wnioski.module.css";

/** On-screen provenance; hidden in print. */
export function Provenance({ source }: { source?: SourceRef }) {
  if (!source) return null;
  return (
    <span className={s.badge}>
      <span className="visually-hidden">Źródło: </span>
      {source === "plan" ? formsText.fromPlan : sourceLabel[source]}
    </span>
  );
}

/** One renderer for every leave application: header, addressee, title, legal basis, body, statements, attachments, signature. */
export function LeaveForm({ doc }: { doc: LeaveDoc }) {
  return (
    <form method="post" action="/api/v1/submissions" className={s.layout}>
      <input type="hidden" name="kind" value={doc.slug} />
      <article className={s.doc} aria-labelledby="doc-title">
        <div className={s.docTop}>
          <div className={s.party}>
            <span className={s.lbl}>{formsText.applicant}</span>
            {doc.applicant.name ? (
              <span className={s.val}>
                {doc.applicant.name} <Provenance source={doc.applicant.source} />
              </span>
            ) : (
              <input className={s.input} name="f.applicant" aria-label={formsText.applicant} autoComplete="name" />
            )}
          </div>
          <div className={s.inline}>
            <label>
              {formsText.place}
              <input className={`${s.input} ${s.short}`} name="f.place" autoComplete="address-level2" />
            </label>
            <label>
              {formsText.date}
              <input className={`${s.input} ${s.short}`} name="f.date" defaultValue={formatDateShort(doc.today)} inputMode="numeric" />
            </label>
          </div>
        </div>
        <div className={s.addressee}>
          <label>
            {formsText.employer}
            <textarea className={s.input} name="f.employer" rows={2} />
          </label>
        </div>
        <h2 id="doc-title" className={s.docTitle}>
          {doc.heading}
        </h2>
        <p className={s.legal}>Na podstawie: {doc.legal}</p>
        {doc.request.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {doc.fields.length ? (
          <dl className={s.fields}>
            {doc.fields.map((f) => (
              <div key={f.id}>
                <dt>{f.editable ? <label htmlFor={`f-${f.id}`}>{f.label}</label> : f.label}</dt>
                <dd>
                  {f.editable ? (
                    <input id={`f-${f.id}`} className={s.input} name={`f.${f.id}`} defaultValue={f.value ?? ""} />
                  ) : (
                    <>
                      <span>{f.value}</span> <Provenance source={f.source} />
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {doc.statements.length ? (
          <fieldset className={s.statements}>
            <legend>Oświadczenia</legend>
            {doc.statements.map((st) => (
              <label key={st.id} className={s.check}>
                <input type="checkbox" name={`s.${st.id}`} value="tak" defaultChecked={st.checked} />
                <span>{st.text}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {doc.attachments.length ? (
          <div>
            <h3>Załączniki</h3>
            <ol className={s.attachments}>
              {doc.attachments.map((a) => (
                <li key={a.text}>
                  {a.text}
                  {a.note ? <span className={s.note}> — {a.note}</span> : null}
                </li>
              ))}
            </ol>
            <p className={s.note}>{formsText.personalFile}</p>
          </div>
        ) : null}
        <div className={s.signature} aria-hidden="true">
          <span />
          <span className={s.note}>{formsText.signature}</span>
        </div>
      </article>
      <p className={`${s.small} ${s.noPrint}`}>{formsText.employerNote}</p>
      <div className={`${s.actions} ${s.noPrint}`}>
        <PrintButton label={formsText.print} primary />
        <Button type="submit" variant="secondary" icon="check" uppercase={false}>
          {formsText.sendEmployer}
        </Button>
      </div>
    </form>
  );
}
