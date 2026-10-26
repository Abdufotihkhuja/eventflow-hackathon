/**
 * ReviewLockedSheet — the first-class explainer shown when submit-for-review is
 * rejected by the VerifiedOrganizationGuard (403). NOT an error toast: an
 * unverified organizer would read a toast as "broken". Instead we explain what
 * verification is and hand off to the web (where verification lives), keeping
 * the event safely as a draft.
 *
 * Built on the W0 BottomSheet (spring in, drag-to-dismiss).
 */
import { Linking, Text, View } from "react-native";

import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { radii, type, usePalette } from "@shared/theme";

import { BottomSheet } from "../bottom-sheet";
import { Btn } from "../button";
import { Icon } from "../icon";

export function ReviewLockedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();

  const openWeb = (): void => {
    void Linking.openURL(`${env.webUrl}/settings/organization`);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={t("org.form.a11yClose")}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        {/* Icon plate */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.lg,
            backgroundColor: p.warningSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon name="shield" size={28} color={p.warning} sw={1.8} />
        </View>

        <Text style={type({ role: "display", weight: 700, size: 21, leading: 1.15, track: -0.02, color: p.fg })}>
          {t("org.review.locked.title")}
        </Text>
        <Text style={[type({ weight: 500, size: 14, leading: 1.5, color: p.fgMuted }), { marginTop: 8 }]}>
          {t("org.review.locked.body")}
        </Text>

        <View style={{ marginTop: 20, gap: 10 }}>
          <Btn full variant="primary" icon="globe" onPress={openWeb}>
            {t("org.review.locked.web")}
          </Btn>
          <Btn full variant="secondary" onPress={onClose}>
            {t("org.review.locked.dismiss")}
          </Btn>
        </View>
        <Text style={[type({ role: "mono", weight: 500, size: 11, leading: 1.5, color: p.fgSubtle, align: "center" }), { marginTop: 12 }]}>
          {t("org.review.locked.webHint")}
        </Text>
      </View>
    </BottomSheet>
  );
}
