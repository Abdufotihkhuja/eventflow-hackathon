/**
 * Spacing + radii primitives, in px. Spacing follows the 4px base grid from
 * `globals.css`; keys mirror the `--space-*` scale (note the intentional gaps
 * at 7, 9, 11, …).
 */

/** 4px base grid. Keys are the multiples used across the design system. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

/** Corner radii. Sharp, modern editorial — `md` (6px) is the workhorse. */
export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  pill: 999,
} as const;

export type Space = typeof space;
export type Radius = typeof radius;
