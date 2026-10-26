import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

/**
 * Editorial typography primitives mirroring `colors_and_type.css` utilities.
 *
 * - `Display`   — heavy Manrope hero headline. Use `<ItalicAccent>` inside
 *                 to inflect a single phrase via Space Grotesk italic.
 * - `Lead`      — body intro paragraph (Manrope regular 18px, fg-2).
 * - `Meta`      — small uppercase metadata (used inline with bullets).
 * - `Mono`      — JetBrains Mono for codes/timestamps.
 * - `HairlineDivider` — 1px ink-tint horizontal rule.
 */

interface CommonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
}

export function Display({
  children,
  className,
  style,
  as: Tag = "h1",
}: CommonProps): React.ReactNode {
  return (
    <Tag
      className={cn("t-display m-0", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function Lead({
  children,
  className,
  style,
  as: Tag = "p",
}: CommonProps): React.ReactNode {
  return (
    <Tag className={cn("t-lead m-0", className)} style={style}>
      {children}
    </Tag>
  );
}

export function Meta({
  children,
  className,
  style,
  as: Tag = "p",
}: CommonProps): React.ReactNode {
  return (
    <Tag className={cn("t-meta m-0", className)} style={style}>
      {children}
    </Tag>
  );
}

export function Mono({
  children,
  className,
  style,
  as: Tag = "span",
}: CommonProps): React.ReactNode {
  return (
    <Tag className={cn("t-mono", className)} style={style}>
      {children}
    </Tag>
  );
}

export function HairlineDivider({
  className,
  style,
  strong = false,
}: {
  className?: string;
  style?: CSSProperties;
  strong?: boolean;
}): React.ReactNode {
  return (
    <hr
      className={cn(
        "h-px w-full border-0",
        strong ? "bg-[var(--border-2)]" : "bg-[var(--border-1)]",
        className
      )}
      style={style}
    />
  );
}
