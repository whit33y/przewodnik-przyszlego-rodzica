import type { Metadata } from "next";
import { Suspense } from "react";
import { formsText, pueCopy } from "@/content/forms";
import { loadContext } from "@/server/context";
import { loadGuidance } from "@/server/guidance";
import { getSubmission } from "@/server/submissions-repo";
import { Button } from "@/ui/components/Button/Button";
import { DataList, DataRow } from "@/ui/components/DataRow/DataRow";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { NeedsSession } from "../../../../_shell/NeedsSession";
import { formatDateTime, submissionRecipient, submissionTitle } from "../../format";
import s from "../../Wnioski.module.css";

export const metadata: Metadata = { title: "Potwierdzenie wysłania" };

/** Confirmation numbers are random; one placeholder lets the build validate the static shell. */
export async function generateStaticParams() {
  return [{ id: "ZUS-0000-000000" }];
}

async function Confirmation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  const sub = getSubmission(ctx.state.sid, id);
  if (!sub) {
    return (
      <Notice tone="neutral" title="Nie znaleźliśmy tego potwierdzenia" hideToneWord actions={<Button href="/wnioski" variant="secondary">Lista wniosków</Button>}>
        <p>Potwierdzenia są widoczne tylko w sesji, w której wysłano wniosek.</p>
      </Notice>
    );
  }
  const g = await loadGuidance(ctx);
  return (
    <div className={s.layout}>
      <Notice tone="positive" role="status" headingLevel={2} hideToneWord title={formsText.confirmTitle}>
        <p>
          <strong>{formsText.simNote}</strong>
        </p>
        {sub.kind === "pue-query" ? <p>{pueCopy.answer}</p> : null}
      </Notice>
      <DataList label="Potwierdzenie">
        <DataRow label={formsText.confirmNumber} value={<span className={s.mono}>{sub.id}</span>} />
        <DataRow label={formsText.confirmWhat} value={submissionTitle(sub, g.forms)} />
        <DataRow label={formsText.confirmTo} value={submissionRecipient(sub)} />
        <DataRow label={formsText.confirmAt} value={formatDateTime(sub.createdAt)} />
      </DataList>
      <div className={s.actions}>
        <Button href="/kroki" variant="secondary" uppercase={false}>
          {formsText.backSteps}
        </Button>
        <Button href="/wnioski" variant="text" uppercase={false}>
          {formsText.back}
        </Button>
      </div>
    </div>
  );
}

export default function Page({ params }: PageProps<"/wnioski/wyslane/[id]">) {
  return (
    <>
      <PageHeader title="Potwierdzenie wysłania" />
      <Suspense fallback={<CardSkeleton count={1} lines={4} />}>
        <Confirmation params={params} />
      </Suspense>
    </>
  );
}
