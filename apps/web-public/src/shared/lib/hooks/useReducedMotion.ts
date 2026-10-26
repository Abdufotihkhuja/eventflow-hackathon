"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Returns true if the user has set `prefers-reduced-motion: reduce`.
 * Wrap framer-motion's hook so animation primitives have a single source of truth.
 */
export function useReducedMotion(): boolean {
  return Boolean(useFramerReducedMotion());
}
