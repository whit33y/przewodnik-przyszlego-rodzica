import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { PlanContent } from "./PlanContent";

export const metadata: Metadata = { title: "Plan rodzicielski" };

export default function Page() {
  return (
    <>
      <PageHeader title="Plan rodzicielski" lead="Ułóż urlopy obojga rodziców. Daty, wymiar i kwota zasiłku przeliczają się od razu, zgodnie z przepisami." />
      <Suspense fallback={<CardSkeleton count={3} lines={4} />}>
        <PlanContent />
      </Suspense>
    </>
  );
}
