/**
 * OrgHeader — organizer work-surface header (design `org-kit.jsx` §1.3-ish /
 * org spec §1.1). Denser than the attendee TopBar: 16px gutter, always a
 * bottom hairline. Either a `pill` slot (ModePill on the org home) or a
 * title/sub block, with optional left/right IconBtn slots.
 */
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type, usePalette } from "@shared/theme";

export function OrgHeader({
  title,
  sub,
  left,
  right,
  pill,
  lead,
  below,
  large,
}: {
  title?: string;
  sub?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** ModePill (or any identity control) — replaces the title block. */
  pill?: React.ReactNode;
  /** A custom left block, for a masthead the title/sub pair cannot express
   *  (design 4.3 puts a dateline over a greeting there). Beats `title`/`sub`. */
  lead?: React.ReactNode;
  /** A second row inside the header, under the first — design 4.3 hangs the
   *  plan chip here, above the hairline rather than in the scroller. */
  below?: React.ReactNode;
  large?: boolean;
}): React.JSX.Element {
  const p = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexShrink: 0,
        paddingTop: insets.top,
        backgroundColor: p.canvas,
        borderBottomWidth: 1,
        borderBottomColor: p.borderSubtle,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          // A masthead is two stacked lines; the control beside it sits at the
          // TOP of them, not floating against their combined centre.
          alignItems: lead ? "flex-start" : "center",
          gap: 10,
          paddingTop: 4,
          paddingBottom: below ? 10 : 12,
          paddingHorizontal: 16,
          minHeight: 40,
        }}
      >
        {left}
        {lead ? (
          <View style={{ flex: 1, minWidth: 0 }}>{lead}</View>
        ) : pill ? (
          <View style={{ flex: 1 }}>{pill}</View>
        ) : (
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={type({ weight: 700, size: large ? 19 : 17, leading: 1.1, track: -0.02, color: p.fg })}
              >
                {title}
              </Text>
            ) : null}
            {sub ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={[type({ role: "mono", weight: 500, size: 11, leading: 1, color: p.fgMuted }), { marginTop: 3 }]}
              >
                {sub}
              </Text>
            ) : null}
          </View>
        )}
        {right}
      </View>
      {below ? <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>{below}</View> : null}
    </View>
  );
}
