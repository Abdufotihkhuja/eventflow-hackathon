/**
 * SwipeRow — a list row with one decision behind each edge (design 4.8:
 * «Свайп вправо — одобрить, влево — отклонить»).
 *
 * Gesture plumbing is a core `PanResponder` feeding a Reanimated shared value,
 * the same recipe `BottomSheet` uses — deliberately NOT
 * react-native-gesture-handler, which is not a dependency of this app and would
 * pull in native configuration for one gesture.
 *
 * The row claims only clear HORIZONTAL drags, so the vertical list still wins
 * every scroll, and the row's own Pressable still wins taps and long-presses.
 *
 * Behaviour:
 *  • the foreground follows the finger, resisted past the panel width so the
 *    row cannot be dragged off screen;
 *  • the panel behind the travelled edge is revealed and grows to full colour
 *    as the drag approaches the trigger point;
 *  • crossing the trigger fires ONE haptic — the "you can let go now" signal
 *    that makes a swipe feel committed rather than guessed;
 *  • releasing past the trigger (or with enough velocity) runs the action;
 *    anything less springs back.
 */
import { useMemo, useRef } from "react";
import { PanResponder, Text, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { haptics } from "@shared/lib/haptics";
import { spring } from "@shared/motion";
import { radii, type } from "@shared/theme";

import { Icon } from "./icon";

/** Panel width — the design's 88px reveal. Also the travel that arms an action. */
const PANEL = 88;
/** Past this the action is armed; below it the row springs back. */
const TRIGGER = 72;
/** A flick this fast commits even on a short drag (px/ms). */
const FLICK = 0.6;
/** Horizontal intent: claim the gesture only once it is clearly sideways. */
const CLAIM = 8;

export interface SwipeAction {
  /** Icon glyph drawn on the panel. */
  icon: string;
  label: string;
  /** Panel fill — a strong, solid colour; content is drawn on it in white. */
  color: string;
  onTrigger: () => void;
}

export function SwipeRow({
  children,
  right,
  left,
  enabled = true,
  radius = radii.card,
}: {
  children: React.ReactNode;
  /** Revealed by swiping RIGHT (panel sits on the left edge). */
  right?: SwipeAction;
  /** Revealed by swiping LEFT (panel sits on the right edge). */
  left?: SwipeAction;
  enabled?: boolean;
  radius?: number;
}): React.JSX.Element {
  const tx = useSharedValue(0);
  // Mirrors `tx` on the JS thread: PanResponder callbacks are JS-side, and
  // reading a shared value there mid-gesture is not reliable.
  const current = useRef(0);
  // One haptic per crossing, not one per frame.
  const armed = useRef(false);

  const canRight = !!right && enabled;
  const canLeft = !!left && enabled;

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Never claim on touch-down: taps and long-presses belong to the row.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => {
          if (!canRight && !canLeft) return false;
          // Sideways intent only — a vertical drag is the list scrolling.
          if (Math.abs(g.dx) < CLAIM || Math.abs(g.dx) <= Math.abs(g.dy)) return false;
          return g.dx > 0 ? canRight : canLeft;
        },
        onPanResponderGrant: () => {
          armed.current = false;
        },
        onPanResponderMove: (_e, g) => {
          let next = g.dx;
          if ((next > 0 && !canRight) || (next < 0 && !canLeft)) next = 0;
          // Rubber-band past the panel: the row keeps responding but stops
          // running away, so the reveal reads as a fixed-size drawer.
          const over = Math.abs(next) - PANEL;
          if (over > 0) next = Math.sign(next) * (PANEL + over * 0.25);
          current.current = next;
          tx.value = next;

          const past = Math.abs(next) >= TRIGGER;
          if (past !== armed.current) {
            armed.current = past;
            if (past) haptics.select();
          }
        },
        onPanResponderRelease: (_e, g) => {
          const dx = current.current;
          const commit = Math.abs(dx) >= TRIGGER || Math.abs(g.vx) >= FLICK;
          const action = dx > 0 ? right : left;
          const allowed = dx > 0 ? canRight : canLeft;

          current.current = 0;
          armed.current = false;
          // Always return home: the row either leaves the list (the caller's
          // filter drops it) or stays, and a half-open row is neither.
          tx.value = withSpring(0, spring.press);
          if (commit && allowed && action) runOnJS(action.onTrigger)();
        },
        onPanResponderTerminate: () => {
          current.current = 0;
          armed.current = false;
          tx.value = withSpring(0, spring.press);
        },
      }),
    [canRight, canLeft, right, left, tx],
  );

  const foreground = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  // Each panel fades in over its own half of the travel, so the colour arrives
  // with the gesture instead of sitting there fully lit from the first pixel.
  const rightPanel = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, TRIGGER], [0, 1], "clamp"),
  }));
  const leftPanel = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-TRIGGER, 0], [1, 0], "clamp"),
  }));

  return (
    <View style={{ borderRadius: radius, overflow: "hidden" }}>
      {/* Panels sit UNDER the row and are revealed by its travel. */}
      {canRight && right ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: 0, top: 0, bottom: 0, width: PANEL, backgroundColor: right.color, alignItems: "center", justifyContent: "center", gap: 5 },
            rightPanel,
          ]}
        >
          <Icon name={right.icon} size={19} sw={2.6} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11, leading: 1, color: "#ffffff" })}>
            {right.label}
          </Text>
        </Animated.View>
      ) : null}
      {canLeft && left ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", right: 0, top: 0, bottom: 0, width: PANEL, backgroundColor: left.color, alignItems: "center", justifyContent: "center", gap: 5 },
            leftPanel,
          ]}
        >
          <Icon name={left.icon} size={19} sw={2.6} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11, leading: 1, color: "#ffffff" })}>
            {left.label}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View {...responder.panHandlers} style={foreground}>
        {children}
      </Animated.View>
    </View>
  );
}
