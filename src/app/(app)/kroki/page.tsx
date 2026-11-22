import type { Metadata } from "next";
import { Suspense } from "react";
import { guideSections, stepsText } from "@/content/steps";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { StepsContent } from "./StepsContent";
import s from "./Kroki.module.css";

export const metadata: Metadata = { title: "Co i kiedy" };

/** Static header and guide (prerendered, the targets of /kroki#… fix links); the checklist streams. */
export default function Page() {
  return (
    <>
      <PageHeader title="Co i kiedy" lead={stepsText.lead} />
      <Suspense fallback={<CardSkeleton count={3} lines={3} />}>
        <StepsContent />
      </Suspense>
      <section className={s.guide} aria-labelledby="poradnik">
        <h2 id="poradnik">Jak to załatwić — poradnik</h2>
        <p className={s.guideLead}>Krótkie odpowiedzi na sprawy, które najczęściej opóźniają wypłatę zasiłku.</p>
        {guideSections.map((g) => (
          <section key={g.id} id={g.id} className={s.guideItem} aria-labelledby={`${g.id}-h`} tabIndex={-1}>
            <h3 id={`${g.id}-h`}>{g.title}</h3>
            <p>{g.intro}</p>
            <ul>
              {g.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </>
  );
}
