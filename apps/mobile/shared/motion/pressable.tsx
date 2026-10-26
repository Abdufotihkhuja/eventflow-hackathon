/**
 * AnimatedPressable — the one press-feedback primitive (GAP_PLAN §3.1).
 *
 * Wraps `Pressable` with:
 *   • spring scale on press (`spring.press`, default `pressScale` 0.97);
 *   • an intent-typed haptic (`tap` / `press` / `select`), fired on press;
 *   • a default `android_ripple` (ink at 8%, `borderless` for icon targets);
 *   • auto hitSlop so any target measured under 44px still reaches 44px;
 *   • reduced-motion fallback: a 0.85 opacity dim instead of the scale.
 *
 * Adopted by Btn / IconBtn / Chip in W0; every bare `Pressable` migrates in
 * W1–W8. `style` is a static style (no `({pressed}) => …` function) — press
 * visuals are this component's job.
 */
import { useState } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { haptics } from "@shared/lib/haptics";

import { dur, pressScale, ripple, spring } from "./tokens";
import { useReducedMotion } from "./use-reduced-motion";

const APressable = Animated.createAnimatedComponent(Pressable);

const MIN_TARGET = 44;

export interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Haptic intent fired on press. Default none — callers opt in. */
  haptic?: "tap" | "press" | "select" | "none";
  /** Press scale override (0.97 buttons/chips, 0.98 rows, 0.96 large cards). */
  scaleTo?: number;
  /** Borderless (circular, unbounded) Android ripple — for icon-only targets. */
  rippleBorderless?: boolean;
  /**
   * Resting opacity, multiplied into the press animation.
   *
   * The press animation OWNS `opacity` (it is written by an animated style,
   * which is applied after — and therefore wins over — anything the caller puts
   * in `style`). So `style={{ opacity }}` on an AnimatedPressable silently does
   * nothing; that is how every disabled `Btn` in the app came to render at full
   * strength, indistinguishable from a live one. Route resting opacity here.
   */
  restOpacity?: number;
}

export function AnimatedPressable({
  style,
  haptic = "none",
  scaleTo = pressScale,
  rippleBorderless,
  restOpacity = 1,
  onPress,
  onPressIn,
  onPressOut,
  onLayout,
  android_ripple,
  hitSlop,
  disabled,
  ...rest
}: AnimatedPressableProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const [autoSlop, setAutoSlop] = useState<{ top: number; bottom: number; left: number; right: number }>();

  const pressedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dim.value * restOpacity,
  }));

  const handleLayout = (e: LayoutChangeEvent): void => {
    onLayout?.(e);
    if (hitSlop != null) return; // caller manages the target size
    const { width, height } = e.nativeEvent.layout;
    const v = Math.max(0, Math.ceil((MIN_TARGET - height) / 2));
    const h = Math.max(0, Math.ceil((MIN_TARGET - width) / 2));
    // Reconcile on every layout: a grown element (now ≥44px) must DROP its old
    // slop, or a stale oversized hit target lingers. Only re-set state on change.
    setAutoSlop((prev) => {
      if (!v && !h) return prev === undefined ? prev : undefined;
      if (prev && prev.top === v && prev.left === h) return prev;
      return { top: v, bottom: v, left: h, right: h };
    });
  };

  return (
    <APressable
      disabled={disabled}
      hitSlop={hitSlop ?? autoSlop}
      android_ripple={android_ripple ?? { color: ripple, borderless: !!rippleBorderless, foreground: !rippleBorderless }}
      onLayout={handleLayout}
      onPressIn={(e: GestureResponderEvent) => {
        if (reduced) dim.value = withTiming(0.85, { duration: dur.fast });
        else scale.value = withSpring(scaleTo, spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        // Reset BOTH channels — if `reduced` flipped between in and out, the
        // channel we animated on press-in must still be released here, or the
        // element stays dimmed/scaled forever.
        dim.value = withTiming(1, { duration: dur.fast });
        scale.value = withSpring(1, spring.press);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic !== "none") haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, pressedStyle]}
      {...rest}
    />
  );
}
