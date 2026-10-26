/**
 * Kpi — organizer stat tile (design `org-kit.jsx` §1.4).
 * Pure presentational: mono uppercase label, big display value (tabular-nums),
 * optional unit / delta (direction is EXPLICIT via `deltaUp` — derive it from
 * the sign of the API's changePercent, never guess) / foot note.
 * Count-up is the caller's job (`useCountUp` from @shared/motion).
 */
import { Text, View } from "react-native";

import { type, usePalette } from "@shared/theme";

import { Icon } from "../icon";

export function Kpi({
  label,
  value,
  unit,
  delta,
  deltaUp,
  foot,
}: {
  label: string;
  value: string;
  unit?: string;
  /** e.g. "12%" — rendered green-up or red-down per `deltaUp`. */
  delta?: string;
  deltaUp?: boolean;
  foot?: string;
}): React.JSX.Element {
  const p = usePalette();
  const deltaColor = deltaUp ? p.forestSoftFg : p.danger;

  return (
    <View style={{ padding: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
      <Text
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: p.fgMuted, transform: "uppercase" })}
      >
        {label}
      </Text>
      {/* Value and delta share a baseline (design 4.3): the delta is a
          qualifier on the number, not a separate row of chrome. */}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7, marginTop: 6 }}>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[type({ role: "display", weight: 700, size: 29, leading: 1, track: -0.035, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
        >
          {value}
        </Text>
        {unit ? (
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, color: p.fgMuted })}>{unit}</Text>
        ) : null}
        {delta ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Icon name={deltaUp ? "cup" : "cdown"} size={12} sw={2.6} color={deltaColor} />
            <Text
              maxFontSizeMultiplier={1.3}
              style={[type({ role: "mono", weight: 600, size: 12, leading: 1, color: deltaColor }), { fontVariant: ["tabular-nums"] }]}
            >
              {delta}
            </Text>
          </View>
        ) : null}
      </View>
      {foot ? (
        <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 11, leading: 1.3, color: p.fgMuted }), { marginTop: 6 }]}>
          {foot}
        </Text>
      ) : null}
    </View>
  );
}
