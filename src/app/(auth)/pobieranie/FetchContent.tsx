import { loadContext } from "@/server/context";
import { NeedsSession } from "../../_shell/NeedsSession";
import { FetchStatus } from "./FetchStatus";

export async function FetchContent() {
  const ctx = await loadContext();
  if (!ctx) return <NeedsSession />;
  return <FetchStatus initial={ctx.statuses} />;
}
