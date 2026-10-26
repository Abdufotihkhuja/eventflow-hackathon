import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@shared/lib/utils";

/**
 * Eventflow Public — Card primitive.
 *
 * Spec: bone-paper surface, hairline border, sharp 8px corners.
 * Hover lifts shadow only (no transform per spec).
 */
const cardVariants = cva(
  [
    "relative box-border bg-white border border-[var(--border-1)]",
    "transition-[box-shadow,border-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
  ].join(" "),
  {
    variants: {
      surface: {
        paper: "bg-white",
        bone: "bg-bone-100",
        sunken: "bg-bone-200",
        ink: "bg-ink-400 text-bone-50 border-[rgba(250,250,249,0.08)]",
      },
      radius: {
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-xl",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-12",
      },
      shadow: {
        none: "shadow-none",
        xs: "shadow-xs",
        sm: "shadow-sm",
        md: "shadow-md",
      },
      hover: {
        none: "",
        lift: "hover:shadow-md hover:border-[var(--border-2)]",
        glow: "hover:shadow-[var(--shadow-glow-warm)]",
      },
      asLink: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      surface: "paper",
      radius: "lg",
      padding: "md",
      shadow: "sm",
      hover: "none",
      asLink: false,
    },
  }
);

export type CardVariantProps = VariantProps<typeof cardVariants>;

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    CardVariantProps {
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, surface, radius, padding, shadow, hover, asLink, children, ...rest },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ surface, radius, padding, shadow, hover, asLink }),
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

export interface CardSlotProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardSlotProps>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1 pb-4 mb-4 border-b border-[var(--border-1)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardBody = forwardRef<HTMLDivElement, CardSlotProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-4", className)} {...rest}>
      {children}
    </div>
  )
);
CardBody.displayName = "CardBody";

export const CardFooter = forwardRef<HTMLDivElement, CardSlotProps>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 pt-4 mt-4 border-t border-[var(--border-1)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";
