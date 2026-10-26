/**
 * Single-clock shimmer (GAP_PLAN §3.1). `ShimmerProvider` hosts ONE repeating
 * 0→1 progress loop; every `Skeleton` on screen maps it to its own gradient
 * sweep, so all skeletons shimmer in phase (design: "synchronized clock").
 *
 * The loop is reference-counted: it only runs while at least one consumer is
 * mounted on a FOCUSED screen, and never under reduced motion (consumers get
 * `null` and render a static tint instead).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { dur } from "./tokens";
import { useReducedMotion } from "./use-reduced-motion";
import { useScreenFocused } from "./use-screen-focused";

interface ShimmerClock {
  progress: SharedValue<number>;
  /** Register a consumer; returns the release fn. Clock runs while ≥1 held. */
  retain: () => () => void;
}

const ShimmerCtx = createContext<ShimmerClock | null>(null);

export function ShimmerProvider({ children }: PropsWithChildren): React.JSX.Element {
  const progress = useSharedValue(0);
  const holds = useRef(0);
  const running = useRef(false);

  const retain = useCallback(() => {
    holds.current += 1;
    if (!running.current) {
      running.current = true;
      progress.value = 0;
      progress.value = withRepeat(withTiming(1, { duration: dur.shimmer, easing: Easing.linear }), -1, false);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holds.current -= 1;
      if (holds.current === 0 && running.current) {
        running.current = false;
        cancelAnimation(progress);
        progress.value = 0;
      }
    };
  }, [progress]);

  const value = useMemo<ShimmerClock>(() => ({ progress, retain }), [progress, retain]);
  return <ShimmerCtx.Provider value={value}>{children}</ShimmerCtx.Provider>;
}

/**
 * Shared shimmer progress (0→1, 1.4s loop) — or `null` when the sweep should
 * not run (no provider, reduced motion, or the host screen is blurred).
 */
export function useShimmer(): SharedValue<number> | null {
  const clock = useContext(ShimmerCtx);
  const reduced = useReducedMotion();
  const focused = useScreenFocused();
  const active = !!clock && !reduced && focused;

  useEffect(() => {
    if (!clock || !active) return;
    return clock.retain();
  }, [clock, active]);

  return active && clock ? clock.progress : null;
}
