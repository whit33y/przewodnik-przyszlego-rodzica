import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { adminConfigured, isAdmin } from "@/server/admin-auth";
import { Notice } from "@/ui/components/Notice/Notice";
import { PageHeader } from "@/ui/components/PageHeader/PageHeader";
import { Skeleton } from "@/ui/components/Skeleton/Skeleton";
import { AdminLoginForm } from "../_components/AdminLoginForm";

export const metadata: Metadata = { title: "Logowanie" };

async function LoginGate() {
  await connection(); // the password is runtime configuration, never baked into the prerendered shell
  if (!adminConfigured()) {
    return (
      <Notice tone="neutral" title="Panel administracyjny jest wyłączony" hideToneWord>
        <p>Na tym serwerze nie ustawiono hasła administratora (zmienna środowiskowa ADMIN_PASSWORD), więc panel nie przyjmuje logowań. Kalkulator działa na opublikowanych parametrach ustawowych.</p>
      </Notice>
    );
  }
  if (await isAdmin()) redirect("/admin");
  return <AdminLoginForm />;
}

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Dla pracowników ZUS"
        title="Logowanie do panelu administracyjnego"
        lead="Panel służy do zmiany parametrów prawnych kalkulatora — stawek, wymiarów urlopów i kwot — po zmianie przepisów, bez wdrażania nowej wersji aplikacji."
      />
      <Suspense fallback={<Skeleton lines={2} />}>
        <LoginGate />
      </Suspense>
    </>
  );
}
