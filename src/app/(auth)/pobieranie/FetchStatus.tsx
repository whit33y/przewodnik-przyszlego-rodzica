"use client";

import { useEffect, useState } from "react";
import { Button } from "@/ui/components/Button/Button";
import { Notice } from "@/ui/components/Notice/Notice";
import { Icon } from "@/ui/icons/Icon";
import type { SourceStatus } from "@/server/context";
import s from "./Fetch.module.css";

const stateText = { pending: "pobieramy…", ok: "pobrano", unavailable: "nie odpowiada", skipped: "pominięto (brak zgody)", notStarted: "czeka" } as const;

export function FetchStatus({ initial }: { initial: SourceStatus[] }) {
  const [sources, setSources] = useState(initial);
  const [retrying, setRetrying] = useState<string | null>(null);
  const active = sources.filter((x) => x.state !== "skipped");
  const done = active.every((x) => x.state === "ok" || x.state === "unavailable");
  const okCount = active.filter((x) => x.state === "ok").length;

  useEffect(() => {
    if (done) return;
    let inFlight = false;
    let cancelled = false;
    const t = setInterval(async () => {
      if (inFlight) return; // skip a tick while the previous request is pending
      inFlight = true;
      try {
        const res = await fetch("/api/v1/integrations/status", { cache: "no-store" });
        if (res.ok && !cancelled) setSources(((await res.json()) as { sources: SourceStatus[] }).sources);
      } catch {
        // transient network error: the next tick retries
      } finally {
        inFlight = false;
      }
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [done]);

  async function retry(source: string) {
    setRetrying(source);
    await fetch("/api/v1/integrations/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
    setSources((list) => list.map((x) => (x.source === source ? { ...x, state: "pending" } : x)));
    setRetrying(null);
  }

  const failed = sources.filter((x) => x.state === "unavailable");
  return (
    <div className={s.wrap}>
      <p role="status" className={s.summary}>
        {done ? `Gotowe. Pobrano dane z ${okCount} z ${active.length} rejestrów.` : `Pobrano ${okCount} z ${active.length}…`}
      </p>
      <ul className={s.list}>
        {sources.map((x) => (
          <li key={x.source} className={s.row} data-state={x.state}>
            <span className={s.icon} aria-hidden="true">
              {x.state === "ok" ? <Icon name="check-circle" /> : x.state === "unavailable" ? <Icon name="alert" /> : x.state === "pending" ? <span className={s.spinner} /> : <Icon name="minus-circle" />}
            </span>
            <span className={s.name}>{x.label}</span>
            <span className={s.state}>{stateText[x.state]}</span>
          </li>
        ))}
      </ul>
      {failed.map((x) => (
        <Notice
          key={x.source}
          tone="caution"
          title={`Rejestr „${x.label}” nie odpowiada`}
          actions={
            <Button size="sm" variant="secondary" icon="refresh" loading={retrying === x.source} onClick={() => retry(x.source)}>
              Spróbuj ponownie
            </Button>
          }
        >
          <p>Możesz spróbować ponownie albo przejść dalej — o brakujące informacje zapytamy Cię na następnym ekranie.</p>
        </Notice>
      ))}
      <div className={s.actions}>
        <Button href="/sytuacja" iconAfter="chevron-right" aria-disabled={!done} onClick={(e) => (!done ? e.preventDefault() : undefined)}>
          Dalej
        </Button>
      </div>
    </div>
  );
}
