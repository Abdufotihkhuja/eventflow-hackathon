"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@shared/lib/utils";

import type { LucideIcon } from "lucide-react";

export interface ProfileTabItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
}

interface ProfileTabsProps<T extends string> {
  items: ProfileTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  /** Растянуть пилюли по ширине контейнера. */
  fullWidth?: boolean;
}

export function ProfileTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  fullWidth = false,
}: ProfileTabsProps<T>): ReactNode {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA tabs keyboard model: ←/→ (and ↑/↓) move + activate, Home/End jump
  // to the ends. Roving tabindex keeps a single tab stop in the tablist.
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    const count = items.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (index + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    onChange(items[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar overflow-x-auto",
        className
      )}
    >
      <div
        className={cn(
          "inline-flex min-w-full items-center gap-1 rounded-xl border border-bone-300/60 bg-bone-100/80 p-1.5",
          fullWidth && "w-full"
        )}
      >
        {items.map((item, index) => {
          const isActive = value === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "relative inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100",
                isActive
                  ? "bg-bone-50 text-ink-400 shadow-[0_1px_2px_rgba(14,14,13,0.05),0_2px_6px_rgba(14,14,13,0.05)]"
                  : "text-ink-100 hover:bg-bone-50/60 hover:text-ink-300",
                fullWidth && "flex-1"
              )}
            >
              {item.icon && (
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-ember-500" : "text-ink-50"
                  )}
                  aria-hidden
                />
              )}
              {item.shortLabel && (
                <span className="sm:hidden">{item.shortLabel}</span>
              )}
              <span className={cn(item.shortLabel && "hidden sm:inline")}>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-ember-50 text-ember-500"
                      : "bg-bone-300 text-ink-100"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
