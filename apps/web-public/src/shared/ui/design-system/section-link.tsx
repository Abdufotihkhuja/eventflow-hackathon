"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

interface SectionLinkProps {
  /** Required href — section links are always navigation (use Button if not). */
  href: string;
  /** Visible label. Sentence case per spec. */
  children: ReactNode;
  /** Underline accent ("ember", default) or "ink" for muted variant. */
  tone?: "ember" | "ink";
  /** Append a trailing arrow (default true). */
  arrow?: boolean;
  /** External? Adds rel/target. */
  external?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * SectionLink — the single canonical "see-more" / inline section CTA used in
 * editorial section headers (`See all`, `All categories`, `Open roles`, etc.).
 *
 * Spec: text-only, sentence case, optional trailing arrow. Underlined with
 * ember decoration at rest; on hover the underline tightens (offset 5 → 2)
 * and color shifts to ember-600. Always one variant — no per-section drift.
 */
export function SectionLink({
  href,
  children,
  tone = "ember",
  arrow = true,
  external = false,
  className,
  style,
}: SectionLinkProps): React.ReactNode {
  const baseClass = cn(
    "group inline-flex items-center gap-1.5 align-baseline",
    "font-semibold text-sm leading-none",
    "transition-colors duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
    "no-underline",
    "focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100",
    tone === "ember"
      ? "text-ink-400 hover:text-ember-500"
      : "text-ink-400 hover:text-ink-300",
    className
  );

  const labelClass = cn(
    "underline decoration-1",
    "transition-[text-underline-offset,text-decoration-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
    "underline-offset-[5px] group-hover:underline-offset-[3px]",
    tone === "ember"
      ? "decoration-ember-400 group-hover:decoration-ember-500"
      : "decoration-ink-200/40 group-hover:decoration-ink-200"
  );

  const linkProps = external
    ? { rel: "noopener noreferrer", target: "_blank" }
    : {};

  return (
    <a href={href} className={baseClass} style={style} {...linkProps}>
      <span className={labelClass}>{children}</span>
      {arrow ? (
        <span
          aria-hidden
          className="inline-block leading-none transition-transform duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))] group-hover:translate-x-0.5"
        >
          →
        </span>
      ) : null}
    </a>
  );
}
