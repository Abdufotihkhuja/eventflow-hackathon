"use client";

import type { CSSProperties } from "react";

import { motion } from "framer-motion";

import { cn } from "@shared/lib/utils";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "current" | "ember" | "ink" | "danger" | "white";
  className?: string;
  /** Optional inline label for screen readers (defaults to "Loading"). */
  label?: string;
}

const SIZE_PX: Record<NonNullable<SpinnerProps["size"]>, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
};

const TONE_CLASS: Record<NonNullable<SpinnerProps["tone"]>, string> = {
  current: "text-current",
  ember: "text-ember-500",
  ink: "text-ink-400",
  danger: "text-[var(--danger)]",
  white: "text-white",
};

/**
 * Smooth, tone-aware loading indicator. Animates in with a brief scale/opacity
 * pop, then rotates indefinitely. Honours reduced-motion via framer-motion.
 */
export function Spinner({
  size = "sm",
  tone = "current",
  className,
  label = "Loading",
}: SpinnerProps) {
  const px = SIZE_PX[size];
  const stroke = px <= 14 ? 2 : px <= 16 ? 2.25 : 2.5;

  const styleVars = {
    "--spinner-size": `${px}px`,
  } as CSSProperties;

  return (
    <motion.span
      role="status"
      aria-live="polite"
      aria-label={label}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={styleVars}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        TONE_CLASS[tone],
        className
      )}
    >
      {/* Вращение через CSS: не зависит от занятости main thread
          (спиннер виден именно в моменты загрузки). */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin [animation-duration:850ms]"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={stroke}
          opacity="0.18"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </motion.span>
  );
}
