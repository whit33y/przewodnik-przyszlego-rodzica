import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { SituationContent } from "./SituationContent";

export const metadata: Metadata = { title: "Twoja sytuacja" };

export default function Page() {
  return (
    <>
      <PageHeader title="Twoja sytuacja" lead="To wiemy z rejestrów. Sprawdź, czy wszystko się zgadza — każdą wartość możesz poprawić." />
      <Suspense fallback={<CardSkeleton count={4} />}>
        <SituationContent />
      </Suspense>
    </>
  );
}
