import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { ConsentContent } from "./ConsentContent";

export const metadata: Metadata = { title: "Zgoda na pobranie danych" };

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Krok 2 z 3"
        title="Skąd pobierzemy Twoje dane"
        lead="Zaznacz rejestry, z których możemy pobrać informacje. Każdą zgodę możesz pominąć — wtedy zapytamy Cię o te dane."
      />
      <Suspense fallback={<CardSkeleton count={3} lines={2} />}>
        <ConsentContent />
      </Suspense>
    </>
  );
}
