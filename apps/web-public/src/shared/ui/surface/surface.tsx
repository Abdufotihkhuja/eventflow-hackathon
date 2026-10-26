"use client";

import type { HTMLAttributes } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@shared/lib/utils";

const surfaceVariants = cva(
  "relative transition-shadow duration-300 ease-out",
  {
    variants: {
      variant: {
        solid: [
          "bg-white border border-bone-300/60",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
        ].join(" "),
        muted: [
          "bg-bone-100/80 border border-bone-300/40",
          "shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        ].join(" "),
        glass: [
          "border border-[var(--border-1)] bg-white shadow-xs border border-bone-300/40",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        ].join(" "),
        glassStrong: [
          "border border-[var(--border-1)] bg-white shadow-sm border border-bone-300/40",
          "shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
        ].join(" "),
      },
      radius: {
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-xl",
        "3xl": "rounded-xl",
        "4xl": "rounded-[28px]",
      },
      padding: {
        none: "",
        xs: "p-3 sm:p-4",
        sm: "p-3.5 sm:p-5",
        md: "p-4 sm:p-6",
        lg: "p-5 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "solid",
      radius: "2xl",
      padding: "md",
    },
  }
);

export type SurfaceProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceVariants>;

export function Surface({
  className,
  variant,
  radius,
  padding,
  ...props
}: SurfaceProps): React.ReactNode {
  return (
    <div
      className={cn(surfaceVariants({ variant, radius, padding }), className)}
      {...props}
    />
  );
}
