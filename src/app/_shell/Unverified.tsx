import type { ReactNode } from "react";
import { sourceById } from "@/integrations/sources";
import type { SystemId } from "@/integrations/types";
import { Notice } from "@/ui/components/Notice/Notice";

/** "ZUS — rozliczenia składek i CEIDG" */
export function sourceNames(ids: SystemId[]): string {
  const names = ids.map((id) => `„${sourceById[id]?.label ?? id}”`);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} i ${names.at(-1)}`;
}

/**
 * Shown instead of a positive or negative statement when the registry holding these facts was not read
 * (no consent, outage, manual mode). Says what we do not know and how the user can supply it.
 */
export function NotFetched({ sources, children, action }: { sources: SystemId[]; children?: ReactNode; action?: ReactNode }) {
  return (
    <Notice tone="neutral" icon="info" hideToneWord title="Nie pobraliśmy tych danych" actions={action}>
      <p>
        Nie odczytaliśmy rejestru {sourceNames(sources)}, więc niczego tu nie zakładamy — ani że wszystko jest w porządku, ani że czegoś brakuje.
      </p>
      {children}
    </Notice>
  );
}
