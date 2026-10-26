/**
 * Discover filters — a bottom-sheet for the event Type and Format facets. Holds
 * a draft locally and commits on "Apply" (or clears on "Reset"). Facet pills are
 * the shared `Chip` (one filter-pill language app-wide + selection haptics);
 * drag-to-dismiss comes from the shared `BottomSheet`.
 */
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import type { StringKey } from "@shared/i18n/strings";
import { gutter, type, usePalette } from "@shared/theme";
import { BottomSheet, Btn, Chip, Icon } from "@shared/ui";

export interface DiscoverFilterValue {
  type?: "FREE" | "PAID";
  format?: "OFFLINE" | "ONLINE" | "HYBRID";
}

export function filterCount(v: DiscoverFilterValue): number {
  return (v.type ? 1 : 0) + (v.format ? 1 : 0);
}

const TYPE_OPTS: { value: DiscoverFilterValue["type"]; key: StringKey }[] = [
  { value: undefined, key: "common.all" },
  { value: "FREE", key: "filters.free" },
  { value: "PAID", key: "filters.paid" },
];

const FORMAT_OPTS: { value: DiscoverFilterValue["format"]; key: StringKey }[] = [
  { value: undefined, key: "common.all" },
  { value: "OFFLINE", key: "detail.format.OFFLINE" },
  { value: "ONLINE", key: "detail.format.ONLINE" },
  { value: "HYBRID", key: "detail.format.HYBRID" },
];

export function DiscoverFilters({
  visible, value, onClose, onApply,
}: {
  visible: boolean;
  value: DiscoverFilterValue;
  onClose: () => void;
  onApply: (next: DiscoverFilterValue) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const [draft, setDraft] = useState<DiscoverFilterValue>(value);

  // Re-sync the draft whenever the sheet is (re)opened.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={t("common.close")}>
      <View style={{ paddingHorizontal: gutter }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 4 }}>
          <Text style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.02, color: p.fg })}>{t("filters.title")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} onPress={onClose}>
            <Icon name="x" size={22} color={p.fgMuted} />
          </Pressable>
        </View>

        {/* Type */}
        <Text style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginTop: 18, marginBottom: 10 }]}>{t("filters.type")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TYPE_OPTS.map((o) => (
            <Chip key={o.key} active={draft.type === o.value} onPress={() => setDraft((d) => ({ ...d, type: o.value }))}>
              {t(o.key)}
            </Chip>
          ))}
        </View>

        {/* Format */}
        <Text style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginTop: 20, marginBottom: 10 }]}>{t("filters.format")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {FORMAT_OPTS.map((o) => (
            <Chip key={o.key} active={draft.format === o.value} onPress={() => setDraft((d) => ({ ...d, format: o.value }))}>
              {t(o.key)}
            </Chip>
          ))}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 26 }}>
          <View style={{ flex: 1 }}>
            <Btn full variant="secondary" onPress={() => { setDraft({}); onApply({}); onClose(); }}>{t("filters.reset")}</Btn>
          </View>
          <View style={{ flex: 1.4 }}>
            <Btn full variant="primary" onPress={() => { onApply(draft); onClose(); }}>{t("filters.apply")}</Btn>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
