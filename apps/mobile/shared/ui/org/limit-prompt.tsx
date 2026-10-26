/**
 * LimitPrompt — the plan's participant ceiling, shown when an approval would
 * cross it (design 4.8b).
 *
 * The design's own note calls this «единственное место, где виден потолок
 * тарифа», and that is the whole argument for a card instead of a toast: a
 * toast says "no" and vanishes, taking with it the three numbers that explain
 * why. Here the organizer sees the ceiling, what is already spent against it,
 * and what this action would have added.
 *
 * The check that triggers it is a HINT — entitlements are advisory and the
 * server is the authority (see `entities/billing`). The caller only raises this
 * when the API positively says limits are being enforced.
 */
import { Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { formatNumber } from "@shared/lib/format";
import { accent, radii, type, usePalette } from "@shared/theme";

import { Btn } from "../button";
import { Icon } from "../icon";

export function LimitPrompt({
  tier,
  limit,
  used,
  requested,
  onOpenPlan,
  onDismiss,
}: {
  tier: string;
  limit: number;
  used: number;
  /** How many this action would have added. */
  requested: number;
  onOpenPlan: () => void;
  onDismiss: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const pct = limit > 0 ? Math.min(1, used / limit) : 1;

  const rows: { label: string; value: string; hot?: boolean }[] = [
    { label: t("attendees.limit.planLimit", { tier }), value: formatNumber(limit, lang) },
    { label: t("attendees.limit.used"), value: formatNumber(used, lang) },
    { label: t("attendees.limit.requested"), value: `+${formatNumber(requested, lang)}`, hot: true },
  ];

  return (
    <View
      style={{
        padding: 14,
        gap: 12,
        borderRadius: radii.card,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: accent.ring,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <Icon name="alert" size={18} sw={2} color={accent.ink} />
        <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 15, leading: 1.2, color: accent.ink }), { flex: 1 }]}>
          {t("attendees.limit.title")}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 13, leading: 1.2, color: p.fgMuted }), { flexShrink: 1 }]}>
              {r.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                type({ role: "mono", weight: 600, size: 13, leading: 1.2, color: r.hot ? accent.ink : p.fg }),
                { fontVariant: ["tabular-nums"] },
              ]}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 6, borderRadius: radii.pill, backgroundColor: p.sunken, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: "100%", backgroundColor: accent.base }} />
      </View>

      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.5, color: p.fgMuted })}>
        {t("attendees.limit.body")}
      </Text>

      <View style={{ flexDirection: "row", gap: 9 }}>
        <View style={{ flex: 1 }}>
          <Btn full size="md" variant="primary" onPress={onOpenPlan}>{t("attendees.limit.openPlan")}</Btn>
        </View>
        <Btn size="md" variant="secondary" onPress={onDismiss}>{t("common.later")}</Btn>
      </View>
    </View>
  );
}
