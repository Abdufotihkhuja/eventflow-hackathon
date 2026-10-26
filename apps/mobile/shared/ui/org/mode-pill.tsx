/**
 * ModePill — the organizer header's persistent "you are organizing as…"
 * identity + switch affordance (design `org-kit.jsx` §1.2 / switch spec §5.4).
 * Ink pill · 24px OrgBadge (r7) · accent "ORGANIZING" eyebrow · org name ·
 * chevron. Tapping opens the ModeSheet (W5).
 *
 * `engaged` drives the §5.3 color morph: while the switcher is open / a switch
 * is committing, the pill blooms ink→accent ("color is the you-are-here
 * signal") and the chevron flips; both settle back when the sheet closes.
 */
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useI18n } from "@shared/i18n";
import { AnimatedPressable, dur, ease } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";
import { OrgBadge } from "./org-badge";

export function ModePill({
  name,
  hue = 22,
  logoUrl,
  engaged = false,
  onPress,
}: {
  name: string;
  hue?: number;
  logoUrl?: string;
  /** Morph the pill ink→accent while the mode switcher is open / committing. */
  engaged?: boolean;
  onPress?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const restBg = p.isDark ? p.surface : p.inverse;

  const morph = useSharedValue(engaged ? 1 : 0);
  useEffect(() => {
    morph.value = withTiming(engaged ? 1 : 0, { duration: dur.base, easing: ease.standard });
  }, [engaged, morph]);

  const pillStyle = useAnimatedStyle(
    () => ({ backgroundColor: interpolateColor(morph.value, [0, 1], [restBg, accent.base]) }),
    [restBg],
  );
  // The accent eyebrow would vanish on an accent pill — cross it to white.
  const eyebrowStyle = useAnimatedStyle(() => ({
    color: interpolateColor(morph.value, [0, 1], [accent.base, accent.on]),
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${morph.value * 180}deg` }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={t("a11y.switchMode")}
      haptic="tap"
      onPress={onPress}
      style={{ alignSelf: "flex-start", borderRadius: radii.pill }}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: 36,
            paddingLeft: 6,
            paddingRight: 10,
            borderRadius: radii.pill,
          },
          pillStyle,
        ]}
      >
        <OrgBadge name={name} hue={hue} size={24} src={logoUrl} />
        <View>
          <Animated.Text
            maxFontSizeMultiplier={1.2}
            style={[
              type({ role: "mono", weight: 600, size: 8, leading: 1, track: 0.08, transform: "uppercase" }),
              eyebrowStyle,
            ]}
          >
            {t("org.pill.organizing")}
          </Animated.Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[type({ weight: 700, size: 12, leading: 1, color: accent.on }), { marginTop: 3, maxWidth: 160 }]}
          >
            {name}
          </Text>
        </View>
        <Animated.View style={[{ opacity: 0.6 }, chevronStyle]}>
          <Icon name="cdown" size={15} color={accent.on} />
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}
