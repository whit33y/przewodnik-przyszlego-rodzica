"use client";

import * as T from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import s from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({ items, label, defaultValue, value, onValueChange }: { items: TabItem[]; label: string; defaultValue?: string; value?: string; onValueChange?: (v: string) => void }) {
  return (
    <T.Root defaultValue={defaultValue ?? items[0]?.id} value={value} onValueChange={onValueChange}>
      <T.List className={s.list} aria-label={label}>
        {items.map((it) => (
          <T.Trigger key={it.id} value={it.id} className={s.trigger}>
            {it.label}
          </T.Trigger>
        ))}
      </T.List>
      {items.map((it) => (
        <T.Content key={it.id} value={it.id} className={s.panel}>
          {it.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
