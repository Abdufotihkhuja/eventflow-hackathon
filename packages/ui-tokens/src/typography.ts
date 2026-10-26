/**
 * Typography primitives. Numeric where the value is platform-agnostic
 * (font sizes in px, line-height as unitless multipliers, weights as the
 * string values React Native's `fontWeight` accepts).
 *
 * `letterSpacing` is kept in `em` (as authored in `globals.css`) because that
 * is resolution-independent; consumers that need absolute px (React Native)
 * multiply by the relevant font size. Font *family names* are exported as
 * plain strings — actually loading the fonts is the consuming app's job.
 */

/** Font family names. The display face is Space Grotesk; body is Manrope. */
export const fontFamily = {
  sans: "Manrope",
  display: "Space Grotesk",
  mono: "JetBrains Mono",
} as const;

/** Type scale, in px. `display` is fluid on web (clamp); this is its ceiling. */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 38,
  "4xl": 48,
  "5xl": 64,
  "6xl": 84,
  display: 132,
} as const;

/** Weights as React-Native-compatible strings. */
export const fontWeight = {
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

/** Letter spacing in `em` (multiply by font size for RN absolute px). */
export const letterSpacing = {
  tight: -0.035,
  snug: -0.02,
  normal: -0.01,
  wide: 0.04,
  eyebrow: 0.18,
} as const;

/** Line height as unitless multipliers. */
export const lineHeight = {
  tight: 1.0,
  snug: 1.15,
  normal: 1.5,
  relaxed: 1.6,
} as const;

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
} as const;

export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type Typography = typeof typography;
