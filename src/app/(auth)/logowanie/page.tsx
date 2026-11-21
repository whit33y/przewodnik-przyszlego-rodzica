import type { Metadata } from "next";
import { getPersonaList } from "@/server/personas-list";
import { LoginFlow } from "./LoginFlow";

export const metadata: Metadata = { title: "Logowanie (symulacja)" };

export default async function Page() {
  const personas = await getPersonaList();
  return <LoginFlow personas={personas} />;
}
