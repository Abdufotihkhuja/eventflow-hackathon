import type { CSSProperties, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

/**
 * SectionLabel — eyebrow row with trailing hairline.
 * Visual pattern from `preview/*.html`: small uppercase label aligned
 * left, followed by a 1px ink-tint line filling the remaining width.
 */
export function SectionLabel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}): React.ReactNode {
  return (
    <div
      className={cn(
        "flex items-center gap-3 my-12 first:mt-0",
        "text-[11px] font-medium uppercase",
        "text-ink-100",
        className
      )}
      style={{ letterSpacing: "var(--track-eyebrow)", ...style }}
    >
      <span className="shrink-0">{children}</span>
      <span className="block h-px flex-1 bg-[var(--border-1)]" aria-hidden />
    </div>
  );
}
