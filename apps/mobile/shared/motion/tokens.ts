/**
 * Motion tokens — the single source for every duration, easing, spring and
 * press-feedback constant in the app (GAP_PLAN §3.1). Hardcoded durations or
 * easings outside this module are a review-blocker after W0.
 *
 * Values trace back to the design kit: 150ms state transitions, efShimmer
 * 1.4s, efSpin 0.8s, spring sheets, scrim rgba(14,14,13,.56).
 */
import { Easing } from "react-native-reanimated";

/** Durations (ms). */
export const dur = {
  fast: 150,
  base: 220,
  slow: 320,
  sheet: 380,
  shimmer: 1400,
  spin: 800,
  /** live-dot / halo pulse loop */
  pulse: 1600,
  /** toast auto-dismiss hold */
  toast: 3500,
  /** welcome-hero Ken Burns drift (scale 1→1.08, loop-reverse) */
  kenBurns: 12000,
} as const;

/** Easing curves. `standard` mirrors the design's 150ms `transition: all .15s` feel. */
export const ease = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decel: Easing.out(Easing.cubic),
  accel: Easing.in(Easing.cubic),
} as const;

/** Spring presets (Reanimated `withSpring` configs). */
export const spring = {
  /** snappy press feedback, no overshoot */
  press: { damping: 20, stiffness: 300, mass: 0.6 },
  /** BottomSheet enter; exit = timing(dur.base, ease.accel) */
  sheet: { damping: 26, stiffness: 280, mass: 0.9 },
  /** efPop: check marks, hearts, badges (slight overshoot) */
  pop: { damping: 14, stiffness: 260, mass: 0.8 },
  /** success disc (visible overshoot — the "moment") */
  disc: { damping: 12, stiffness: 200, mass: 1 },
} as const;

/** Modal / sheet scrim (= light palette `p.scrim`, design `--bg-overlay`). */
export const scrim = "rgba(14, 14, 13, 0.56)";

/** Press scale for buttons/cards; rows use 0.98, large cards 0.96. */
export const pressScale = 0.97;

/** Android ripple tint — ink at 8% (design press treatment). */
export const ripple = "rgba(14, 14, 13, 0.08)";

/** Skeleton shimmer band colors (alpha-0 edge copies — never 'transparent'). */
export const shimmerBand = {
  light: { highlight: "rgba(245, 245, 243, 0.95)", edge: "rgba(245, 245, 243, 0)" },
  dark: { highlight: "rgba(255, 255, 255, 0.14)", edge: "rgba(255, 255, 255, 0)" },
} as const;

/** Grouped export for the theme barrel (`import { motion } from "@shared/theme"`). */
export const motion = { dur, ease, spring, scrim, pressScale, ripple } as const;
