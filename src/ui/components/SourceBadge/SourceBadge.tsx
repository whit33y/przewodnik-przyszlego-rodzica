import { cx } from "@/lib/cx";
import { formatDateShort } from "@/lib/format";
import s from "./SourceBadge.module.css";

export type SourceId =
  | "zus-konto"
  | "zus-platnik"
  | "zus-saldo"
  | "zus-ezla"
  | "zus-swiadczenia"
  | "ceidg"
  | "krs"
  | "rsc"
  | "ezdrowie"
  | "mobywatel"
  | "user";

export const sourceLabel: Record<SourceId, string> = {
  "zus-konto": "z ZUS",
  "zus-platnik": "z ZUS (dane płatnika)",
  "zus-saldo": "z ZUS (rozliczenia składek)",
  "zus-ezla": "z e-ZLA",
  "zus-swiadczenia": "z ZUS (świadczenia)",
  ceidg: "z CEIDG",
  krs: "z KRS",
  rsc: "z rejestru stanu cywilnego",
  ezdrowie: "z e-zdrowia (P1)",
  mobywatel: "z mObywatela",
  user: "podane przez Ciebie",
};

export interface SourceBadgeProps {
  source: SourceId;
  asOf?: string;
  overridden?: boolean;
  wrap?: boolean;
}

export function SourceBadge({ source, asOf, overridden, wrap }: SourceBadgeProps) {
  const isUser = overridden || source === "user";
  const label = overridden ? "poprawione przez Ciebie — ZUS zweryfikuje" : sourceLabel[source];
  return (
    <span className={cx(s.badge, isUser && s.user, wrap && s.wrap)}>
      <span className={s.dot} aria-hidden="true" />
      <span>
        <span className="visually-hidden">Źródło: </span>
        {label}
        {asOf && !overridden ? ` · stan na ${formatDateShort(asOf)}` : ""}
      </span>
    </span>
  );
}
