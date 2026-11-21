import type { Metadata } from "next";
import { Suspense } from "react";
import { listCases } from "@/server/cases-repo";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { CaseBrowser } from "./CaseBrowser";
import { Scoreboard } from "./Scoreboard";

export const metadata: Metadata = { title: "Przykładowe sprawy ZUS" };

export default async function Page() {
  const cases = await listCases();
  return (
    <>
      <PageHeader
        eyebrow="Dla jury i testujących"
        title="Przykładowe sprawy ZUS"
        lead="Wybierz albo wgraj jedną z przykładowych spraw. Policzymy ją naszym silnikiem i porównamy wynik z rozstrzygnięciem ZUS — pole po polu."
      />
      <Suspense fallback={<CardSkeleton count={1} lines={2} />}>
        <Scoreboard total={cases.length} />
      </Suspense>
      <CaseBrowser cases={cases} />
    </>
  );
}
