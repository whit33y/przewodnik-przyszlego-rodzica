import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Planuję dziecko" };

export default function Page() {
  return <Stub title="Planuję dziecko" lead="Co zabezpieczyć z wyprzedzeniem, żeby zasiłek macierzyński był pewny." />;
}
