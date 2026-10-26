/**
 * `type()` composes a React Native `TextStyle` from a role/weight/size triplet,
 * translating the design's CSS `font` shorthand 1:1:
 *
 *   CSS  font: 700 17px/1.2 'Manrope'; letter-spacing: -0.02em
 *   RN   type({ weight: 700, size: 17, leading: 1.2, track: -0.02 })
 *
 * `leading` is a unitless line-height multiplier; `track` is letter-spacing in
 * `em` (converted to absolute px against the font size, as RN expects).
 */
import type { TextStyle } from "react-native";

import { font, type FontRole, type FontWeight } from "./fonts";

export interface TypeOpts {
  role?: FontRole;
  weight?: FontWeight;
  size?: number;
  /** unitless line-height multiplier */
  leading?: number;
  /** letter-spacing in em */
  track?: number;
  color?: string;
  align?: TextStyle["textAlign"];
  transform?: TextStyle["textTransform"];
}

/**
 * Smallest line box that still contains the glyph.
 *
 * RN centres text in the box `lineHeight` defines and CLIPS whatever sticks
 * out, so a line height tuned on a CSS mock shears real glyphs on the device:
 *
 *   • `display` — Space Grotesk's numerals overshoot their em box (the poster
 *     plate already carries this note). At `leading: 1` a 29px KPI figure loses
 *     a slice off the top AND the bottom.
 *   • `uppercase` — Cyrillic puts a breve above cap height, so "Й" at
 *     `leading: 1` renders as "И": "ПОСЛЕДНИЕ ДЕЙСТВИЯ" читается как
 *     "ДЕИСТВИЯ", which looks like a spelling mistake rather than clipping.
 *     Latin uppercase has no such mark, which is why the mocks never showed it.
 *
 * Deliberately NOT a blanket floor: ~165 call sites set `leading: 1` for
 * single-line body and mono text that fits its box perfectly well, and raising
 * all of them would shift layout across the app for no gain.
 */
const MIN_LEADING = 1.2;

export function type({
  role = "sans",
  weight = 400,
  size = 14,
  leading = 1.4,
  track = 0,
  color,
  align,
  transform,
}: TypeOpts = {}): TextStyle {
  const needsRoom = role === "display" || transform === "uppercase";
  const safeLeading = needsRoom ? Math.max(leading, MIN_LEADING) : leading;
  const style: TextStyle = {
    fontFamily: font(role, weight),
    fontSize: size,
    lineHeight: Math.round(size * safeLeading * 100) / 100,
  };
  if (track) style.letterSpacing = track * size;
  if (color) style.color = color;
  if (align) style.textAlign = align;
  if (transform) style.textTransform = transform;
  return style;
}
