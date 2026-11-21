import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { Skeleton } from "@/ui/components/Skeleton/Skeleton";
import { FetchContent } from "./FetchContent";

export const metadata: Metadata = { title: "Pobieramy Twoje dane" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Krok 3 z 3" title="Pobieramy Twoje dane" lead="Łączymy się z rejestrami, na które się zgodziłaś lub zgodziłeś. To potrwa kilka sekund." />
      <Suspense fallback={<Skeleton lines={6} />}>
        <FetchContent />
      </Suspense>
    </>
  );
}
