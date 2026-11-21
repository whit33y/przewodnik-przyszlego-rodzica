"use client";

import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PageHeader title="Coś poszło nie tak" />
      <Notice tone="caution" title="To nie jest informacja o Twoich uprawnieniach" role="alert">
        <p>Wystąpił błąd techniczny po naszej stronie. Spróbuj ponownie za chwilę.</p>
      </Notice>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button onClick={reset} icon="refresh">
          Spróbuj ponownie
        </Button>
        <Button href="/" variant="secondary">
          Strona główna
        </Button>
      </div>
    </>
  );
}
