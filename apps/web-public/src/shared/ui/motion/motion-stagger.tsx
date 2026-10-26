"use client";

import { motion, type Variants, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import {
  fadeInUp,
  createStaggerContainer,
} from "@shared/lib/motion/variants";

interface MotionStaggerProps extends Omit<HTMLMotionProps<"div">, "variants" | "children" | "viewport"> {
  children: ReactNode;
  stagger?: number;
  delayChildren?: number;
  childVariants?: Variants;
  viewport?: boolean;
  viewportMargin?: string;
  viewportOnce?: boolean;
}

export const MotionStagger = forwardRef<HTMLDivElement, MotionStaggerProps>(
  (
    {
      children,
      stagger = 0.06,
      delayChildren = 0,
      childVariants: _childVariants,
      viewport = false,
      viewportMargin = "100px",
      viewportOnce = true,
      ...rest
    },
    ref,
  ) => {
    const containerVariants = createStaggerContainer(stagger, delayChildren);

    const animateProps = viewport
      ? {
          whileInView: "visible" as const,
          viewport: { once: viewportOnce, margin: viewportMargin },
        }
      : { animate: "visible" as const };

    return (
      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        {...animateProps}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);

MotionStagger.displayName = "MotionStagger";

export const MotionStaggerItem = forwardRef<
  HTMLDivElement,
  Omit<HTMLMotionProps<"div">, "variants"> & {
    children: ReactNode;
    variants?: Variants;
  }
>(({ children, variants = fadeInUp, ...rest }, ref) => (
  <motion.div ref={ref} variants={variants} {...rest}>
    {children}
  </motion.div>
));

MotionStaggerItem.displayName = "MotionStaggerItem";
