import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Pobieramy Twoje dane" };

export default function Page() {
  return <Stub title="Pobieramy Twoje dane" lead="Łączymy się z rejestrami (symulacja)." />;
}
