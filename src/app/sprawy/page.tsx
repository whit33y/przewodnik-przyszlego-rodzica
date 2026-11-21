import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Przykładowe sprawy ZUS" };

export default function Page() {
  return <Stub title="Przykładowe sprawy ZUS" lead="Wybierz lub wgraj sprawę i porównaj wynik z decyzją ZUS." />;
}
