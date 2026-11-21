"use client";

import * as A from "@radix-ui/react-accordion";
import type { ReactNode } from "react";
import { Icon } from "@/ui/icons/Icon";
import s from "./Accordion.module.css";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export function Accordion({ items, defaultOpen, headingLevel = 3 }: { items: AccordionItem[]; defaultOpen?: string[]; headingLevel?: 2 | 3 | 4 }) {
  const H = `h${headingLevel}` as "h3";
  return (
    <A.Root type="multiple" defaultValue={defaultOpen} className={s.root}>
      {items.map((it) => (
        <A.Item key={it.id} value={it.id} className={s.item}>
          <A.Header asChild>
            <H className={s.header}>
              <A.Trigger className={s.trigger}>
                <span>{it.title}</span>
                <Icon name="chevron-down" size={20} />
              </A.Trigger>
            </H>
          </A.Header>
          <A.Content className={s.content}>{it.content}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
