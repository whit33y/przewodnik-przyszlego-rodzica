import type { Metadata } from "next";
import { Stub } from "@/ui/components/Stub/Stub";

export const metadata: Metadata = { title: "Plan rodzicielski" };

export default function Page() {
  return <Stub title="Plan rodzicielski" lead="Urlopy obojga rodziców na jednej osi czasu, z kwotą zasiłku." />;
}
