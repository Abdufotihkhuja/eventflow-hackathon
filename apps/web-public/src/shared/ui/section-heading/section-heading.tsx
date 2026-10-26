"use client";

import type { ReactNode } from "react";

import { motion, type Variants } from "framer-motion";
import { fadeInUp } from "@shared/lib/motion";
import { cn } from "@shared/lib/utils";

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "default" | "inverse";
  className?: string;
  animated?: boolean;
}

const headerVariants: Variants = fadeInUp;

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "default",
  className,
  animated = true,
}: SectionHeadingProps): React.ReactNode {
  const Wrapper = animated ? motion.header : "header";

  const motionProps = animated
    ? {
        variants: headerVariants,
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, margin: "0px" },
      }
    : {};

  return (
    <Wrapper
      className={cn(
        "flex flex-col",
        align === "center"
          ? "items-center text-center"
          : "items-start text-left",
        className
      )}
      {...motionProps}
    >
      {eyebrow && (
        <span className="mb-3 inline-flex items-center rounded-full bg-ember-50/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ember-500">
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl",
          tone === "inverse" ? "text-white" : "text-ink-400"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-3 max-w-2xl text-sm leading-relaxed sm:text-base lg:text-lg",
            tone === "inverse" ? "text-bone-400" : "text-ink-100"
          )}
        >
          {description}
        </p>
      )}
    </Wrapper>
  );
}
