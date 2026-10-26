/**
 * Semantic role tokens — resolved to concrete values (not CSS var references,
 * which is how the web layer wires them). These mirror the `--bg-*`, `--fg-*`
 * role aliases in `globals.css` so screens reference intent, not raw shades.
 */
import { bone, border, ink } from "./colors";

/** Surface backgrounds, lightest to most sunken. */
export const bg = {
  /** Default page canvas. */
  1: bone[100],
  /** Raised surface (cards on canvas). */
  2: bone[50],
  /** Sunken surface (wells, sidebars). */
  3: bone[200],
} as const;

/** Foreground (text/icon) emphasis, strongest to faintest. */
export const fg = {
  /** Primary text / headings. */
  1: ink[400],
  /** Secondary text. */
  2: ink[200],
  /** Meta / tertiary text. */
  3: ink[100],
  /** Placeholder / disabled. */
  4: ink[50],
} as const;

/** Semantic role map, ready to spread into a theme. */
export const semantic = { bg, fg, border } as const;

export type SemanticBg = typeof bg;
export type SemanticFg = typeof fg;
export type Semantic = typeof semantic;
