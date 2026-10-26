import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { dur, enterStagger, spring, useReducedMotion } from "@shared/motion";
import { accent, gutter, type, usePalette } from "@shared/theme";
import { Btn, Icon, Screen } from "@shared/ui";

/** 07 · Success — account ready. Shown after a participant confirms their email. */
export default function Success(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const reduced = useReducedMotion();

  // Success-moment recipe (§3.2): disc springs 0.4→1 with visible overshoot
  // (`spring.disc`), content staggers in after, success haptic on arrival.
  const scale = useSharedValue(reduced ? 1 : 0.4);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    haptics.success();
    if (reduced) return;
    scale.value = withSpring(1, spring.disc);
    opacity.value = withTiming(1, { duration: dur.base });
  }, [reduced, scale, opacity]);

  const badgeStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }}>
        <Animated.View style={[{ marginBottom: 26 }, badgeStyle]}>
          <View style={{ position: "absolute", left: -16, right: -16, top: -16, bottom: -16, borderRadius: 999, backgroundColor: p.forestSoft }} />
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 999,
              backgroundColor: p.forest,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: p.forest,
              shadowOpacity: 0.45,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              // iOS shadows don't exist on Android — float the disc there too.
              elevation: 12,
            }}
          >
            <Icon name="check" size={46} color={p.fgOnBrand} sw={2.4} />
          </View>
        </Animated.View>

        <Animated.View entering={enterStagger(1)}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 30, leading: 1.05, track: -0.03, color: p.fg, align: "center" })}>
            {t("auth.success.title")}
            <Text style={{ color: accent.base }}>.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={enterStagger(2)}>
          <Text style={[type({ weight: 400, size: 15, leading: 1.5, color: p.fgMuted, align: "center" }), { marginTop: 12, maxWidth: 300 }]}>
            {t("auth.success.sub")}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={enterStagger(3)} style={{ paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Btn full variant="primary" iconRight="aright" onPress={() => router.replace("/discover")}>{t("auth.success.cta")}</Btn>
      </Animated.View>
    </Screen>
  );
}
