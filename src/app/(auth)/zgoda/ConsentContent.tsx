import { redirect } from "next/navigation";
import { SOURCES } from "@/integrations/sources";
import { loadContext } from "@/server/context";
import { NeedsSession } from "../../_shell/NeedsSession";
import { ConsentForm } from "./ConsentForm";

export async function ConsentContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  if (ctx.state.mode !== "mobywatel") redirect("/sytuacja");
  return <ConsentForm sources={SOURCES.map(({ id, label, reads, purpose, required }) => ({ id, label, reads, purpose, required }))} granted={ctx.state.consents} />;
}
