"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { forwardRef, useMemo, type ReactNode } from "react";
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  uiTransition,
} from "@shared/lib/motion/variants";

type Direction = "up" | "down" | "left" | "right" | "none";

const directionVariants = {
  none: fadeIn,
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
} as const;

interface MotionFadeInProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
}

export const MotionFadeIn = forwardRef<HTMLDivElement, MotionFadeInProps>(
  ({ children, direction = "up", delay = 0, ...rest }, ref) => {
    // MotionFadeIn монтируется на app-поверхностях при каждой навигации,
    // поэтому получает быстрый uiTransition. transition из варианта имеет
    // приоритет над пропом `transition` — тайминг и delay вшиваются в вариант.
    const variants = useMemo<Variants>(() => {
      const base = directionVariants[direction];
      const visible = base.visible;
      return {
        ...base,
        visible: {
          ...(typeof visible === "object" && visible !== null ? visible : {}),
          transition: { ...uiTransition, delay },
        },
      };
    }, [direction, delay]);

    return (
      <motion.div
        ref={ref}
        variants={variants}
        initial="hidden"
        animate="visible"
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);

MotionFadeIn.displayName = "MotionFadeIn";
