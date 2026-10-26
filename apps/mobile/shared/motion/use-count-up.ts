/**
 * useCountUp — number roll for KPI tiles / totals (GAP_PLAN §3.1).
 *
 * Drives a rAF tween (decel cubic) from the previous value to `target` and
 * returns the rounded in-flight integer. rAF + state (instead of a Reanimated
 * ReText) keeps it dependency-free and identical across native / web / jest;
 * a KPI count-up re-renders a single <Text> ~40× over 700ms, which is cheap.
 *
 * Render with `fontVariant: ["tabular-nums"]` so digits don't jitter.
 * Reduced motion (or `enabled: false`) jumps straight to the end value.
 */
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "./use-reduced-motion";

export function useCountUp(
  target: number,
  { duration = 700, enabled = true }: { duration?: number; enabled?: boolean } = {},
): number {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced && Number.isFinite(target);
  const [value, setValue] = useState(() => (animate ? 0 : target));
  const fromRef = useRef(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const t0 = Date.now();
    let raf = 0;
    const tick = (): void => {
      const t = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = target;
    };
  }, [target, duration, animate]);

  return value;
}
