/**
 * 18 (re-authored) · "Sent for review" success moment. The design's publish
 * celebration re-mapped for MODERATION semantics — the event is NOT live yet;
 * it's queued for review and publishes once approved. Forest success recipe
 * (disc springs 0.4→1 via spring.disc, success haptic, staggered content).
 * No confetti (design mandate). No share/copy link — there is no public URL
 * until the event is approved.
 */
import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { dur, enterStagger, spring, useReducedMotion } from "@shared/motion";
import { gutter, radii, type, usePalette } from "@shared/theme";
import { Btn, Icon, Screen } from "@shared/ui";

function NextStep({ n, text }: { n: number; text: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radii.pill,
          backgroundColor: p.forestSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={type({ role: "mono", weight: 700, size: 12, leading: 1, color: p.forestSoftFg })}>{n}</Text>
      </View>
      <Text style={[type({ weight: 500, size: 13, leading: 1.4, color: p.fgDefault }), { flex: 1 }]}>{text}</Text>
    </View>
  );
}

export default function EventSubmitted(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const { name } = useLocalSearchParams<{ name?: string }>();

  const scale = useSharedValue(reduced ? 1 : 0.4);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    haptics.success();
    if (reduced) return;
    scale.value = withSpring(1, spring.disc);
    opacity.value = withTiming(1, { duration: dur.base });
  }, [reduced, scale, opacity]);

  const badgeStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  const done = (): void => router.replace("/org/(tabs)/events");

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {/* Forest disc */}
        <Animated.View style={[{ marginBottom: 24 }, badgeStyle]}>
          <View style={{ position: "absolute", left: -16, right: -16, top: -16, bottom: -16, borderRadius: radii.pill, backgroundColor: p.forestSoft }} />
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: radii.pill,
              backgroundColor: p.forest,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: p.forest,
              shadowOpacity: 0.45,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              elevation: 12,
            }}
          >
            <Icon name="check" size={42} color={p.fgOnBrand} sw={2.6} />
          </View>
        </Animated.View>

        <Animated.View entering={enterStagger(1)}>
          <Text style={type({ role: "display", weight: 700, size: 26, leading: 1.05, track: -0.03, color: p.fg, align: "center" })}>
            {t("org.review.submitted.title")}
          </Text>
        </Animated.View>
        <Animated.View entering={enterStagger(2)}>
          <Text style={[type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted, align: "center" }), { marginTop: 8, maxWidth: 320 }]}>
            {t("org.review.submitted.body", { name: name ?? "" })}
          </Text>
        </Animated.View>

        {/* What's next */}
        <Animated.View
          entering={enterStagger(3)}
          style={{ marginTop: 24, alignSelf: "stretch", padding: 16, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, gap: 12 }}
        >
          <Text style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: p.fgSubtle, transform: "uppercase" })}>
            {t("org.review.submitted.next")}
          </Text>
          <NextStep n={1} text={t("org.review.submitted.step1")} />
          <NextStep n={2} text={t("org.review.submitted.step2")} />
        </Animated.View>
      </View>

      <Animated.View entering={enterStagger(4)} style={{ paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Btn full variant="primary" onPress={done}>
          {t("org.review.submitted.done")}
        </Btn>
      </Animated.View>
    </Screen>
  );
}
