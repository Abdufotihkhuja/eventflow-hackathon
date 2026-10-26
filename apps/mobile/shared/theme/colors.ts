/**
 * Semantic color palettes for the EventFlow app, derived 1:1 from the
 * canonical `@eventflow/ui-tokens` ramps (bone × graphite × ember + forest)
 * and the design's `colors_and_type.css` semantic roles.
 *
 * Two palettes — `light` (bone canvas, the default) and `dark` (graphite
 * surfaces used by intentional dark screens: splash, event detail, ticket,
 * organizer). Components read the active palette via `usePalette()` rather
 * than prop-drilling a `dark` flag.
 *
 * Ember is the single brand accent. We keep it fixed (the design's Tweaks
 * accent-swapper is an authoring tool, not an app feature).
 */
import { ember, forest, ink, bone, status } from "@eventflow/ui-tokens";

/** Accent (ember) — fixed brand role, shared by both palettes. */
export const accent = {
  base: ember[400], // #ea580c — primary CTA
  bright: ember[300], // #fb893f — on-dark accent text
  ink: ember[600], // #963405 — accent text on soft bg
  soft: ember[50], // #fff3eb — soft accent fill
  softHover: ember[100],
  press: ember[500], // #c64a07
  ring: "rgba(234, 88, 12, 0.28)",
  on: "#ffffff",
} as const;

/**
 * Gradient endpoints for scrims/fades (RN gradient rule: alpha-0 copies of the
 * target color — never `'transparent'`, which is transparent BLACK and reads
 * as a grey band mid-gradient).
 */
export const fade = {
  /** bone canvas (#fbfbfa) at alpha 0 / low / high — hero → page fades */
  canvas0: "rgba(251, 251, 250, 0)",
  canvasLow: "rgba(251, 251, 250, 0.2)",
  canvasHigh: "rgba(251, 251, 250, 0.85)",
  /** ink (#0e0e0d) at alpha 0 / soft — top scrims over imagery */
  ink0: "rgba(14, 14, 13, 0)",
  inkSoft: "rgba(14, 14, 13, 0.35)",
} as const;

/** Structural shape shared by the light and dark palettes. */
export interface Palette {
  canvas: string;
  canvasDeep?: string;
  surface: string;
  sunken: string;
  muted: string;
  inverse: string;
  scrim: string;
  fg: string;
  fgDefault: string;
  fgMuted: string;
  fgSubtle: string;
  fgOnBrand: string;
  fgInverse: string;
  /** Muted text on `inverse` blocks (ink promo cards, dark bands). */
  fgInverseMuted: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  forest: string;
  forestSoft: string;
  forestSoftFg: string;
  success: string;
  successSoft: string;
  successSoftFg: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  dangerSoftFg: string;
  info: string;
  infoSoft: string;
  isDark: boolean;
}

/** Light palette — bone canvas. The app default. */
export const light: Palette = {
  // backgrounds
  canvas: bone[100], // #fbfbfa page
  surface: bone[50], // #ffffff card / sheet
  sunken: bone[200], // #f5f5f3 inset
  muted: bone[300], // #ececea hover / track
  inverse: ink[400], // #0e0e0d dark blocks
  scrim: "rgba(14, 14, 13, 0.56)",
  // foreground
  fg: ink[400], // #0e0e0d strong text / headings
  fgDefault: "#3a3a37", // ink-700 body
  fgMuted: ink[100], // #6f6f6c meta
  fgSubtle: "#828280", // ink-400 placeholder
  fgOnBrand: "#ffffff",
  fgInverse: bone[100],
  fgInverseMuted: "rgba(245, 245, 243, 0.7)",
  // borders (ink at low opacity)
  border: "rgba(14, 14, 13, 0.10)",
  borderSubtle: "rgba(14, 14, 13, 0.06)",
  borderStrong: "rgba(14, 14, 13, 0.18)",
  // secondary accents
  forest: forest[400], // #3f7048
  forestSoft: "#f5f8f5",
  forestSoftFg: forest[500],
  // status
  success: status.success, // #1f7a3f
  successSoft: "#d8ebe0",
  successSoftFg: "#0f4a26",
  warning: status.warning, // #b8860b
  warningSoft: "#f6e6bf",
  danger: status.danger, // #c2270e
  dangerSoft: "#f9d6cf",
  dangerSoftFg: "#7d1606",
  info: "#2e6aa3",
  infoSoft: "#cee0ee",
  isDark: false,
};

/** Dark palette — graphite surfaces for editorial dark screens. */
export const dark: Palette = {
  canvas: "#191918",
  canvasDeep: "#0e0e0d", // splash / immersive
  surface: "#232320",
  sunken: "#1f1f1d",
  muted: "rgba(255,255,255,0.08)",
  inverse: bone[100],
  scrim: "rgba(0, 0, 0, 0.6)",
  fg: "#f5f5f3",
  fgDefault: "rgba(245,245,243,0.86)",
  fgMuted: "rgba(245,245,243,0.62)",
  fgSubtle: "rgba(245,245,243,0.40)",
  fgOnBrand: "#ffffff",
  fgInverse: ink[400],
  fgInverseMuted: "rgba(14, 14, 13, 0.62)",
  border: "rgba(255,255,255,0.12)",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.22)",
  forest: "#6e9a76", // forest-300 reads better on dark
  forestSoft: "rgba(110,154,118,0.16)",
  forestSoftFg: "#a4c0a8",
  success: "#4ea16a",
  successSoft: "rgba(78,161,106,0.18)",
  successSoftFg: "#d8ebe0",
  warning: "#d69b1a",
  warningSoft: "rgba(214,155,26,0.18)",
  danger: "#df4a2e",
  dangerSoft: "rgba(223,74,46,0.20)",
  dangerSoftFg: "#f9d6cf",
  info: "#5188bd",
  infoSoft: "rgba(81,136,189,0.18)",
  isDark: true,
};
