import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Panel administracyjny" };

export default function Page() {
  return <Stub title="Panel administracyjny" lead="Parametry prawne kalkulatora: stawki, wymiary, kwoty." />;
}
