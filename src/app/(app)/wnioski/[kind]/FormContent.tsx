import { formsText } from "@/content/forms";
import { loadContext } from "@/server/context";
import { buildLeaveDoc, buildSheet, findForm, type FormSpec } from "@/server/forms";
import { loadGuidance } from "@/server/guidance";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { NeedsSession } from "../../../_shell/NeedsSession";
import { formatDateTime } from "../format";
import { LeaveForm } from "./LeaveForm";
import { PueForm } from "./PueForm";
import { SheetView } from "./SheetView";
import { UscForm } from "./UscForm";
import s from "../Wnioski.module.css";

function SentNotice({ spec }: { spec: FormSpec }) {
  if (!spec.lastSubmission) return null;
  return (
    <div className={s.noPrint}>
      <Notice tone="positive" title={`Wysłano ${formatDateTime(spec.lastSubmission.createdAt)} — nr ${spec.lastSubmission.id}`} hideToneWord>
        <p>{formsText.simNote} Jeśli coś zmienisz, możesz wysłać wniosek ponownie.</p>
      </Notice>
    </div>
  );
}

export async function FormContent({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ kind }, sp] = await Promise.all([params, searchParams]);
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const g = await loadGuidance(ctx);
  const spec = findForm(g.forms, kind);
  if (!spec) {
    return (
      <>
        <PageHeader title={formsText.notApplicable} />
        <Notice tone="neutral" title={formsText.notApplicable} hideToneWord actions={<Button href="/wnioski" variant="secondary">Lista wniosków</Button>}>
          <p>{formsText.notApplicableBody}</p>
        </Notice>
      </>
    );
  }
  if (spec.category === "leave") {
    const doc = buildLeaveDoc(spec, g.input);
    if (!doc) return <Notice tone="caution" title="Nie możemy teraz przygotować wniosku" />;
    return (
      <>
        <div className={s.noPrint}>
          <PageHeader title={spec.title} lead={formsText.previewNote} />
        </div>
        <SentNotice spec={spec} />
        <LeaveForm doc={doc} />
      </>
    );
  }
  if (spec.category === "benefit") {
    const sheet = buildSheet(spec, g.input);
    if (!sheet) return <Notice tone="caution" title="Nie możemy teraz przygotować danych" />;
    return (
      <>
        <PageHeader title={sheet.title} lead={sheet.intro} />
        <SentNotice spec={spec} />
        <SheetView sheet={sheet} />
      </>
    );
  }
  if (spec.kind === "usc-birth") {
    return (
      <>
        <PageHeader title={spec.title} lead={spec.about} />
        <SentNotice spec={spec} />
        <UscForm spec={spec} input={g.input} />
      </>
    );
  }
  return (
    <>
      <PageHeader title={spec.title} lead={spec.about} />
      <PueForm steps={g.steps} error={sp.blad === "tresc"} />
    </>
  );
}
