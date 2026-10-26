/**
 * The value a floating tab bar should animate its lozenge (and icon/label
 * cross-fades) from.
 *
 * The two navigators run with `animationEnabled: false` so tapping a far tab
 * does not page the content through every screen in between. That also makes
 * the pager's own `position` jump a whole page at once, which snapped the
 * indicator instead of moving it. This hook separates the two:
 *
 *   • a swipe produces a stream of small deltas — follow them exactly, so the
 *     indicator is dragged by the finger;
 *   • a tap produces one big jump — ignore it and spring to the new index
 *     ourselves, so the indicator travels while the screen is already there.
 *
 * Driven on the JS thread on purpose: the drag path has to go through a
 * listener anyway, and mixing `setValue` into a natively-driven node is the
 * kind of thing that works until it doesn't. One transform and a few opacities
 * on a four-item bar is not a budget worth defending.
 */
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";

/** Above this, a change is a page jump rather than a finger. A drag emits many
 *  fractions of this per frame; a tap emits ≥1 in one go. */
const DRAG_STEP = 0.34;

/** Matches the attendee bar's original travel feel: settles with one small
 *  overshoot — the difference between "snapped" and "moved". */
const TRAVEL = { damping: 20, stiffness: 210, mass: 0.9 } as const;

export function useTabIndicator(
  position: MaterialTopTabBarProps["position"],
  index: number,
): Animated.Value {
  const anim = useRef(new Animated.Value(index)).current;
  const last = useRef(index);

  useEffect(() => {
    const id = position.addListener(({ value }: { value: number }) => {
      const delta = Math.abs(value - last.current);
      last.current = value;
      if (delta >= DRAG_STEP) return; // a tap — the spring below owns it
      anim.stopAnimation();
      anim.setValue(value);
    });
    return () => position.removeListener(id);
  }, [position, anim]);

  useEffect(() => {
    last.current = index;
    Animated.spring(anim, { toValue: index, useNativeDriver: false, ...TRAVEL }).start();
  }, [index, anim]);

  return anim;
}
