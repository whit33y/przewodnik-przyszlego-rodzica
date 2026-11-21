import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Zgoda na pobranie danych" };

export default function Page() {
  return <Stub title="Zgoda na pobranie danych" lead="Wskaż, z jakich rejestrów możemy pobrać Twoje dane." />;
}
