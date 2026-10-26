"use client";

import { type ReactNode } from "react";

import { type LucideIcon } from "lucide-react";

import { cn } from "@shared/lib/utils";
import { MotionFadeIn } from "@shared/ui";

interface ProfilePageHeaderProps {
  /** Иконка в эйбрау (опционально) */
  icon?: LucideIcon;
  /** Текст эйбрау-метки над заголовком */
  eyebrow?: string;
  /** Основной заголовок страницы */
  title: string;
  /** Подзаголовок-описание */
  description?: string;
  /** Слот справа: поиск, фильтры, переключатели */
  actions?: ReactNode;
  /** Слот снизу: табы, доп. фильтры, метрики */
  bottom?: ReactNode;
  /** Доп. классы для секции */
  className?: string;
}

/**
 * Унифицированный заголовок страницы для разделов /profile/*.
 *
 * Структура:
 *   ┌────────────────────────────────────────────┐
 *   │  [icon] EYEBROW            actions slot    │
 *   │  Title                                     │
 *   │  Subtitle                                  │
 *   │  ──────────────────────────────────────── │
 *   │  bottom slot (tabs/stats)                  │
 *   └────────────────────────────────────────────┘
 *
 * Дизайн: спокойный editorial-стиль, без декоративных пятен и градиентов.
 */
export function ProfilePageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  bottom,
  className,
}: ProfilePageHeaderProps): ReactNode {
  return (
    <MotionFadeIn direction="up">
      <header
        className={cn(
          "border-b border-bone-300/60 pb-6 space-y-5",
          className
        )}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="min-w-0 space-y-2">
            {eyebrow && (
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
                {Icon && (
                  <Icon className="h-3.5 w-3.5 text-ember-400" aria-hidden />
                )}
                {eyebrow}
              </span>
            )}
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink-400 sm:text-[30px]">
              {title}
            </h1>
            {description && (
              <p className="max-w-2xl text-sm leading-relaxed text-ink-100">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {bottom && <div>{bottom}</div>}
      </header>
    </MotionFadeIn>
  );
}
