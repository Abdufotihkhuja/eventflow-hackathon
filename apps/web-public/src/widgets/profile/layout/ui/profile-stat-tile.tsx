"use client";

import type { ReactNode } from "react";

import { cn } from "@shared/lib/utils";

import type { LucideIcon } from "lucide-react";

type Tone = "ember" | "forest" | "ink";

interface ProfileStatTileProps {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  tone?: Tone;
  className?: string;
  href?: never;
}

const toneClass: Record<Tone, string> = {
  ember: "bg-ember-50 text-ember-500",
  forest: "bg-forest-50 text-forest-600",
  ink: "bg-bone-200 text-ink-200",
};

export function ProfileStatTile({
  icon: Icon,
  value,
  label,
  tone = "ember",
  className,
}: ProfileStatTileProps): ReactNode {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-bone-300/60 bg-bone-50 p-4 transition-colors duration-200 hover:border-bone-400",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            toneClass[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[22px] font-semibold leading-none text-ink-400 tabular-nums">
          {value}
        </p>
        <p className="mt-1.5 break-words text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-ink-100">
          {label}
        </p>
      </div>
    </div>
  );
}
