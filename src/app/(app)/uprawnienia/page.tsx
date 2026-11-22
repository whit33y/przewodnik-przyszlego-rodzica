import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { EntitlementsContent } from "./EntitlementsContent";

export const metadata: Metadata = { title: "Twoje uprawnienia" };

export default function Page() {
  return (
    <>
      <PageHeader title="Twoje uprawnienia" lead="Co Ci przysługuje w ciąży i po urodzeniu dziecka — na podstawie danych z rejestrów i Twoich odpowiedzi." />
      <Suspense fallback={<CardSkeleton count={3} />}>
        <EntitlementsContent />
      </Suspense>
    </>
  );
}
