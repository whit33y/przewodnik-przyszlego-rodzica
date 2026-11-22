import { formsText, pueCopy } from "@/content/forms";
import type { Step } from "@/server/steps";
import { Button } from "@/ui/components/Button/Button";
import { Field, Select, TextArea } from "@/ui/components/Form/Form";
import s from "../Wnioski.module.css";

/** Simulated PUE/eZUS message — posts to the existing /api/v1/pue/queries endpoint. */
export function PueForm({ steps, error }: { steps: Step[]; error?: boolean }) {
  const refs = steps.filter((x) => x.state === "todo");
  return (
    <form method="post" action="/api/v1/pue/queries" className={s.layout}>
      <Field label="Temat">
        {({ id, describedBy }) => (
          <Select id={id} name="topic" aria-describedby={describedBy} defaultValue={pueCopy.topics[0]}>
            {pueCopy.topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Treść pytania" hint="Napisz, czego dotyczy sprawa. Nie podawaj numeru konta ani hasła." error={error ? "Wpisz treść pytania — co najmniej 5 znaków." : undefined}>
        {({ id, describedBy, invalid }) => <TextArea id={id} name="message" rows={6} required minLength={5} maxLength={2000} aria-describedby={describedBy} aria-invalid={invalid || undefined} />}
      </Field>
      <Field label="Dotyczy kroku" optional>
        {({ id, describedBy }) => (
          <Select id={id} name="ref" aria-describedby={describedBy} defaultValue="">
            <option value="">— nie wybieram —</option>
            {refs.map((x) => (
              <option key={x.id} value={x.title.slice(0, 120)}>
                {x.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p className={s.muted}>{pueCopy.answer}</p>
      <div className={s.actions}>
        <Button type="submit" icon="mail" uppercase={false}>
          {formsText.sendPue}
        </Button>
        <span className={s.small}>{formsText.simNote}</span>
      </div>
    </form>
  );
}
