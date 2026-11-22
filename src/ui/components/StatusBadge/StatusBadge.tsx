import { cx } from "@/lib/cx";
import { Icon } from "@/ui/icons/Icon";
import { toneIcon, type Tone } from "../Notice/Notice";
import s from "./StatusBadge.module.css";

export interface StatusBadgeProps {
  tone: Tone;
  label: string;
  size?: "md" | "lg";
  className?: string;
}

export function StatusBadge({ tone, label, size = "md", className }: StatusBadgeProps) {
  return (
    <span className={cx(s.badge, s[tone], size === "lg" && s.lg, className)}>
      <Icon name={toneIcon[tone]} size={size === "lg" ? 20 : 16} />
      {label}
    </span>
  );
}
