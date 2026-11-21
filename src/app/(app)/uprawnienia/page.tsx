import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Twoje uprawnienia" };

export default function Page() {
  return <Stub title="Twoje uprawnienia" lead="Co Ci przysługuje w ciąży i po urodzeniu dziecka." />;
}
