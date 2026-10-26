/**
 * BottomSheet — a premium bottom-sheet modal: the scrim FADES in while the sheet
 * SLIDES up (and both reverse on close). RN's built-in `animationType="slide"`
 * slides the WHOLE modal — scrim included — up from the bottom, so you see the
 * dark overlay rising; this drives the scrim opacity and sheet translateY
 * separately with Reanimated. The sheet stays mounted through the exit animation.
 *
 * Drag-to-dismiss (GAP_PLAN §3.2 sheet recipe) uses a core PanResponder feeding
 * a Reanimated shared value — NO react-native-gesture-handler. The sheet follows
 * the finger; releasing past 120px or faster than 800px/s dismisses, otherwise
 * it springs back. Vertical child scrollers still win the gesture (the sheet
 * only claims clear downward drags on non-scrolling areas).
 */
import { useEffect, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, View, type DimensionValue, type LayoutChangeEvent } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dur, ease, spring } from "@shared/motion";
import { haptics } from "@shared/lib/haptics";
import { usePalette } from "@shared/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DISMISS_DRAG = 120; // px
const DISMISS_VELOCITY = 0.8; // px/ms == 800 px/s
// Top band that counts as "the grabber" for the catch haptic (grabber = 10px
// top padding + 4px handle + a little slack).
const GRABBER_ZONE = 28; // px

export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.9,
  closeLabel = "Close",
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Sheet height ceiling as a fraction of the screen (0–1). */
  maxHeightRatio?: number;
  /** a11y label for the dismiss backdrop. */
  closeLabel?: string;
}): React.JSX.Element | null {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0); // 0 = closed, 1 = open
  const dragY = useSharedValue(0); // finger-follow offset while dragging
  const sheetH = useSharedValue(600); // measured on layout

  // The pan responder is created once; keep the latest onClose reachable.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.value = 0;
      progress.value = withSpring(1, spring.sheet);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: dur.base, easing: ease.accel }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Claim clear downward drags only — taps and horizontal swipes pass through,
      // and vertical child ScrollViews negotiate the gesture first.
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: (e) => {
        // §3.2: haptic on the GRABBER catch only — the grabber sits in the top
        // ~28px of the sheet. Dragging the body scrolls/dismisses silently.
        if (e.nativeEvent.locationY <= GRABBER_ZONE) haptics.tap();
      },
      onPanResponderMove: (_e, g) => {
        // Follow the finger down; rubber-band upward pulls.
        dragY.value = g.dy > 0 ? g.dy : g.dy / 3;
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) onCloseRef.current();
        else dragY.value = withSpring(0, spring.sheet);
      },
      onPanResponderTerminate: () => {
        dragY.value = withSpring(0, spring.sheet);
      },
    }),
  ).current;

  const scrimStyle = useAnimatedStyle(() => {
    const h = Math.max(sheetH.value, 1);
    const dragFade = Math.min(1, Math.max(0, 1 - dragY.value / h));
    return { opacity: progress.value * dragFade };
  });
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (sheetH.value + insets.bottom + 48) + Math.max(dragY.value, -24) }],
  }));

  if (!mounted) return null;

  const maxHeight = `${Math.round(maxHeightRatio * 100)}%` as DimensionValue;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={[
          { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: p.scrim },
          scrimStyle,
        ]}
      />
      <Animated.View
        accessibilityViewIsModal
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) => {
          sheetH.value = e.nativeEvent.layout.height;
        }}
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight,
            backgroundColor: p.canvas,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 8,
          },
          sheetStyle,
        ]}
      >
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: p.muted }} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}
