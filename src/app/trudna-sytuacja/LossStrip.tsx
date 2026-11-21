import type { Facts } from "@/engine/types";
import { lossPage, stripSentence } from "@/content/loss";
import { ratePct } from "@/content/pl";
import { formatDateLong, formatDuration } from "@/lib/format";
import { loadContext } from "@/server/context";
import { evaluateFacts } from "@/server/engine-facade";
import { TextLink } from "@/ui/components/TextLink/TextLink";
import s from "./Loss.module.css";

/** Stillbirth, or every child of the birth has died. */
function lossKind(f: Facts): "martwe-urodzenie" | "smierc-dziecka" | null {
  if (f.event.kind !== "birth" || f.event.children.length === 0) return null;
  const all = f.event.children;
  if (!all.every((c) => c.bornAlive === false || Boolean(c.deathDate))) return null;
  return all.some((c) => c.bornAlive === false) ? "martwe-urodzenie" : "smierc-dziecka";
}

/**
 * Personalised line on top of the quiet path. Streams behind its own <Suspense>; renders nothing
 * without a simulated session or when the session shows no loss.
 */
export async function LossStrip() {
  const ctx = await loadContext();
  if (!ctx) return null;
  const facts = ctx.assembled.facts;
  const kind = lossKind(facts);
  if (!kind) return null;
  const { result } = await evaluateFacts(facts, null);
  if (!result) return null;
  const mat = result.entitlements.find((e) => e.benefit === "maternity");
  const end = result.periods.filter((p) => p.type === "maternity" && p.status !== "refused").map((p) => p.to).sort().pop();
  const granted = mat && (mat.status === "granted" || mat.status === "partial") && mat.maxDays;
  return (
    <aside className={s.strip} aria-labelledby="strip-title" data-testid="loss-strip">
      <h2 id="strip-title" className={s.stripTitle}>
        {lossPage.stripTitle}
      </h2>
      <p>{granted ? stripSentence(formatDuration(mat.maxDays!), mat.rateBps ? ratePct(mat.rateBps) : null, end ? formatDateLong(end) : null) : lossPage.stripNotGranted}</p>
      <p className={s.muted}>
        <TextLink href={`#${kind}`}>{lossPage.stripSection}</TextLink> · <TextLink href="/uprawnienia">{lossPage.stripMore}</TextLink>
      </p>
    </aside>
  );
}
