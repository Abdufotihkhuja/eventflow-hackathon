/**
 * TopBar — in-app header with the safe-area top inset baked in.
 *
 * `large` renders the editorial display title (Space Grotesk 30) with an
 * optional ember `accentTitle` fragment; the compact form is a centered 17px
 * title with left / right slots. `sub` is mono metadata.
 */
import { BlurView } from "expo-blur";
import { Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { accent, gutter, type, usePalette } from "@shared/theme";

/** Width kept clear on each side of a centred title so a long one truncates
 *  before it can run under the back button or a trailing action. */
const SLOT_RESERVE = 48;

export function TopBar({
  title, sub, left, right, large, accentTitle, border, floating, onHeight,
}: {
  title?: string;
  sub?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  large?: boolean;
  accentTitle?: string;
  border?: boolean;
  /** Pin the bar over the scroll region on frosted glass, so content passes
   *  beneath it instead of stopping at a hard opaque edge. */
  floating?: boolean;
  /** Measured height — a floating bar overlays the scroller, so the screen has
   *  to pad its content by this much. */
  onHeight?: (h: number) => void;
}): React.JSX.Element {
  const p = usePalette();
  const insets = useSafeAreaInsets();

  const measure = onHeight
    ? (e: LayoutChangeEvent) => onHeight(Math.round(e.nativeEvent.layout.height))
    : undefined;

  const frame = {
    paddingTop: insets.top + 4,
    // No rule under a floating bar. The blur already separates the two layers,
    // and a hairline right against the first card read as the header being
    // glued to the body. A solid bar still gets one when it asks (`border`).
    borderBottomWidth: border && !floating ? 1 : 0,
    borderBottomColor: p.borderSubtle,
  } as const;

  const Wrapper = floating ? BlurView : View;
  const wrapperProps = floating
    ? {
        intensity: 32,
        tint: (p.isDark ? "dark" : "light") as "dark" | "light",
        style: {
          ...frame,
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          backgroundColor: p.isDark ? "rgba(25,25,24,0.72)" : "rgba(251,251,250,0.72)",
        },
      }
    : { style: { ...frame, backgroundColor: p.canvas } };

  return (
    <Wrapper onLayout={measure} {...wrapperProps}>
      <View
        style={{
          justifyContent: "center", minHeight: 44,
          paddingHorizontal: gutter, paddingTop: large ? 4 : 6, paddingBottom: large ? 0 : 12,
        }}
      >
        {/* A centred title cannot live in a flex child between the two slots:
            with a back button on the left and nothing on the right, that child's
            centre is not the bar's centre, and the title sits visibly off. It
            gets its own absolutely-centred layer instead, with the slots on top. */}
        {!large && (title || sub) && left ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, paddingHorizontal: gutter + SLOT_RESERVE, alignItems: "center" }}>
            {title ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg, align: "center" })}>
                {title}
              </Text>
            ) : null}
            {sub ? (
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted, align: "center" }), { marginTop: 3 }]}>
                {sub}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {left}
          <View style={{ flex: 1, minWidth: 0 }}>
            {!large && title && !left ? (
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
                {title}
              </Text>
            ) : null}
            {!large && sub && !left ? (
              <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted }), { marginTop: 3 }]}>
                {sub}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      </View>
      {large ? (
        <View style={{ paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 14 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 30, leading: 1.05, track: -0.03, color: p.fg })}>
            {title}
            {accentTitle ? <Text style={{ color: accent.base }}>{accentTitle}</Text> : null}
          </Text>
          {sub ? (
            <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 12, leading: 1.3, color: p.fgMuted }), { marginTop: 7 }]}>
              {sub}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Wrapper>
  );
}
