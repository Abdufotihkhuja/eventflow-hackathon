/**
 * The settings list — a titled card of rows, shared by the participant profile
 * and the organizer's Organization tab.
 *
 * It lives here rather than being written twice because the two surfaces are
 * the same control in two shells: an organizer who switches modes should not
 * meet a second, subtly different settings list. When one of them gains a row
 * type, both get it.
 */
import { Text, View } from "react-native";

import { AnimatedPressable } from "@shared/motion";
import { radii, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

/** A titled card grouping rows (the design's settings `Group`). */
export function SettingsGroup({
  title,
  children,
  first,
}: {
  title?: string;
  children: React.ReactNode;
  /** Drops the top margin — for the first group under a section that already
   *  spaced itself. */
  first?: boolean;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ marginTop: first ? 0 : 22 }}>
      {title ? (
        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            type({ weight: 600, size: 11, leading: 1.2, track: 0.04, color: p.fgMuted, transform: "uppercase" }),
            { marginHorizontal: 4, marginBottom: 10 },
          ]}
        >
          {title}
        </Text>
      ) : null}
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
}

/** A settings row: stroke icon + label + optional value/trailing + chevron.
 *  The icon sits bare — a tinted squircle behind every row icon is the most
 *  recognisably templated pattern in mobile UI, and it adds no meaning. */
export function SettingsRow({
  icon, label, sub, value, trailing, onPress, danger, last,
}: {
  icon: string;
  label: string;
  /** Second line — use it when the label alone would leave the row ambiguous. */
  sub?: string;
  value?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? label : undefined}
      onPress={onPress}
      disabled={!onPress}
      haptic={onPress ? "tap" : "none"}
      scaleTo={0.98}
      style={{
        flexDirection: "row", alignItems: "center", gap: 13,
        paddingHorizontal: 16, paddingVertical: sub ? 13 : 15,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: p.borderSubtle,
      }}
    >
      <Icon name={icon} size={18} color={danger ? p.danger : p.fgMuted} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.25, color: danger ? p.danger : p.fg })}>
          {label}
        </Text>
        {sub ? (
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={type({ weight: 500, size: 13, leading: 1.2, color: p.fgMuted })}>{value}</Text> : null}
      {trailing ?? (onPress && !danger ? <Icon name="cright" size={17} color={p.fgSubtle} /> : null)}
    </AnimatedPressable>
  );
}
