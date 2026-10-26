/**
 * Tag — small static status chip (Featured / Free / Confirmed / 94% full / …).
 * Chip — interactive filter control (category selectors), with active state.
 *
 * Both are cut square-ish, not pill. DESIGN.md sets the radius ramp at 2/4/6
 * and bans pill cards outright; a rail of full-round chips is also the single
 * most generic control on mobile. Sharp corners are what make this feed look
 * like a publication rather than a settings screen.
 */
import { Text, View } from "react-native";

import { AnimatedPressable } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

type Tone = "neutral" | "accent" | "forest" | "success" | "danger" | "live";

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }): React.JSX.Element {
  const p = usePalette();
  const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
    neutral: { bg: p.isDark ? "rgba(255,255,255,0.08)" : p.sunken, fg: p.fgMuted, border: "transparent" },
    accent: { bg: accent.soft, fg: accent.ink, border: "transparent" },
    forest: { bg: p.forestSoft, fg: p.forestSoftFg, border: "transparent" },
    success: { bg: p.successSoft, fg: p.successSoftFg, border: "transparent" },
    danger: { bg: p.dangerSoft, fg: p.dangerSoftFg, border: "transparent" },
    live: { bg: "transparent", fg: p.danger, border: p.danger },
  };
  const t = tones[tone];
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 5, height: 24,
        paddingHorizontal: 9, borderRadius: radii.sm,
        backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
      }}
    >
      {tone === "live" ? (
        <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: p.danger }} />
      ) : null}
      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 11, leading: 1, track: 0.01, color: t.fg })}>{children}</Text>
    </View>
  );
}

export function Chip({
  children, active, icon, onPress,
}: {
  children: React.ReactNode;
  active?: boolean;
  icon?: string;
  onPress?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const bg = active ? (p.isDark ? p.fg : p.inverse) : p.isDark ? "rgba(255,255,255,0.06)" : p.surface;
  const fg = active ? (p.isDark ? p.canvas : "#fff") : p.fgDefault;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      haptic="select"
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        height: 36, paddingHorizontal: 14, borderRadius: radii.md,
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: bg, borderWidth: 1, borderColor: active ? "transparent" : p.border,
      }}
    >
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, track: -0.005, color: fg })}>{children}</Text>
    </AnimatedPressable>
  );
}
