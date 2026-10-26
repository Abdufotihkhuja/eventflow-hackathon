"use client";

import type { ReactNode } from "react";

import { cn } from "@shared/lib/utils";
import { MotionFadeIn } from "@shared/ui";

interface ProfileSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ProfileSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  delay = 0,
}: ProfileSectionProps): ReactNode {
  const hasHeading = Boolean(eyebrow || title || description || action);

  return (
    <MotionFadeIn direction="up" delay={delay}>
      <section className={cn("space-y-5", className)}>
        {hasHeading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-1.5">
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="text-xl font-bold tracking-tight text-ink-400 sm:text-[22px]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="max-w-2xl text-sm leading-relaxed text-ink-100">
                  {description}
                </p>
              )}
            </div>
            {action && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {action}
              </div>
            )}
          </div>
        )}
        {children}
      </section>
    </MotionFadeIn>
  );
}
