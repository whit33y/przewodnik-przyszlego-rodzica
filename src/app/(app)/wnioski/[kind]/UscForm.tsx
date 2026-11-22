import { formsText, uscCopy } from "@/content/forms";
import { formatDateShort, formatMoney } from "@/lib/format";
import type { FormSpec, GuidanceInput } from "@/server/forms";
import { Button } from "@/ui/components/Button/Button";
import { DataList, DataRow } from "@/ui/components/DataRow/DataRow";
import { ChoiceGroup, Field, Select } from "@/ui/components/Form/Form";
import { Notice } from "@/ui/components/Notice/Notice";
import { SourceBadge } from "@/ui/components/SourceBadge/SourceBadge";
import s from "../Wnioski.module.css";

/** Request for a copy of the birth certificate — enabled once the birth is in the civil-status registry. */
export function UscForm({ spec, input }: { spec: FormSpec; input: GuidanceInput }) {
  const disabled = Boolean(spec.disabledReason);
  const ev = input.facts.event;
  return (
    <div className={s.layout}>
      <Notice tone="info" title={uscCopy.zusNote} hideToneWord />
      {disabled ? (
        <Notice tone="neutral" title="Jeszcze nie teraz" hideToneWord>
          <p>{spec.disabledReason}</p>
        </Notice>
      ) : null}
      <DataList label="Dane do wniosku">
        <DataRow label={formsText.applicant} value={input.displayName ?? formsText.emptyValue} source={input.displayName ? <SourceBadge source="mobywatel" /> : undefined} />
        {ev.kind === "birth" && ev.date ? <DataRow label="Data urodzenia dziecka" value={formatDateShort(ev.date)} source={<SourceBadge source="rsc" />} /> : null}
        {ev.kind === "birth" && ev.children.length > 1 ? <DataRow label="Liczba dzieci" value={String(ev.children.length)} source={<SourceBadge source="rsc" />} /> : null}
      </DataList>
      <form method="post" action="/api/v1/submissions" className={s.layout}>
        <input type="hidden" name="kind" value={spec.slug} />
        <fieldset disabled={disabled} className={s.statements} style={{ gap: 24 }}>
          <legend className="visually-hidden">Wniosek o odpis</legend>
          <ChoiceGroup
            legend="Rodzaj odpisu"
            name="type"
            defaultValue="skrocony"
            options={uscCopy.types.map((t) => ({ value: t.value, label: `${t.label} — ${formatMoney(t.feeGrosze)}`, hint: t.hint }))}
            hint={uscCopy.feeNote}
          />
          <Field label="Cel">
            {({ id, describedBy }) => (
              <Select id={id} name="purpose" aria-describedby={describedBy} defaultValue="pracodawca">
                {uscCopy.purposes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <ChoiceGroup legend="Sposób odbioru" name="delivery" defaultValue="e-doreczenia" options={uscCopy.delivery.map((d) => ({ value: d.value, label: d.label, hint: d.hint }))} />
          <Field label="Liczba egzemplarzy">
            {({ id, describedBy }) => (
              <Select id={id} name="copies" aria-describedby={describedBy} defaultValue="1">
                {[1, 2, 3].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className={s.actions}>
            <Button type="submit" icon="mail" uppercase={false}>
              {formsText.sendUsc}
            </Button>
            <span className={s.small}>{formsText.simNote}</span>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
