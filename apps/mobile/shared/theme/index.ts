import { tokens } from "@eventflow/ui-tokens";

/**
 * Theme barrel. The canonical platform-agnostic primitives come from
 * `@eventflow/ui-tokens`; this module layers the app's RN-specific theme on
 * top — semantic light/dark palettes, the font system, the `type()` text
 * helper, layout tokens, and the palette context — so JS-styled surfaces and
 * `className`-styled surfaces stay in lockstep (and in lockstep with web).
 */
export { tokens };
export const theme = tokens;
export type Theme = typeof tokens;

export { light, dark, accent, fade, type Palette } from "./colors";
export { font, useAppFonts, setDisplayScriptCyrillic, type FontRole, type FontWeight } from "./fonts";
export { type, type TypeOpts } from "./type";
export { radii, controlH, gutter, safe, shadow } from "./layout";
export { PaletteProvider, usePalette, useDark } from "./palette-context";
// Motion tokens live in shared/motion (durations/easings/springs/scrim);
// re-exported here so theme consumers see one token surface.
export { motion } from "../motion/tokens";
