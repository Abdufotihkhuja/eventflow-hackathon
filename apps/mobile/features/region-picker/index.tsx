/**
 * Region picker — a bottom-sheet dialog listing the cities, with the active one
 * checked. Selecting a region fires a selection haptic, updates the persisted
 * choice and closes.
 */
import { Pressable, ScrollView, Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { AnimatedPressable } from "@shared/motion";
import { useRegion } from "@shared/region";
import { accent, radii, type, usePalette } from "@shared/theme";
import { BottomSheet, Icon } from "@shared/ui";

export function RegionPicker({
  visible, onClose, value, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  /** Controlled mode (e.g. the events map): highlight THIS code and report the
   *  pick via `onSelect` instead of mutating the persisted global region. */
  value?: string;
  onSelect?: (code: string) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, tx } = useI18n();
  const { region, regions, setRegion } = useRegion();
  const activeCode = value ?? region.code;
  const pick = onSelect ?? setRegion;

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.78} closeLabel={t("common.close")}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.02, color: p.fg })}>{t("region.title")}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} onPress={onClose}>
          <Icon name="x" size={22} color={p.fgMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {regions.map((r) => {
          const on = r.code === activeCode;
          return (
            <AnimatedPressable
              key={r.code}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              haptic="select"
              scaleTo={0.98}
              onPress={() => { pick(r.code); onClose(); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 12, paddingVertical: 14, borderRadius: radii.control,
                backgroundColor: on ? accent.soft : undefined,
              }}
            >
              <Icon name="pin" size={18} color={on ? accent.ink : p.fgSubtle} />
              <Text style={[type({ weight: on ? 700 : 500, size: 15, leading: 1.2, color: on ? accent.ink : p.fg }), { flex: 1 }]}>{tx(r.label)}</Text>
              {on ? <Icon name="check" size={18} color={accent.base} sw={2.4} /> : null}
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
