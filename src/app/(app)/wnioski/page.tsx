import type { Metadata } from "next";
import { Suspense } from "react";
import { formsText } from "@/content/forms";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { FormsContent } from "./FormsContent";

export const metadata: Metadata = { title: "Wnioski" };

export default function Page() {
  return (
    <>
      <PageHeader title="Wnioski" lead={formsText.lead} />
      <Suspense fallback={<CardSkeleton count={3} lines={2} />}>
        <FormsContent />
      </Suspense>
    </>
  );
}
