import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Co i kiedy" };

export default function Page() {
  return <Stub title="Co i kiedy" lead="Dokumenty, terminy i miejsce złożenia — krok po kroku." />;
}
