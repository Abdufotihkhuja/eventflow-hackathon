/**
 * Non-color design tokens: radii, control heights, gutters, and
 * cross-platform shadow presets. Spacing follows the canonical 4px grid
 * (re-exported from `@eventflow/ui-tokens` as `space`).
 */
import { Platform, type ViewStyle } from "react-native";

/** Corner radii. Control = 12 (`--ef-radius-btn/input`), card = 16 (`--ef-radius-card`). */
export const radii = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  control: 12,
  card: 16,
  xl: 20,
  pill: 999,
} as const;

/** Control heights mirror the kit (`Btn`: sm/md/lg, `Field`: 50). */
export const controlH = { sm: 36, md: 44, lg: 52, field: 50 } as const;

/** Horizontal page gutter (design `--gutter-mobile`). */
export const gutter = 20;

/** Default safe-area fallbacks (overridden by real insets where available). */
export const safe = { top: 52, bottom: 34 } as const;

type Shadow = Pick<
  ViewStyle,
  "shadowColor" | "shadowOpacity" | "shadowRadius" | "shadowOffset" | "elevation"
>;

const make = (
  opacity: number,
  radius: number,
  dy: number,
  elevation: number,
  color = "#0e0e0d",
): Shadow =>
  Platform.select({
    ios: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: dy } },
    android: { elevation },
    default: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: dy } },
  }) as Shadow;

/** Cool, soft shadow ramp + the single warm brand-CTA halo. */
export const shadow = {
  xs: make(0.06, 2, 1, 1),
  sm: make(0.07, 6, 2, 2),
  md: make(0.1, 20, 10, 8),
  lg: make(0.14, 36, 18, 14),
  glowWarm: make(0.4, 24, 10, 10, "#ea580c"),
} as const;
