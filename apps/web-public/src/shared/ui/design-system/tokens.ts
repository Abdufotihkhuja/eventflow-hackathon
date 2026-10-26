/**
 * Eventflow Public — design tokens.
 *
 * Use these constants for inline styles where Tailwind utility classes
 * are inconvenient (gradients, computed values, editorial compositions).
 * For everyday UI prefer Tailwind classes (`bg-bone-100`, `text-ink-300`,
 * `ring-ember-400`, `font-display`, `rounded-md`).
 *
 * Source of truth lives in `apps/web-public/src/app/globals.css` :root.
 */

export const tokens = {
  color: {
    bone: {
      50: "var(--bone-50)",
      100: "var(--bone-100)",
      200: "var(--bone-200)",
      300: "var(--bone-300)",
      400: "var(--bone-400)",
    },
    ink: {
      50: "var(--ink-50)",
      100: "var(--ink-100)",
      200: "var(--ink-200)",
      300: "var(--ink-300)",
      400: "var(--ink-400)",
    },
    ember: {
      50: "var(--ember-50)",
      100: "var(--ember-100)",
      200: "var(--ember-200)",
      300: "var(--ember-300)",
      400: "var(--ember-400)",
      500: "var(--ember-500)",
      600: "var(--ember-600)",
    },
    forest: {
      50: "var(--forest-50)",
      100: "var(--forest-100)",
      200: "var(--forest-200)",
      300: "var(--forest-300)",
      400: "var(--forest-400)",
      500: "var(--forest-500)",
      600: "var(--forest-600)",
    },
    role: {
      bg: {
        1: "var(--bg-1)",
        2: "var(--bg-2)",
        3: "var(--bg-3)",
      },
      fg: {
        1: "var(--fg-1)",
        2: "var(--fg-2)",
        3: "var(--fg-3)",
        4: "var(--fg-4)",
      },
    },
    status: {
      success: "var(--success)",
      successSoft: "var(--success-soft)",
      warning: "var(--warning)",
      warningSoft: "var(--warning-soft)",
      danger: "var(--danger)",
      dangerSoft: "var(--danger-soft)",
      info: "var(--info)",
      infoSoft: "var(--info-soft)",
    },
    border: {
      1: "var(--border-1)",
      2: "var(--border-2)",
      strong: "var(--border-strong)",
    },
  },
  font: {
    sans: "var(--font-sans)",
    display: "var(--font-display)",
    mono: "var(--font-mono)",
  },
  size: {
    xs: "var(--text-xs)",
    sm: "var(--text-sm)",
    base: "var(--text-base)",
    md: "var(--text-md)",
    lg: "var(--text-lg)",
    xl: "var(--text-xl)",
    "2xl": "var(--text-2xl)",
    "3xl": "var(--text-3xl)",
    "4xl": "var(--text-4xl)",
    "5xl": "var(--text-5xl)",
    "6xl": "var(--text-6xl)",
    display: "var(--text-display)",
  },
  weight: {
    light: "var(--w-light)",
    regular: "var(--w-regular)",
    medium: "var(--w-medium)",
    semibold: "var(--w-semibold)",
    bold: "var(--w-bold)",
    extrabold: "var(--w-extrabold)",
  },
  tracking: {
    tight: "var(--track-tight)",
    snug: "var(--track-snug)",
    normal: "var(--track-normal)",
    wide: "var(--track-wide)",
    eyebrow: "var(--track-eyebrow)",
  },
  leading: {
    tight: "var(--lh-tight)",
    snug: "var(--lh-snug)",
    normal: "var(--lh-normal)",
    relaxed: "var(--lh-relaxed)",
  },
  space: {
    1: "var(--space-1)",
    2: "var(--space-2)",
    3: "var(--space-3)",
    4: "var(--space-4)",
    5: "var(--space-5)",
    6: "var(--space-6)",
    8: "var(--space-8)",
    10: "var(--space-10)",
    12: "var(--space-12)",
    16: "var(--space-16)",
    20: "var(--space-20)",
    24: "var(--space-24)",
    32: "var(--space-32)",
  },
  radius: {
    xs: "var(--radius-xs)",
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    pill: "var(--radius-pill)",
  },
  shadow: {
    xs: "var(--shadow-xs)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    glowWarm: "var(--shadow-glow-warm)",
  },
  motion: {
    easeStandard: "var(--ease-standard)",
    easeOut: "var(--ease-out)",
    durFast: "var(--dur-fast)",
    durBase: "var(--dur-base)",
    durSlow: "var(--dur-slow)",
    durSlower: "var(--dur-slower)",
  },
  z: {
    base: "var(--z-base)",
    sticky: "var(--z-sticky)",
    overlay: "var(--z-overlay)",
    modal: "var(--z-modal)",
    toast: "var(--z-toast)",
  },
} as const;

export type Tokens = typeof tokens;
