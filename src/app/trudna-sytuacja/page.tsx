import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Trudna sytuacja" };

export default function Page() {
  return <Stub title="Trudna sytuacja" lead="Informacje i wsparcie, gdy ciąża lub poród nie przebiegają tak, jak planowaliście." />;
}
