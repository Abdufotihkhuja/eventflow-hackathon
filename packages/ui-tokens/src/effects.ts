/**
 * Effect primitives: motion timing, elevation, and z-index.
 *
 * Shadows are expressed structurally (color/offset/opacity/radius) rather than
 * as CSS box-shadow strings, so a React Native consumer can map them to
 * `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`/`elevation` and a
 * web consumer can compose a box-shadow. Values approximate the cool, soft
 * `--shadow-*` set in `globals.css` (all based on ink-400).
 */

/** Animation durations in milliseconds. */
export const duration = {
  fast: 120,
  base: 200,
  slow: 400,
  slower: 700,
} as const;

/** Easing curves as cubic-bezier control points [x1, y1, x2, y2]. */
export const easing = {
  standard: [0.2, 0, 0, 1],
  out: [0.16, 1, 0.3, 1],
} as const;

/** Structured elevation tokens (ink-400 based, low opacity). */
export const shadow = {
  xs: { color: "#0e0e0d", opacity: 0.05, radius: 2, offset: { width: 0, height: 1 }, elevation: 1 },
  sm: { color: "#0e0e0d", opacity: 0.05, radius: 6, offset: { width: 0, height: 2 }, elevation: 2 },
  md: { color: "#0e0e0d", opacity: 0.08, radius: 16, offset: { width: 0, height: 14 }, elevation: 6 },
  lg: { color: "#0e0e0d", opacity: 0.12, radius: 30, offset: { width: 0, height: 32 }, elevation: 12 },
  /** Warm ember glow for emphasis surfaces (tickets, primary CTAs). */
  glowWarm: { color: "#ea580c", opacity: 0.4, radius: 16, offset: { width: 0, height: 12 }, elevation: 8 },
} as const;

/** Stacking order scale. */
export const zIndex = {
  base: 0,
  sticky: 50,
  overlay: 100,
  modal: 200,
  toast: 300,
} as const;

export const effects = { duration, easing, shadow, zIndex } as const;

export type Duration = typeof duration;
export type Easing = typeof easing;
export type Shadow = typeof shadow;
export type ZIndex = typeof zIndex;
export type Effects = typeof effects;
