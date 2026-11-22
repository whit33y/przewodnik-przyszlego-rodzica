import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { caseIds } from "@/server/cases-repo";
import { readCaseInput } from "@/server/persona-store";
import { Button } from "@/ui/components/Button/Button";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { CompareContent } from "./CompareContent";
import s from "./Case.module.css";

export async function generateStaticParams() {
  const ids = caseIds();
  return ids.length ? ids.map((id) => ({ id })) : [{ id: "B0-00" }];
}

export async function generateMetadata({ params }: PageProps<"/sprawy/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Sprawa ${id}` };
}

export default async function Page({ params }: PageProps<"/sprawy/[id]">) {
  const { id } = await params;
  const c = readCaseInput(id);
  if (!c) notFound();
  return (
    <>
      <p>
        <TextLink href="/sprawy">← Wszystkie sprawy</TextLink>
      </p>
      <PageHeader eyebrow={`Sprawa ${c.id}`} title={c.title}>
        <ul className={s.tags} aria-label="Cechy sprawy">
          {c.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </PageHeader>
      <form action="/api/v1/auth/login/confirm" method="post" className={s.loginAs}>
        <input type="hidden" name="mode" value="case" />
        <input type="hidden" name="caseId" value={c.id} />
        <div>
          <strong>Zobacz tę sprawę oczami rodzica</strong>
          <p className={s.muted}>Zaloguj się jako osoba z tej sprawy: dane z akt pokażemy tak, jakby pobrał je system z rejestrów.</p>
        </div>
        <Button type="submit" variant="secondary" icon="user">
          Zaloguj jako ta osoba
        </Button>
      </form>
      <Suspense fallback={<CardSkeleton count={2} lines={4} />}>
        <CompareContent id={c.id} />
      </Suspense>
    </>
  );
}
