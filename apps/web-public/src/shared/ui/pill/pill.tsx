import type { ReactNode } from "react";

import { cn } from "@shared/lib/utils";

export interface PillProps {
  children: ReactNode;
  tone?:
    | "brand"
    | "accent"
    | "glass"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "ember"
    | "forest"
    | "ink"
    | "bone";
  className?: string;
}

const toneClassMap: Record<Required<PillProps>["tone"], string> = {
  // Editorial primary tones
  ember: "bg-ember-100 text-ember-600 border border-ember-200",
  forest: "bg-forest-100 text-forest-600 border border-forest-200",
  ink: "bg-ink-400 text-bone-50 border border-transparent",
  bone: "bg-bone-200 text-ink-300 border border-[var(--border-1)]",
  // Status soft pills
  success: "bg-[var(--success-soft)] text-[var(--success)] border border-transparent",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border border-transparent",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border border-transparent",
  info: "bg-[var(--info-soft)] text-[var(--info)] border border-transparent",
  // Backward-compat tone names
  brand: "bg-ember-400 text-white border border-transparent",
  accent: "bg-forest-100 text-forest-600 border border-forest-200",
  glass: "bg-white text-ink-200 border border-[var(--border-1)]",
};

export function Pill({
  children,
  tone = "bone",
  className,
}: PillProps): React.ReactNode {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold tracking-wide",
        toneClassMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
