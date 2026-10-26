/**
 * OrgTabBar — the organizer bottom bar, in the same floating-glass language as
 * the attendee one: a capsule inset from all three edges with a lozenge that
 * tracks the pager, plus a detached round Check-in button beside it.
 *
 * Check-in is deliberately NOT a tab — it pushes the full-screen scanner over
 * everything. In the old flush bar it was a raised FAB punched through the
 * middle of the row, which read as a fifth tab that behaved differently. Given
 * its own circle outside the capsule, the shape now says what it does.
 *
 * Built with RN Animated (not Reanimated) because the pager hands the bar a RN
 * Animated `position` — see `shared/nav/swipe-tabs`. The lozenge reads
 * `useTabIndicator` rather than that value directly, so a tap glides instead of
 * snapping while the screen behind it still switches instantly.
 */
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { AnimatedPressable } from "@shared/motion";
import { accent, radii, shadow, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";
import { useTabIndicator } from "../use-tab-indicator";
import { TAB_BAR_H, TAB_BAR_PAD, TAB_BOTTOM_GAP, TAB_SIDE_INSET } from "../tab-bar-metrics";

import type { StringKey } from "@shared/i18n/strings";

export type OrgTabKey = "home" | "events" | "scan" | "work" | "more";

/** Route name ⇄ tab metadata. `scan` is absent on purpose — it is a push. */
/** Route name ⇄ tab metadata, matching the design's four tabs:
 *  Главная · События · Работа · Ещё. There is deliberately no "Guests" tab —
 *  participants live inside an event (События → событие → Участники), and a
 *  second top-level entry to the same list was pure duplication. */
const ITEMS: Record<string, { icon: string; label: StringKey }> = {
  index: { icon: "grid", label: "org.tab.home" },
  events: { icon: "cal", label: "org.tab.events" },
  work: { icon: "list", label: "org.tab.work" },
  // Named for what it holds, not for "everything else": the tab carries the
  // organization's identity, plan, team and settings, and a bar reading "More"
  // over a screen headed "Organization" was two names for one place.
  profile: { icon: "building", label: "org.tab.org" },
};

const FAB = 54;

function TabItem({
  icon, label, index, position, onPress, selected, width,
}: {
  icon: string;
  label: string;
  index: number;
  /** Smoothed indicator value from `useTabIndicator`. */
  position: Animated.Value;
  onPress: () => void;
  selected: boolean;
  width: number;
}): React.JSX.Element {
  const p = usePalette();

  const k = position.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });
  const rest = k.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const scale = k.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width, alignItems: "center", justifyContent: "center", gap: 3, height: TAB_BAR_H - TAB_BAR_PAD * 2 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={{ width: 23, height: 23 }}>
          <Animated.View style={{ position: "absolute", opacity: rest }}>
            <Icon name={icon} size={23} sw={1.8} color={p.fgMuted} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", opacity: k }}>
            <Icon name={icon} size={23} sw={2.2} color={accent.base} />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Both weights get the full slot; sizing to the regular one clips the bold. */}
      <View style={{ width: Math.max(0, width - 6), height: 13 }}>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
          style={[
            type({ weight: 500, size: 10, leading: 1.2, color: p.fgMuted, align: "center" }),
            { position: "absolute", left: 0, right: 0, opacity: rest },
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.2}
          style={[
            type({ weight: 700, size: 10, leading: 1.2, color: accent.base, align: "center" }),
            { position: "absolute", left: 0, right: 0, opacity: k },
          ]}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

export function OrgTabBar({
  state, navigation, position, onScan,
}: MaterialTopTabBarProps & {
  /** Absent without `attendance:checkin` — the circle then does not exist,
   *  rather than opening a scanner whose every scan the API would refuse. */
  onScan?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [barW, setBarW] = useState(0);
  // Tap = glide, swipe = follow the finger. See useTabIndicator.
  const indicator = useTabIndicator(position, state.index);

  const routes = state.routes.filter((r) => ITEMS[r.name]);
  const slotW = barW > 0 && routes.length > 0 ? (barW - TAB_BAR_PAD * 2) / routes.length : 0;

  const translateX = indicator.interpolate({
    inputRange: routes.map((_, i) => i),
    outputRange: routes.map((_, i) => TAB_BAR_PAD + i * slotW),
    extrapolate: "clamp",
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: TAB_SIDE_INSET,
        right: TAB_SIDE_INSET,
        bottom: Math.max(insets.bottom, 8) + TAB_BOTTOM_GAP,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <BlurView
        intensity={40}
        tint={p.isDark ? "dark" : "light"}
        onLayout={(e) => setBarW(Math.round(e.nativeEvent.layout.width))}
        style={[
          {
            flex: 1,
            flexDirection: "row",
            height: TAB_BAR_H,
            padding: TAB_BAR_PAD,
            borderRadius: radii.pill,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: p.isDark ? "rgba(255,255,255,0.10)" : "rgba(14,14,13,0.06)",
            backgroundColor: p.isDark ? "rgba(25,25,24,0.62)" : "rgba(251,251,250,0.72)",
          },
          shadow.md,
        ]}
      >
        {slotW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: TAB_BAR_PAD,
              left: 0,
              width: slotW,
              height: TAB_BAR_H - TAB_BAR_PAD * 2,
              borderRadius: radii.pill,
              backgroundColor: p.isDark ? "rgba(255,255,255,0.10)" : accent.soft,
              transform: [{ translateX }],
            }}
          />
        ) : null}

        {routes.map((route, i) => {
          const meta = ITEMS[route.name] as { icon: string; label: StringKey };
          const on = state.index === i;
          return (
            <TabItem
              key={route.key}
              icon={meta.icon}
              label={t(meta.label)}
              index={i}
              position={indicator}
              selected={on}
              width={slotW || 0}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </BlurView>

      {/* Check-in — its own circle, because it opens the scanner rather than
          switching a tab. */}
      {onScan ? (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("org.tab.checkin")}
        haptic="press"
        scaleTo={0.92}
        onPress={onScan}
        style={[
          {
            width: FAB, height: FAB, borderRadius: radii.pill,
            backgroundColor: accent.base, alignItems: "center", justifyContent: "center",
          },
          shadow.glowWarm,
        ]}
      >
        <Icon name="qr" size={24} color={accent.on} />
      </AnimatedPressable>
      ) : null}
    </View>
  );
}
