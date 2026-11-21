import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Twoja sytuacja" };

export default function Page() {
  return <Stub title="Twoja sytuacja" lead="Dane pobrane z rejestrów i to, o co musimy zapytać." />;
}
