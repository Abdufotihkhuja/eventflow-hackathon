/**
 * The app-language picker sheet.
 *
 * Shared by the participant profile and the organizer's Organization tab: an
 * org-only account has NO participant profile at all (`/account/me` 403s), so
 * before this the organizer shell offered no way to change the app language.
 * One sheet, so the two shells cannot drift.
 */
import { Pressable, Text, View } from "react-native";

import { LANGUAGES, useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { dur } from "@shared/motion";
import { syncDeviceRegistration } from "@shared/notifications/device-token";
import { accent, radii, type, usePalette } from "@shared/theme";

import { BottomSheet } from "./bottom-sheet";
import { Flag } from "./flag";
import { Icon } from "./icon";

export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang, setLang } = useI18n();

  function pick(code: (typeof LANGUAGES)[number]["code"]): void {
    onClose();
    if (code === lang) return;
    haptics.select();
    // Flip the language after the sheet's exit animation — otherwise the whole
    // UI re-renders in the new language mid-close (jarring frame).
    setTimeout(() => {
      setLang(code);
      // Killed-push локализуется по записи устройства — освежаем её с новой
      // локалью (BL-25; sync сам переживает оффлайн и отсутствие сессии).
      void syncDeviceRegistration("locale-changed");
    }, dur.base);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.5} closeLabel={t("common.close")}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.02, color: p.fg })}>{t("profile.language")}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} onPress={onClose}>
          <Icon name="x" size={22} color={p.fgMuted} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        {LANGUAGES.map(({ code, label }) => {
          const on = code === lang;
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => pick(code)}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 12,
                // 12 (sheet) + 8 = 20 — flags line up with the sheet title's gutter.
                paddingHorizontal: 8, paddingVertical: 14, borderRadius: radii.control,
                backgroundColor: on ? accent.soft : pressed ? p.sunken : "transparent",
              })}
            >
              <Flag code={code} width={26} />
              <Text style={[type({ weight: on ? 700 : 500, size: 15, leading: 1.2, color: on ? accent.ink : p.fg }), { flex: 1 }]}>{label}</Text>
              {on ? <Icon name="check" size={18} color={accent.base} sw={2.4} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** The trailing slot for a "Language" settings row: flag + current label. */
export function LanguageValue(): React.JSX.Element {
  const p = usePalette();
  const { lang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Flag code={lang} width={22} />
      <Text style={type({ weight: 600, size: 13, leading: 1.2, color: p.fgMuted })}>{current?.label}</Text>
      <Icon name="cright" size={17} color={p.fgSubtle} />
    </View>
  );
}
