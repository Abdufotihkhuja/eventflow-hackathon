"use client";

import type { ReactNode } from "react";

import { AlertTriangle, Loader2 } from "lucide-react";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Surface } from "@shared/ui/surface";

import type { LucideIcon } from "lucide-react";

interface BaseStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function ProfileLoadingState({
  title,
  className,
}: {
  title: string;
  className?: string;
}): ReactNode {
  return (
    <Surface
      variant="solid"
      radius="xl"
      padding="lg"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-ember-400" aria-hidden />
      <p className="text-sm font-medium text-ink-100">{title}</p>
    </Surface>
  );
}

export function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: BaseStateProps): ReactNode {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed border-bone-400 bg-bone-100/60 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bone-200 text-ink-100">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-ink-400">{title}</h3>
        {description && (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-100">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ProfileErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-[var(--danger-soft)] bg-bone-50 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-ink-400">{title}</h3>
        {description && (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-100">
            {description}
          </p>
        )}
      </div>
      {onRetry && retryLabel && (
        <Button variant="secondary" size="md" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
