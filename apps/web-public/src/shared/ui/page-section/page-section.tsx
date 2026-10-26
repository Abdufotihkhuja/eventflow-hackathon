"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

export type PageSectionSize = "default" | "narrow" | "wide";

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  containerClassName?: string;
  decorations?: ReactNode;
  size?: PageSectionSize;
}

const containerClass: Record<PageSectionSize, string> = {
  default: "container",
  narrow: "container-narrow",
  wide: "container-wide",
};

export function PageSection({
  className,
  containerClassName,
  decorations,
  size = "default",
  children,
  ...props
}: PageSectionProps): React.ReactNode {
  return (
    <section
      className={cn("relative w-full py-12 sm:py-16", className)}
      {...props}
    >
      {decorations}
      <div className={cn(containerClass[size], containerClassName)}>
        {children}
      </div>
    </section>
  );
}
