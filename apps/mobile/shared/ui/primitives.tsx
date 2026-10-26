/**
 * Small shared primitives: Meter (progress), MetaRow (icon+label+value),
 * Rail (section header with optional action), Divider, Spinner, Skeleton,
 * and StateBlock (empty / error / success hero).
 */
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, Text, View, type ViewStyle, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { shimmerBand, useShimmer } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

export function Divider({ style }: { style?: ViewStyle }): React.JSX.Element {
  const p = usePalette();
  return <View style={[{ height: 1, backgroundColor: p.border }, style]} />;
}

export function Meter({ pct }: { pct: number }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ height: 5, borderRadius: radii.pill, backgroundColor: p.isDark ? "rgba(255,255,255,0.12)" : p.muted, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", backgroundColor: accent.base, borderRadius: radii.pill }} />
    </View>
  );
}

export function MetaRow({
  icon, label, value, accent: isAccent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}): React.JSX.Element {
  const p = usePalette();
  // The icon sits bare on the canvas. Boxing every icon in a tinted squircle is
  // the most template-looking pattern there is, and DESIGN.md asks for stroke
  // icons in ink — the label already carries the meaning.
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 }}>
      <Icon name={icon} size={17} color={p.fgMuted} />
      <View style={{ flex: 1, minWidth: 0, marginTop: -1 }}>
        <Text style={type({ role: "mono", weight: 500, size: 10, leading: 1, track: 0.12, color: p.fgMuted, transform: "uppercase" })}>{label}</Text>
        <Text style={[type({ weight: 600, size: 15, leading: 1.3, color: isAccent ? accent.ink : p.fg }), { marginTop: 5 }]}>{value}</Text>
      </View>
    </View>
  );
}

export function Rail({
  title, action, onAction, children, pad,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  pad?: boolean;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: pad ? 20 : 0, marginBottom: 12 }}>
        <Text style={type({ role: "display", weight: 700, size: 19, leading: 1.2, track: -0.025, color: p.fg })}>{title}</Text>
        {action ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            // ~13px text row — hitSlop lifts the touch target to ≥44px.
            hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{action}</Text>
            <Icon name="cright" size={14} color={accent.ink} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Spinner({ size = 28 }: { size?: number }): React.JSX.Element {
  return <ActivityIndicator size={size > 30 ? "large" : "small"} color={accent.base} />;
}

export function Skeleton({
  w = "100%", h = 14, r = 6, style,
}: {
  w?: DimensionValue;
  h?: number;
  r?: number;
  style?: ViewStyle;
}): React.JSX.Element {
  const p = usePalette();
  // Single shared shimmer clock (all skeletons sweep in phase); null when
  // there's no provider, reduced motion is on, or the screen is blurred —
  // then we render the static base tint.
  const progress = useShimmer();
  const [width, setWidth] = useState(0);
  const band = p.isDark ? shimmerBand.dark : shimmerBand.light;

  const sweep = useAnimatedStyle(() => {
    if (!progress || width <= 0) return { opacity: 0 };
    // Sweep the highlight band from fully off-left to fully off-right.
    return { opacity: 1, transform: [{ translateX: -width + progress.value * width * 2 }] };
  }, [progress, width]);

  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[
        {
          width: w,
          height: h,
          borderRadius: r,
          overflow: "hidden",
          backgroundColor: p.isDark ? "rgba(255,255,255,0.09)" : p.muted,
        },
        style,
      ]}
    >
      {progress && width > 0 ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, width }, sweep]}>
          <LinearGradient
            colors={[band.edge, band.highlight, band.edge]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Empty / error block. Deliberately NOT the centred icon-in-a-tinted-blob that
 * every template ships: that shape floats a shrug in the middle of a void, and
 * repeating it four times down one screen (which the event page used to do)
 * reads as filler. This is an editorial card — hairline rule, stroke icon,
 * left-aligned copy, action inline — so an empty section costs one card of
 * height instead of a screenful.
 */
export function StateBlock({
  icon, title, body, action, tone,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  tone?: "error";
}): React.JSX.Element {
  const p = usePalette();
  const c = tone === "error" ? p.danger : p.fgMuted;
  const rule = tone === "error" ? "rgba(194,39,14,0.24)" : p.border;
  return (
    <View
      style={{
        borderWidth: 1, borderColor: tone === "error" ? p.dangerSoft : p.border,
        borderRadius: radii.card, backgroundColor: tone === "error" ? p.dangerSoft : p.surface,
        paddingHorizontal: 20, paddingVertical: 20,
      }}
    >
      {/* Icon sits in a break in the rule — centred, but a typographic mark
          rather than the tinted-blob badge this used to be. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: rule }} />
        <Icon name={icon} size={16} color={c} />
        <View style={{ flex: 1, height: 1, backgroundColor: rule }} />
      </View>
      <Text style={type({ role: "display", weight: 700, size: 17, leading: 1.24, track: -0.02, align: "center", color: tone === "error" ? p.dangerSoftFg : p.fg })}>{title}</Text>
      {body ? (
        <Text style={[type({ weight: 400, size: 14, leading: 1.5, align: "center", color: tone === "error" ? p.dangerSoftFg : p.fgMuted }), { marginTop: 6, maxWidth: 320, alignSelf: "center", opacity: tone === "error" ? 0.85 : 1 }]}>{body}</Text>
      ) : null}
      {action ? <View style={{ marginTop: 16, alignSelf: "center" }}>{action}</View> : null}
    </View>
  );
}
