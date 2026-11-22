import type { Metadata } from "next";
import { Suspense } from "react";
import { allFormSlugs, formsText } from "@/content/forms";
import { CardSkeleton } from "@/ui/components/Skeleton/Skeleton";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import { FormContent } from "./FormContent";
import s from "../Wnioski.module.css";

export const metadata: Metadata = { title: "Wniosek" };

export async function generateStaticParams() {
  return allFormSlugs().map((kind) => ({ kind }));
}

/** Static back link; the pre-filled form streams (it reads the session and the route param). */
export default function Page({ params, searchParams }: PageProps<"/wnioski/[kind]">) {
  return (
    <>
      <p className={`${s.back} ${s.noPrint}`}>
        <TextLink href="/wnioski">{formsText.back}</TextLink>
      </p>
      <Suspense fallback={<CardSkeleton count={1} lines={8} />}>
        <FormContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
