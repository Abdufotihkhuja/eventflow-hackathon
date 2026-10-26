"use client";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { usePathname } from "next/navigation";

import { useT } from "@eventflow/i18n/react";
import { stripLocalePrefix } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";

export interface SegmentedControlOption {
  value: string;
  label: string;
  href?: string;
  badge?: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Полная ширина контейнера */
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  fullWidth = false,
  className,
}: SegmentedControlProps): React.ReactNode {
  const t = useT();
  const pathname = stripLocalePrefix(usePathname());

  // Определяем активный элемент по pathname если href указан
  const activeValue =
    value ??
    options.find((opt) => opt.href && pathname === opt.href)?.value ??
    options[0]?.value;
  const activeIndex = options.findIndex((opt) => opt.value === activeValue);

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-xl border border-bone-300/80 bg-bone-100/80 p-1.5 backdrop-blur-sm",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
        fullWidth && "w-full",
        className
      )}
      role="tablist"
      aria-label={t("public.shared.segmentedControlAria")}
    >
      {/* Позиция — только transform (GPU): left/width в transition дёргают layout. */}
      <div
        className={cn(
          "absolute left-1.5 top-1.5 h-[calc(100%-12px)] rounded-xl transition-transform duration-200 ease-out-expo",
          "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]",
          "border border-bone-300/60"
        )}
        style={{
          width: `calc(${100 / options.length}% - 6px)`,
          transform: `translateX(calc(${activeIndex} * (100% + 6px)))`,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === activeValue;

        const itemClassName = cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 sm:gap-2.5 sm:px-6 sm:py-3",
          fullWidth ? "min-w-0" : "min-w-[100px] sm:min-w-[140px]",
          isActive
            ? "text-ink-400"
            : "text-ink-100 hover:text-ink-200"
        );

        const content = (
          <>
            <span className="whitespace-nowrap">{option.label}</span>
            {option.badge && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-[color,background-color,box-shadow] duration-200",
                  isActive
                    ? "bg-linear-to-r from-ember-400 to-ember-300 text-white shadow-sm shadow-ember-400/30"
                    : "bg-ember-50 text-ember-500"
                )}
              >
                {option.badge}
              </span>
            )}
          </>
        );

        // Если есть href - рендерим Link
        if (option.href) {
          return (
            <Link
              key={option.value}
              href={option.href}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${option.value}`}
              className={itemClassName}
            >
              {content}
            </Link>
          );
        }

        // Иначе рендерим button
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${option.value}`}
            className={itemClassName}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
