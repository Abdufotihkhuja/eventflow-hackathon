/**
 * EventFlow — bone-and-ink color primitives.
 *
 * Canonical source of truth, extracted verbatim from
 * `apps/web-public/src/app/globals.css` :root. Plain hex/rgba strings, no CSS
 * variables — so any runtime (React Native, NativeWind, web) can consume them.
 *
 * Bone canvas (cool off-white) · graphite ink · electric ember accent ·
 * forest secondary. Formal but young: high contrast, ember as accent only.
 */

/** Cool off-white canvas. 50 = pure white, 400 = divider. */
export const bone = {
  50: "#ffffff",
  100: "#fbfbfa", // page
  200: "#f5f5f3", // card
  300: "#ececea", // sunken / sidebar
  400: "#dcdcda", // divider
} as const;

/** Graphite ink. 50 = placeholder, 400 = deepest ink. */
export const ink = {
  50: "#8a8a87", // placeholder
  100: "#6f6f6c", // meta
  200: "#4a4a47", // secondary
  300: "#2a2a28", // primary heading alt
  400: "#0e0e0d", // deepest ink
} as const;

/** Electric ember — the single brand accent. 400 = primary. */
export const ember = {
  50: "#fff3eb",
  100: "#ffe1cc",
  200: "#ffba85",
  300: "#fb893f",
  400: "#ea580c", // primary
  500: "#c64a07",
  600: "#963405",
} as const;

/** Forest — secondary editorial accent. 400 = secondary. */
export const forest = {
  50: "#eef3ef",
  100: "#d2e0d4",
  200: "#a4c0a8",
  300: "#6e9a76",
  400: "#3f7048", // secondary
  500: "#275235",
  600: "#173626",
} as const;

/** Brand shortcuts (primary == ember-400). */
export const brand = {
  primary: "#ea580c",
  primaryHover: "#f26b25",
  primaryPress: "#c64a07",
} as const;

/** Status colors with their soft (background) pairings. */
export const status = {
  success: "#1f7a3f",
  successSoft: "#d8ebe0",
  warning: "#b8860b",
  warningSoft: "#f6e6bf",
  danger: "#c2270e",
  dangerHover: "#d83815",
  dangerPress: "#971c08",
  dangerSoft: "#f9d6cf",
  info: "#3f7048",
  infoSoft: "#d2e0d4",
} as const;

/** Hairline borders over the bone canvas (ink at low opacity). */
export const border = {
  subtle: "rgba(14, 14, 13, 0.08)",
  default: "rgba(14, 14, 13, 0.16)",
  strong: "rgba(14, 14, 13, 0.32)",
} as const;

/** The full palette, grouped. */
export const palette = { bone, ink, ember, forest } as const;

export type Bone = typeof bone;
export type Ink = typeof ink;
export type Ember = typeof ember;
export type Forest = typeof forest;
export type Palette = typeof palette;
