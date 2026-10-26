"use client";

import type {
  ButtonHTMLAttributes,
  ForwardedRef,
  ReactNode,
} from "react";
import { forwardRef, useEffect, useRef, useState } from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { useReducedMotion } from "@shared/lib/hooks/useReducedMotion";
import {
  crossfade,
  pressSpring,
} from "@shared/lib/motion/spring-presets";
import { cn } from "@shared/lib/utils";

import { Spinner } from "../spinner";

/**
 * Eventflow Public — Button.
 *
 * Spec: bone-and-ink editorial. 6 variants × 3 sizes. Sharp corners
 * (5/6/8), no scale on hover, no bounce. Focus ring ember.
 *
 * Variants:
 * - primary  — ember CTA (one per screen max)
 * - ink      — graphite formal alt (admin/settings)
 * - secondary| outline — outlined paper (companion to a primary)
 * - ghost    — transparent, low-stakes
 * - subtle   — soft bone fill (toolbars, table actions)
 * - danger   — scarlet destructive
 * - link     — underlined text-only
 *
 * `glass`, `violet` map to `secondary` for backward-compat during
 * migration; phase 8 cleanup will remove them entirely.
 *
 * Animations: opt-in via `isLoading` / `isSuccess` props. When either is
 * passed, the button wraps itself in a motion-capable container that
 * cross-fades content and adds a press spring. Existing call sites that
 * never pass these props get the unchanged static editorial button.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-semibold",
    "transition-[background-color,border-color,color,box-shadow] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100",
    "disabled:pointer-events-none disabled:opacity-60",
    "cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-ember-400 text-bone-50 border border-transparent",
          "hover:bg-[var(--brand-primary-hover)]",
          "active:bg-ember-500",
        ].join(" "),
        ink: [
          "bg-ink-400 text-bone-50 border border-transparent",
          "hover:bg-ink-300",
          "active:bg-black",
        ].join(" "),
        secondary: [
          "bg-white text-ink-400 border border-[var(--border-2)]",
          "hover:bg-bone-100 hover:border-[var(--border-strong)]",
          "active:bg-bone-200",
        ].join(" "),
        outline: [
          "bg-white text-ink-400 border border-[var(--border-2)]",
          "hover:bg-bone-100 hover:border-[var(--border-strong)]",
          "active:bg-bone-200",
        ].join(" "),
        ghost: [
          "bg-transparent text-ink-400 border border-transparent",
          "hover:bg-[rgba(14,14,13,0.05)]",
          "active:bg-[rgba(14,14,13,0.1)]",
        ].join(" "),
        subtle: [
          "bg-bone-200 text-ink-300 border border-transparent",
          "hover:bg-bone-300",
          "active:bg-bone-400",
        ].join(" "),
        danger: [
          "bg-[var(--danger)] text-bone-50 border border-transparent",
          "hover:bg-danger-hover",
          "active:bg-danger-press",
        ].join(" "),
        link: [
          "bg-transparent border border-transparent text-ember-500",
          "underline underline-offset-4 decoration-1 decoration-ember-500/50",
          "hover:text-ember-600 hover:decoration-ember-600 hover:underline-offset-2",
          "p-0 h-auto",
        ].join(" "),
        // Backward-compat aliases (phase 8 cleanup will remove these)
        glass: [
          "bg-white text-ink-400 border border-[var(--border-1)]",
          "shadow-[var(--shadow-xs)]",
          "hover:bg-bone-50 hover:shadow-[var(--shadow-sm)]",
        ].join(" "),
        violet: [
          "bg-forest-100 text-forest-600 border border-forest-200",
          "hover:bg-forest-200 hover:border-forest-300",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] leading-none gap-1.5 rounded-[5px]",
        md: "h-11 px-[18px] text-sm leading-none gap-2 rounded-md",
        lg: "h-12 px-[22px] text-base leading-none gap-2.5 rounded-lg sm:h-[52px]",
      },
      icon: {
        true: "aspect-square p-0",
      },
    },
    compoundVariants: [
      { icon: true, size: "sm", className: "h-9 w-9" },
      { icon: true, size: "md", className: "h-11 w-11" },
      { icon: true, size: "lg", className: "h-12 w-12 sm:h-[52px] sm:w-[52px]" },
      // `link` ignores size paddings entirely
      { variant: "link", size: "sm", className: "h-auto p-0 text-[13px]" },
      { variant: "link", size: "md", className: "h-auto p-0 text-sm" },
      { variant: "link", size: "lg", className: "h-auto p-0 text-base" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const SPINNER_SIZE_BY_BUTTON: Record<
  NonNullable<ButtonProps["size"]>,
  "xs" | "sm" | "md"
> = {
  sm: "xs",
  md: "sm",
  lg: "md",
};

export interface ButtonProps
  extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "onAnimationStart" | "onAnimationEnd" | "onDragStart" | "onDragEnd" | "onDrag"
    >,
    VariantProps<typeof buttonVariants> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Show a smooth spinner crossfade in place of children. */
  isLoading?: boolean;
  /** Briefly flash a success checkmark (auto-revert after `successDuration`). */
  isSuccess?: boolean;
  /** Optional label shown beside the spinner. */
  loadingLabel?: ReactNode;
  /** Optional label shown beside the success check. */
  successLabel?: ReactNode;
  /** ms to keep success state visible. Default 900. */
  successDuration?: number;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      icon,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      isLoading,
      isSuccess,
      loadingLabel,
      successLabel,
      successDuration = 900,
      disabled,
      ...props
    },
    ref: ForwardedRef<HTMLButtonElement>
  ) => {
    const reducedMotion = useReducedMotion();
    const animationsRequested =
      typeof isLoading === "boolean" || typeof isSuccess === "boolean";

    // success flash: auto-clear local flag after duration so the checkmark
    // always retracts even if the parent forgets to flip it back.
    const [showSuccess, setShowSuccess] = useState(Boolean(isSuccess));
    const wasLoadingRef = useRef(isLoading);
    // eslint-disable-next-line no-restricted-syntax -- локальная анимация success в shared UI-button
    useEffect(() => {
      if (!animationsRequested) return;
      if (isSuccess) {
        setShowSuccess(true);
        const id = window.setTimeout(
          () => setShowSuccess(false),
          successDuration
        );
        return () => window.clearTimeout(id);
      }
      // when loading transitions false → false (no success), retract instantly
      if (!isLoading && wasLoadingRef.current) {
        wasLoadingRef.current = false;
      }
      return undefined;
    }, [animationsRequested, isLoading, isSuccess, successDuration]);

    // eslint-disable-next-line no-restricted-syntax -- ref-sync для последующего эффекта
    useEffect(() => {
      wasLoadingRef.current = isLoading ?? false;
    }, [isLoading]);

    const baseClasses = cn(buttonVariants({ variant, size, icon }), className);
    const sizeKey = (size ?? "md") as NonNullable<ButtonProps["size"]>;

    const childContent = (
      <>
        {leftIcon ? (
          <span className="inline-flex shrink-0 items-center justify-center">
            {leftIcon}
          </span>
        ) : null}
        <span className="inline-flex items-center justify-center">
          {children}
        </span>
        {rightIcon ? (
          <span className="inline-flex shrink-0 items-center justify-center">
            {rightIcon}
          </span>
        ) : null}
      </>
    );

    if (!animationsRequested) {
      return (
        <button
          ref={ref}
          type={type}
          className={baseClasses}
          disabled={disabled}
          {...props}
        >
          {childContent}
        </button>
      );
    }

    const motionProps = reducedMotion
      ? {}
      : {
          whileTap: { scale: 0.97 },
          transition: pressSpring,
        };

    const isBusy = Boolean(isLoading);
    const phase: "idle" | "loading" | "success" = isBusy
      ? "loading"
      : showSuccess
        ? "success"
        : "idle";

    return (
      <motion.button
        ref={ref}
        type={type}
        layout
        {...motionProps}
        className={cn(baseClasses, "overflow-hidden")}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        aria-live="polite"
        {...props}
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === "loading" ? (
            <motion.span
              key="loading"
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }
              }
              transition={crossfade}
              className="inline-flex items-center justify-center gap-2"
            >
              <Spinner size={SPINNER_SIZE_BY_BUTTON[sizeKey]} tone="current" />
              {loadingLabel ? <span>{loadingLabel}</span> : null}
            </motion.span>
          ) : phase === "success" ? (
            <motion.span
              key="success"
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.6 }
              }
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: [0.6, 1.18, 1] }
              }
              exit={
                reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
              }
              transition={
                reducedMotion
                  ? crossfade
                  : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }
              }
              className="inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-4" />
              {successLabel ? <span>{successLabel}</span> : null}
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }
              }
              transition={crossfade}
              className="inline-flex items-center justify-center gap-2"
            >
              {childContent}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export const buttonStyles = buttonVariants;
