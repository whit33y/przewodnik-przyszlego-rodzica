"use client";

import { useState } from "react";
import { Button } from "@/ui/components/Button/Button";

export function PrintButton({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <Button type="button" variant={primary ? "primary" : "secondary"} icon="printer" uppercase={false} onClick={() => window.print()}>
      {label}
    </Button>
  );
}

/** Copies one value; the result is announced through a polite live region. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  }
  return (
    <>
      <Button type="button" variant="text" size="sm" icon={done ? "check" : "document"} uppercase={false} onClick={copy} aria-label={`Kopiuj: ${label}`}>
        {done ? "Skopiowano" : "Kopiuj"}
      </Button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {done ? `Skopiowano: ${label}` : ""}
      </span>
    </>
  );
}
