"use client";

import type { ReactNode } from "react";

import { cn } from "@shared/lib/utils";

import type { LucideIcon } from "lucide-react";

type Tone = "ember" | "forest" | "ink" | "danger";

interface SettingsSectionCardProps {
  icon?: LucideIcon;
  iconTone?: Tone;
  title: string;
  description?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  danger?: boolean;
}

const iconToneClass: Record<Tone, string> = {
  ember: "bg-ember-50 text-ember-500",
  forest: "bg-forest-50 text-forest-600",
  ink: "bg-bone-200 text-ink-300",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function SettingsSectionCard({
  icon: Icon,
  iconTone = "ember",
  title,
  description,
  headerRight,
  footer,
  children,
  className,
  danger = false,
}: SettingsSectionCardProps): ReactNode {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-bone-50",
        danger
          ? "border-[var(--danger-soft)]"
          : "border-bone-300/60",
        className
      )}
    >
      <header className="flex items-start gap-4 border-b border-bone-200 p-5 sm:p-6">
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconToneClass[danger ? "danger" : iconTone]
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-base font-semibold",
              danger ? "text-[var(--danger)]" : "text-ink-400"
            )}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-ink-100">
              {description}
            </p>
          )}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </header>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-bone-200 bg-bone-100/60 px-5 py-4 sm:px-6">
          {footer}
        </footer>
      )}
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  control?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Stack control under label on all sizes (good for inputs). */
  stacked?: boolean;
}

export function SettingsRow({
  label,
  description,
  control,
  children,
  className,
  stacked = false,
}: SettingsRowProps): ReactNode {
  return (
    <div
      className={cn(
        "flex gap-4",
        stacked
          ? "flex-col"
          : "flex-col sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 sm:max-w-md">
        <p className="text-sm font-semibold text-ink-400">{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-ink-100">
            {description}
          </p>
        )}
      </div>
      <div className={cn("min-w-0", stacked ? "" : "sm:max-w-xs sm:flex-1")}>
        {control ?? children}
      </div>
    </div>
  );
}
