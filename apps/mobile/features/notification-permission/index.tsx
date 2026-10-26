/**
 * Pre-permission prime-экран пушей (BL-15, MOBILE_IMPACT §2).
 *
 * Системный диалог показывается ТОЛЬКО после явного «Включить» на этом шите —
 * отказ здесь ничего не тратит: право на единственный системный диалог
 * сохраняется до следующего значимого момента. Задуманные триггеры показа
 * (подключаются батчем инбокса/инфраструктуры, не при первом запуске):
 *   • участник — сразу после первой успешной регистрации на событие;
 *   • организатор — после входа в workspace.
 *
 * Если разрешение уже забрано системно (denied), шит честно меняет действие на
 * «Открыть настройки» (`Linking.openSettings()` — паттерн сканера).
 */
import { Text, View } from "react-native";

import { useI18n } from "@shared/i18n";
import { useNotificationPermission } from "@shared/notifications";
import { accent, radii, type, usePalette } from "@shared/theme";
import { BottomSheet, Btn, Icon } from "@shared/ui";

export function NotificationPrimeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const { state, requestPermission, openSystemSettings } = useNotificationPermission();
  const denied = state === "denied";

  async function enable(): Promise<void> {
    if (denied) {
      openSystemSettings();
      onClose();
      return;
    }
    await requestPermission();
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.6} closeLabel={t("common.later")}>
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, alignItems: "center" }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.control,
            backgroundColor: accent.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="bell" size={26} color={accent.base} />
        </View>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.02, color: p.fg, align: "center" }),
            { marginTop: 14 },
          ]}
        >
          {denied ? t("notifPerm.denied.title") : t("notifPerm.title")}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted, align: "center" }),
            { marginTop: 8 },
          ]}
        >
          {denied ? t("notifPerm.denied.body") : t("notifPerm.body")}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
        <Btn variant="primary" icon="bell" onPress={() => void enable()}>
          {denied ? t("notifPerm.openSettings") : t("notifPerm.enable")}
        </Btn>
        <Btn variant="ghost" onPress={onClose}>
          {t("common.later")}
        </Btn>
      </View>
    </BottomSheet>
  );
}
