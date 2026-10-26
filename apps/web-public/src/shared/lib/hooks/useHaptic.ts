"use client";

import { useCallback } from "react";

import { useReducedMotion } from "./useReducedMotion";

type HapticPattern = "tap" | "success" | "warning";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  success: [6, 24, 12],
  warning: [10, 30, 10],
};

/**
 * Lightweight haptic feedback for touch devices. Silently no-ops on
 * non-supporting platforms or when the user prefers reduced motion.
 */
export function useHaptic(): (pattern?: HapticPattern) => void {
  const reduced = useReducedMotion();

  return useCallback(
    (pattern: HapticPattern = "tap") => {
      if (reduced) return;
      if (typeof window === "undefined") return;
      if (typeof navigator === "undefined" || !navigator.vibrate) return;
      const isCoarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      if (!isCoarse) return;
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        // ignore — Safari can throw if API is restricted
      }
    },
    [reduced]
  );
}
