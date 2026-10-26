"use client";

import {
  motion,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { fadeInUp } from "@shared/lib/motion/variants";

type MotionTag = "div" | "section" | "article" | "aside" | "header" | "footer" | "main" | "nav";

interface MotionSectionProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  children: ReactNode;
  variants?: Variants;
  as?: MotionTag;
  viewportMargin?: string;
  viewportOnce?: boolean;
}

export const MotionSection = forwardRef<HTMLElement, MotionSectionProps>(
  (
    {
      children,
      variants = fadeInUp,
      as = "div",
      viewportMargin = "100px",
      viewportOnce = true,
      ...rest
    },
    ref,
  ) => {
    const Component = motion[as] as typeof motion.div;

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: viewportOnce, margin: viewportMargin }}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

MotionSection.displayName = "MotionSection";
