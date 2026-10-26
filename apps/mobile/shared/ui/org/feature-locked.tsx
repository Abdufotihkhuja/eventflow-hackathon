/**
 * 2.4 · Locked-state — a feature that is not in this organization's plan.
 *
 * The design's call, and it is the right one: show a FULL SCREEN that explains
 * the feature, not an empty list that looks broken. An empty kanban and a
 * kanban you have not paid for look identical otherwise, and the user's next
 * move is completely different in each case.
 *
 * There is no "Upgrade" button, deliberately: mobile has no checkout, and the
 * billing request flow (`POST /billing/requests`) is a web-cabinet
 * conversation. Sending someone to a dead end is worse than telling them where
 * the switch actually lives.
 */
import { Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";

import { Icon } from "../icon";

export function FeatureLocked({
  icon = "lock",
  title,
  body,
  tier,
}: {
  icon?: string;
  title: string;
  body: string;
  /** Current plan key, shown so the user knows what they are on. */
  tier?: string;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: gutter, gap: 14 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.card,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accent.soft,
        }}
      >
        <Icon name={icon} size={28} sw={1.9} color={accent.ink} />
      </View>

      <Text
        maxFontSizeMultiplier={1.3}
        style={type({ role: "display", weight: 700, size: 21, leading: 1.2, track: -0.03, color: p.fg, align: "center" })}
      >
        {title}
      </Text>

      <Text
        maxFontSizeMultiplier={1.3}
        style={[type({ weight: 400, size: 14, leading: 1.55, color: p.fgMuted, align: "center" }), { maxWidth: 300 }]}
      >
        {body}
      </Text>

      {tier ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            paddingHorizontal: 11,
            paddingVertical: 8,
            borderRadius: radii.pill,
            backgroundColor: p.sunken,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.08, color: p.fgMuted, transform: "uppercase" })}
          >
            {t("org.plan.current", { tier })}
          </Text>
        </View>
      ) : null}

      <Text
        maxFontSizeMultiplier={1.3}
        style={[type({ weight: 400, size: 12, leading: 1.5, color: p.fgSubtle, align: "center" }), { maxWidth: 300, marginTop: 4 }]}
      >
        {t("org.plan.changeOnWeb")}
      </Text>
    </View>
  );
}
