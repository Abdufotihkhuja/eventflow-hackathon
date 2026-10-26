// NativeWind (Tailwind v3) theme for EventFlow mobile, built from the canonical
// @eventflow/ui-tokens. This is the single source of truth for the bone-and-ink
// palette — the same hex values the web apps render. Requires @eventflow/ui-tokens
// to be built (`npm run build:packages` at the root) so dist/ is resolvable.
const {
  bone,
  ink,
  ember,
  forest,
  status,
  fontFamily,
  fontSize,
  fontWeight,
  space,
  radius,
} = require("@eventflow/ui-tokens");

/** Numeric px tokens -> Tailwind's string-with-unit form. */
const px = (scale) =>
  Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, `${v}px`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./entities/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bone,
        ink,
        ember,
        forest,
        success: { DEFAULT: status.success, soft: status.successSoft },
        warning: { DEFAULT: status.warning, soft: status.warningSoft },
        danger: { DEFAULT: status.danger, soft: status.dangerSoft },
        info: { DEFAULT: status.info, soft: status.infoSoft },
      },
      fontFamily: {
        sans: [fontFamily.sans],
        display: [fontFamily.display],
        mono: [fontFamily.mono],
      },
      fontSize: px(fontSize),
      fontWeight,
      spacing: px(space),
      borderRadius: px(radius),
    },
  },
  plugins: [],
};
