/**
 * BrandSplash — the launch screen, ported from the Claude Design board
 * "EventFlow · Экран загрузки", direction **B · Афиша**.
 *
 * Ink field; the lockup sits top-left; the promise is set large along the
 * bottom; a hairline rule fills left-to-right with the percentage beside it.
 * Values (28pt gutter, 38/1.06 display at -0.04em, 1px rule, 11px mono at
 * 0.06em) come straight from `app/splash.jsx` in that project.
 *
 * One deliberate change from the board: the design loops its progress forever
 * because a canvas has nothing to load. Here the bar tracks a real hand-off —
 * it reaches 100% exactly when the app is ready to show, and the screen leaves.
 * A progress bar that resets to 4% would be telling the user something untrue.
 */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { bone, ember, ink } from "@eventflow/ui-tokens";

import { useI18n } from "@shared/i18n";
import { ease, useReducedMotion } from "@shared/motion";
import { type } from "@shared/theme";

import { Wordmark } from "./wordmark";

/** How long the bar takes to fill. Also the screen's minimum on-stage time —
 *  see `app/index.tsx`, which holds the hand-off until it has elapsed. */
export const SPLASH_MS = 1400;

/** Bone canvas. The board draws direction B on ink; run light instead, which
 *  also means the splash hands over to the app's own bone canvas without a
 *  dark-to-light jolt. Shared with the native splash (`app.config.ts`) and the
 *  pre-font hold, so every frame of the launch is this one colour. */
export const SPLASH_BG = bone[100];

/** Type and rules, re-weighted for the light field — ink where the dark board
 *  used paper, and the bone divider in place of a white hairline. */
const FG = ink[400];
const RULE = bone[300];
const META = "#828280";

const GUTTER = 28;

export function BrandSplash(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const progress = useSharedValue(reduced ? 1 : 0);
  const rise = useSharedValue(reduced ? 1 : 0);
  const [pct, setPct] = useState(reduced ? 100 : 4);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withTiming(1, { duration: SPLASH_MS, easing: ease.standard });
    // .12s behind the field, matching the board's `.sp-rise` (700ms/standard).
    rise.value = withDelay(120, withTiming(1, { duration: 700, easing: ease.standard }));
  }, [reduced, progress, rise]);

  // The percentage is a real readout of the same value that drives the bar.
  // Only whole numbers cross to JS, so this costs at most ~96 updates.
  useAnimatedReaction(
    () => Math.round(4 + progress.value * 96),
    (v, prev) => {
      if (v !== prev) runOnJS(setPct)(v);
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: trackW * (0.04 + progress.value * 0.96),
  }), [trackW]);

  const riseStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 10 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      {/* The real lockup, not a mark plus a typed word: the board sets
          "eventflow" in Space Grotesk 300, which we neither ship at that weight
          nor need to fake when the brand SVG is right here. Kept small and
          top-left so the screen reads as a page, not a loading dialog. */}
      <View style={{ position: "absolute", top: insets.top + 15, left: GUTTER, right: GUTTER }}>
        <Wordmark size={34} />
      </View>

      <Animated.View
        style={[
          { position: "absolute", left: GUTTER, right: GUTTER, bottom: Math.max(insets.bottom, 34) + 98 },
          riseStyle,
        ]}
      >
        <Text
          style={type({ role: "display", weight: 400, size: 38, leading: 1.06, track: -0.04, color: FG })}
        >
          {t("splash.headline")}
          <Text style={{ color: ember[400] }}>.</Text>
        </Text>
      </Animated.View>

      <View
        style={{
          position: "absolute", left: GUTTER, right: GUTTER, bottom: Math.max(insets.bottom, 34) + 44,
          flexDirection: "row", alignItems: "center", gap: 14,
        }}
      >
        <View
          onLayout={(e) => setTrackW(Math.round(e.nativeEvent.layout.width))}
          style={{ flex: 1, height: 1, backgroundColor: RULE, overflow: "hidden" }}
        >
          <Animated.View style={[{ height: 1, backgroundColor: ember[400] }, fillStyle]} />
        </View>
        <Text
          allowFontScaling={false}
          style={[
            type({ role: "mono", weight: 500, size: 11, leading: 1.4, track: 0.06, color: META }),
            { fontVariant: ["tabular-nums"] },
          ]}
        >
          {pct}%
        </Text>
      </View>
    </View>
  );
}
