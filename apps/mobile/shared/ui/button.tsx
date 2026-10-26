/**
 * Btn / IconBtn — the kit's button system ported to Pressable.
 *
 * Variants: primary (ember), ink (graphite), secondary (outline), soft (ember
 * tint), ghost, glass (translucent overlay). Sizes sm/md/lg. Adds the things a
 * 2026 native button needs that a web mock can't: a spring press scale (via
 * the shared AnimatedPressable), light haptics, a loading spinner, and a
 * ≥44px touch target by default. Primary darkens to the tokenized press color
 * while held; `glow` opts the hero CTA into the warm ember halo.
 */
import { useState } from "react";
import { ActivityIndicator, Text, type ViewStyle } from "react-native";

import { AnimatedPressable } from "@shared/motion";
import { accent, controlH, radii, shadow, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

type Variant = "primary" | "ink" | "secondary" | "soft" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

export interface BtnProps {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: string;
  iconRight?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** force dark styling regardless of the surrounding palette */
  dark?: boolean;
  /** warm ember halo for the one hero CTA per view (design `glowWarm`). */
  glow?: boolean;
  style?: ViewStyle;
  haptic?: "tap" | "press" | "none";
}

export function Btn({
  children, variant = "primary", size = "lg", full, icon, iconRight,
  onPress, disabled, loading, dark: darkProp, glow, style, haptic = "tap",
}: BtnProps): React.JSX.Element {
  const p = usePalette();
  const dark = darkProp ?? p.isDark;
  const [pressed, setPressed] = useState(false);
  const H = controlH[size];
  const fs = size === "sm" ? 13 : 15;
  const iconSize = size === "sm" ? 16 : 18;

  const fills: Record<Variant, { bg: string; fg: string; border: string; sh?: ViewStyle }> = {
    primary: {
      bg: pressed && !disabled ? accent.press : accent.base,
      fg: accent.on,
      border: "transparent",
      sh: glow ? shadow.glowWarm : shadow.xs,
    },
    ink: { bg: dark ? p.fg : p.inverse, fg: dark ? p.canvas : "#fff", border: "transparent" },
    secondary: { bg: dark ? "rgba(255,255,255,0.08)" : p.surface, fg: dark ? p.fg : p.fg, border: dark ? p.border : p.border },
    soft: { bg: accent.soft, fg: accent.ink, border: "transparent" },
    ghost: { bg: "transparent", fg: dark ? p.fg : p.fg, border: "transparent" },
    glass: { bg: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)", fg: dark ? "#fff" : p.fg, border: dark ? "rgba(255,255,255,0.2)" : p.border },
  };
  const v = fills[variant];
  const fg = v.fg;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      haptic={haptic}
      hitSlop={size === "sm" ? { top: 6, bottom: 6 } : undefined}
      // Via the prop, NOT `style.opacity`: the press animation writes opacity
      // last and would overwrite a static value, leaving a dead button looking
      // exactly like a live one.
      restOpacity={disabled ? 0.45 : 1}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          height: H,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          alignSelf: full ? "stretch" : "flex-start",
          width: full ? "100%" : undefined,
          paddingHorizontal: size === "sm" ? 14 : 20,
          borderRadius: radii.control,
          borderWidth: 1,
          borderColor: v.border,
          backgroundColor: v.bg,
        },
        v.sh,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          {children != null ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: fs, leading: 1, track: -0.005, color: fg })}>
              {children}
            </Text>
          ) : null}
          {iconRight ? <Icon name={iconRight} size={iconSize} color={fg} /> : null}
        </>
      )}
    </AnimatedPressable>
  );
}

export interface IconBtnProps {
  name: string;
  size?: number;
  glass?: boolean;
  active?: boolean;
  /** when `active`, paint the glyph filled + bright ember (e.g. a liked heart) */
  fill?: boolean;
  onPress?: () => void;
  dark?: boolean;
  sw?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function IconBtn({
  name, size = 44, glass, active, fill, onPress, dark: darkProp, sw, style, accessibilityLabel,
}: IconBtnProps): React.JSX.Element {
  const p = usePalette();
  const dark = darkProp ?? p.isDark;
  const filled = !!fill && !!active;
  const bg = glass
    ? dark ? "rgba(20,20,19,0.5)" : "rgba(255,255,255,0.72)"
    : active ? accent.soft : dark ? "rgba(255,255,255,0.08)" : p.surface;
  // A filled/liked glyph pops in bright ember; otherwise the usual active ink.
  const fg = filled ? accent.base : active ? accent.ink : glass && dark ? "#fff" : p.fg;
  const border = glass
    ? dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.5)"
    : dark ? p.border : p.border;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic="tap"
      hitSlop={6}
      onPress={onPress}
      style={[
        {
          width: size, height: size, borderRadius: radii.control,
          alignItems: "center", justifyContent: "center",
          backgroundColor: bg, borderWidth: 1, borderColor: border,
        },
        style,
      ]}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={fg} sw={sw} fill={filled} />
    </AnimatedPressable>
  );
}
