import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { BlurView } from "expo-blur";
import { useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { createSwipeTabs } from "@shared/nav/swipe-tabs";
import { useTabIndicator } from "@shared/ui/use-tab-indicator";
import { accent, radii, shadow, type, usePalette } from "@shared/theme";
import { haptics } from "@shared/lib/haptics";
import { Icon } from "@shared/ui";
import type { StringKey } from "@shared/i18n/strings";
import {
  TAB_BAR_H as BAR_H,
  TAB_BAR_PAD as BAR_PAD,
  TAB_BOTTOM_GAP as BOTTOM_GAP,
  TAB_SIDE_INSET as SIDE_INSET,
} from "@shared/ui/tab-bar-metrics";

const ITEMS: Record<string, { icon: string; label: StringKey }> = {
  discover: { icon: "compass", label: "tab.discover" },
  tickets: { icon: "ticket", label: "tab.tickets" },
  certificates: { icon: "award", label: "tab.certificates" },
  profile: { icon: "user", label: "tab.profile" },
};

const SwipeTabs = createSwipeTabs();

/**
 * Built with RN Animated (not Reanimated): the pager hands the bar a RN
 * Animated value. Everything animated is opacity or transform, and the active
 * label is a second stacked copy that cross-fades — colour is not animatable
 * here. The value itself comes from `useTabIndicator`, which glides on a tap
 * and tracks the finger on a swipe.
 */
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

  // Fractional nearness to this tab: 1 when centred, 0 at either neighbour, so
  // colour and lift follow the drag itself instead of snapping when it lands.
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
      style={{ width, alignItems: "center", justifyContent: "center", gap: 3, height: BAR_H - BAR_PAD * 2 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={{ width: 24, height: 24 }}>
          <Animated.View style={{ position: "absolute", opacity: rest }}>
            <Icon name={icon} size={24} sw={1.8} color={p.fgMuted} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", opacity: k }}>
            <Icon name={icon} size={24} sw={2.2} color={accent.base} />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Both copies get the full slot width. Sizing the box to the regular
          weight clipped the bold one ("Афи…") once it faded in. */}
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

function FloatingTabBar({ state, navigation, position }: MaterialTopTabBarProps): React.JSX.Element {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [barW, setBarW] = useState(0);
  // Tap = glide, swipe = follow the finger. See useTabIndicator.
  const indicator = useTabIndicator(position, state.index);

  const routes = state.routes.filter((r) => ITEMS[r.name]);
  const slotW = barW > 0 && routes.length > 0 ? (barW - BAR_PAD * 2) / routes.length : 0;

  // The lozenge reads the pager position directly, so a swipe *drags* it rather
  // than animating it to a destination once the gesture ends.
  const translateX = indicator.interpolate({
    inputRange: routes.map((_, i) => i),
    outputRange: routes.map((_, i) => BAR_PAD + i * slotW),
    extrapolate: "clamp",
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: SIDE_INSET,
        right: SIDE_INSET,
        bottom: Math.max(insets.bottom, 8) + BOTTOM_GAP,
      }}
    >
      <BlurView
        intensity={40}
        tint={p.isDark ? "dark" : "light"}
        onLayout={(e) => setBarW(Math.round(e.nativeEvent.layout.width))}
        style={[
          {
            flexDirection: "row",
            height: BAR_H,
            padding: BAR_PAD,
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
              top: BAR_PAD,
              left: 0,
              width: slotW,
              height: BAR_H - BAR_PAD * 2,
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
                haptics.select();
                // Always emit — re-tapping the active tab scrolls its feed to
                // the top (screens listen via `useScrollToTop`).
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabsLayout(): React.JSX.Element {
  return (
    <SwipeTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <FloatingTabBar {...props} />}
      // Tapping a tab switches instantly. The animated version had to slide the
      // pager through every screen in between — jumping from Discover to
      // Profile animated Tickets and Certificates on the way past, which costs
      // frames and shows content nobody asked for. Swiping is unaffected: that
      // transition is driven by the finger, not by this flag.
      screenOptions={{ swipeEnabled: true, animationEnabled: false, lazy: true }}
    >
      <SwipeTabs.Screen name="discover" />
      <SwipeTabs.Screen name="tickets" />
      <SwipeTabs.Screen name="certificates" />
      <SwipeTabs.Screen name="profile" />
    </SwipeTabs>
  );
}
