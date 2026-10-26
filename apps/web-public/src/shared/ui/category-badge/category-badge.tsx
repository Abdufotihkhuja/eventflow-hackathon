/**
 * @module shared/ui/category-badge
 * @description Editorial pill for blog categories — Forest secondary register,
 *              with active state in graphite ink. One pill per category, sentence
 *              case label from i18n.
 * @todo Move into `entities/blog/ui` per FSD.
 */

"use client";

/* eslint-disable import/no-restricted-paths */
import type { BlogCategory } from "@/entities/blog";
import { getCategoryLabel } from "@/entities/blog";
/* eslint-enable import/no-restricted-paths */

import { cn } from "@shared/lib/utils";

export interface CategoryBadgeProps {
  category: BlogCategory;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const baseStyles = [
  "inline-flex items-center justify-center rounded-pill",
  "px-3 py-1 text-[11px] font-medium tracking-wide",
  "transition-[background-color,color,border-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
].join(" ");

const restingStyles =
  "bg-forest-50 text-forest-600 border border-forest-100";

const activeStyles = "bg-ink-400 text-bone-50 border border-ink-400";

const hoverStyles =
  "hover:bg-forest-100 hover:border-forest-200";

export function CategoryBadge({
  category,
  active = false,
  onClick,
  className = "",
}: CategoryBadgeProps) {
  const label = getCategoryLabel(category);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          baseStyles,
          active ? activeStyles : `${restingStyles} ${hoverStyles}`,
          className
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={cn(baseStyles, restingStyles, className)}>{label}</span>
  );
}
