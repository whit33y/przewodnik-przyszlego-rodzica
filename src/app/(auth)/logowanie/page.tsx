import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Logowanie" };

export default function Page() {
  return <Stub title="Logowanie" lead="Zaloguj się przez login.gov.pl (symulacja)." />;
}
