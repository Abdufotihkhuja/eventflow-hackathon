"use client";

import { useT } from "@eventflow/i18n/react";

import { cn } from "@shared/lib/utils";

import type { AccountType } from "@shared/api/authService";

interface WizardProgressProps {
  current: number;
  total: number;
  variant: AccountType;
  /** Optional explicit step labels — when provided, shown under the bar. */
  stepLabel?: string;
}

export const WizardProgress = ({
  current,
  total,
  variant,
  stepLabel,
}: WizardProgressProps): React.JSX.Element => {
  const t = useT();
  const isUser = variant === "user";
  const activeFill = isUser ? "bg-ember-400" : "bg-forest-500";

  return (
    <div
      className="space-y-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={t("public.auth.signupPage.stepCounter", {
        current,
        total,
      })}
    >
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
        <span>
          {t("public.auth.signupPage.stepCounter", { current, total })}
        </span>
        {stepLabel && <span className="text-ink-200">{stepLabel}</span>}
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-bone-300">
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out",
            activeFill
          )}
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
};
