/**
 * Reduced-motion flag for the whole motion system.
 *
 * Reanimated's own `useReducedMotion()` snapshots the OS setting ONCE at module
 * load (its value is a module-level const) and never re-renders when the user
 * toggles "Reduce Motion" mid-session — so loops would keep animating. Since
 * every preset/loop consults this hook, we back it with a live
 * `AccessibilityInfo` subscription: seed from the Reanimated value for the very
 * first frame, then track `reduceMotionChanged` for the rest of the session.
 *
 * When true: staggers collapse to 0, springs become fast fades, shimmer/pulse
 * loops render static.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion as useReanimatedReducedMotion } from "react-native-reanimated";

export function useReducedMotion(): boolean {
  // Reanimated's value is correct at startup and safe on web/native — use it as
  // the initial state so the first render already reflects the OS setting.
  const initial = useReanimatedReducedMotion();
  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    let active = true;
    // Re-read once on mount (covers a change between module load and mount),
    // then subscribe to live toggles.
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      setReduced(v);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
