import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { PlanningContent } from "./PlanningContent";
import s from "./Planning.module.css";

export const metadata: Metadata = { title: "Planuję dziecko" };

export default function Page({ searchParams }: PageProps<"/planuje-dziecko">) {
  return (
    <>
      <PageHeader
        eyebrow="Zanim zajdziesz w ciążę"
        title="Planuję dziecko"
        lead="Sprawdź teraz, czy zasiłek macierzyński będzie pewny — a jeśli coś stoi na przeszkodzie, napraw to, póki jest czas."
      />
      <div className={s.layout}>
        <section className={s.section} aria-labelledby="dlaczego">
          <h2 id="dlaczego">Dlaczego warto sprawdzić wcześniej</h2>
          <p>
            Przejrzeliśmy przykładowe sprawy ZUS, w których odmówiono zasiłku. W każdej z nich przyczynę było widać w danych na długo przed porodem — wystarczyło
            wiedzieć, gdzie patrzeć. Najczęściej to jedna z czterech rzeczy:
          </p>
          <ul className={s.why}>
            <li>
              <strong>Brak dobrowolnego chorobowego</strong>
              <span className={s.small}>przy umowie zlecenia lub własnej firmie</span>
            </li>
            <li>
              <strong>Zaległość w składkach</strong>
              <span className={s.small}>nawet niewielka, jeśli trwa w dniu porodu</span>
            </li>
            <li>
              <strong>Zawieszona działalność</strong>
              <span className={s.small}>w czasie zawieszenia nie ma ubezpieczenia</span>
            </li>
            <li>
              <strong>Umowa kończy się przed porodem</strong>
              <span className={s.small}>i nie przedłuża się z mocy prawa</span>
            </li>
          </ul>
          <p className={s.muted}>Liczymy tym samym silnikiem co resztę serwisu, na hipotetyczny termin porodu. Wynik ma charakter informacyjny i nie jest decyzją ZUS.</p>
        </section>
        <Suspense fallback={<CardSkeleton count={2} lines={4} />}>
          <PlanningContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
