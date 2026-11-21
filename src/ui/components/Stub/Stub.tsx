import type { ReactNode } from "react";
import { Notice } from "../Notice/Notice";
import { PageHeader } from "../PageHeader/PageHeader";

/** Placeholder used while a route is being built in a later phase. */
export function Stub({ title, lead, eyebrow, children }: { title: string; lead?: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} lead={lead} />
      <Notice tone="neutral" title="Ta część serwisu jest w przygotowaniu">
        {children ?? <p>Wkrótce pojawi się tu pełna treść.</p>}
      </Notice>
    </>
  );
}
