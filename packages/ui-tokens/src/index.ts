/**
 * @eventflow/ui-tokens
 *
 * Canonical, platform-agnostic design tokens for the EventFlow bone-and-ink
 * system. Plain TS objects only — no CSS, no build pipeline beyond `tsc`.
 *
 * - Web apps currently duplicate these values as CSS variables; migrating them
 *   to consume this package (and deleting the dupes) is a separate tech-debt
 *   task and intentionally out of scope here.
 * - The mobile app builds its NativeWind theme + JS theme object from these.
 */

export * from "./colors";
export * from "./semantic";
export * from "./typography";
export * from "./spacing";
export * from "./effects";

import { border, brand, palette, status } from "./colors";
import { effects } from "./effects";
import { semantic } from "./semantic";
import { radius, space } from "./spacing";
import { typography } from "./typography";

/** Everything, in one tree — convenient for building a theme object. */
export const tokens = {
  color: { ...palette, brand, status, border },
  semantic,
  typography,
  space,
  radius,
  ...effects,
} as const;

export type Tokens = typeof tokens;
