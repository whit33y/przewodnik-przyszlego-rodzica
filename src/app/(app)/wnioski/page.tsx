import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Wnioski" };

export default function Page() {
  return <Stub title="Wnioski" lead="Wnioski o urlopy i zasiłki wypełnione Twoimi danymi." />;
}
