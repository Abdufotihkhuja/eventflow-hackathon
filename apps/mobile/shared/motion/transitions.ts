/**
 * Canonical entrance/exit/layout presets (GAP_PLAN §3.1). Factories return a
 * fresh builder per call site; all respect the OS reduced-motion setting.
 *
 * Rules:
 *   • `enterStagger` ONLY on the first mount of a screen's above-the-fold
 *     blocks (max 6 items, 40ms step) — never re-stagger on data refresh.
 *   • Banners/toasts use `bannerIn`/`bannerOut`.
 *   • List row add/remove uses `crossFadeLayout` as the `layout` prop.
 */
import { Platform } from "react-native";
import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
  ZoomIn,
} from "react-native-reanimated";

import { dur, ease, spring } from "./tokens";

/**
 * react-native-reanimated's WEB layout-animation manager crashes during
 * cleanup (`setElementPosition` reads `snapshot.top` of undefined) whenever an
 * element carrying an `entering`/`exiting`/`layout` prop unmounts. Native is
 * unaffected. So the layout-class presets below no-op on web — the prop becomes
 * `undefined`, the element renders instantly, and nothing crashes. Imperative
 * animations (AnimatedPressable scale, shimmer, Ken Burns, hero parallax) drive
 * shared values, not this path, so they keep running on every platform.
 */
const WEB = Platform.OS === "web";

/** Staggered first-mount entrance: fade + 12px rise, 40ms per index (≤6). */
export const enterStagger = (i = 0) =>
  WEB
    ? undefined
    : FadeInDown.duration(dur.base)
        .delay(Math.min(i, 5) * 40)
        .easing(ease.decel)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
        .reduceMotion(ReduceMotion.System);

/** Plain crossfade pair (skeleton→content, tab content swaps). */
export const fadeIn = () => (WEB ? undefined : FadeIn.duration(dur.base).reduceMotion(ReduceMotion.System));
export const fadeOut = () => (WEB ? undefined : FadeOut.duration(dur.fast).reduceMotion(ReduceMotion.System));

/** Banner / toast entrance + exit. */
export const bannerIn = () => (WEB ? undefined : FadeInUp.duration(dur.fast).reduceMotion(ReduceMotion.System));
export const bannerOut = () => (WEB ? undefined : FadeOutUp.duration(dur.fast).reduceMotion(ReduceMotion.System));

/** Layout transition for list row add/remove/reorder. */
export const crossFadeLayout = () => (WEB ? undefined : LinearTransition.duration(dur.base).reduceMotion(ReduceMotion.System));

/** efPop — springy scale-in for check marks, digits, badges (`spring.pop`). */
export const popIn = () =>
  WEB
    ? undefined
    : ZoomIn.springify()
        .damping(spring.pop.damping)
        .stiffness(spring.pop.stiffness)
        .mass(spring.pop.mass)
        .reduceMotion(ReduceMotion.System);
