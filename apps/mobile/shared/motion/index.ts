/** Shared motion system (GAP_PLAN §3) — tokens, press feedback, transitions,
 *  shimmer clock, count-up, and the reduced-motion / screen-focus gates. */
export { dur, ease, spring, scrim, pressScale, ripple, shimmerBand, motion } from "./tokens";
export { AnimatedPressable, type AnimatedPressableProps } from "./pressable";
export { enterStagger, fadeIn, fadeOut, bannerIn, bannerOut, crossFadeLayout, popIn } from "./transitions";
export { ShimmerProvider, useShimmer } from "./shimmer";
export { useCountUp } from "./use-count-up";
export { useReducedMotion } from "./use-reduced-motion";
export { useScreenFocused } from "./use-screen-focused";
