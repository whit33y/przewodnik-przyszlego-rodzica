"use client";

import type { ReactNode } from "react";
import { Button } from "@/ui/components/Button/Button";
import { Dialog } from "@/ui/components/Dialog/Dialog";

export function TraceDialog({ title, children, label = "Dlaczego?" }: { title: string; children: ReactNode; label?: string }) {
  return (
    <Dialog
      title={title}
      description="Każdy krok wyliczenia z podstawą prawną i parametrem, którego użyliśmy."
      trigger={
        <Button variant="text" size="sm" icon="help">
          {label}
          <span className="visually-hidden"> — {title}</span>
        </Button>
      }
    >
      {children}
    </Dialog>
  );
}
