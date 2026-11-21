import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "O serwisie" };

export default function Page() {
  return <Stub title="O serwisie" lead="Jak działa Przewodnik Rodzica, skąd bierze dane i czego nie robi." />;
}
