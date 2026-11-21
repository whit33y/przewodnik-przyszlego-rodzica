"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Icon } from "@/ui/icons/Icon";
import s from "./Dialog.module.css";

export interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  children: ReactNode;
}

/** Bottom sheet on mobile, centred dialog on desktop. Focus is trapped and restored by Radix. */
export function Dialog({ title, description, open, onOpenChange, trigger, children }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className={s.overlay} />
        <D.Content className={s.content} {...(description ? {} : { "aria-describedby": undefined })}>
          <div className={s.head}>
            <div>
              <D.Title className={s.title}>{title}</D.Title>
              {description ? <D.Description className={s.desc}>{description}</D.Description> : null}
            </div>
            <D.Close className={s.close} aria-label="Zamknij">
              <Icon name="close" />
            </D.Close>
          </div>
          <div className={s.body} tabIndex={0} role="group" aria-label="Treść okna">
            {children}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;
