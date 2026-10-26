import { useRouter } from "expo-router";
import { Linking, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { gutter, radii, type, usePalette } from "@shared/theme";
import { ActionBar, Body, Btn, Icon, IconBtn, Screen, Tag, useToast } from "@shared/ui";

/**
 * 09 · Join with invite code.
 *
 * Honest reality: organization invites are token-based deep-links sent by email
 * (`GET/POST /organizations/invites/:token`), and those routes are NOT exposed
 * in the mobile public/account SDK — so there's no way to accept a typed code
 * from the app without a contract regen (MOBILE_API.md §5). Rather than fake a
 * submit, this screen mirrors the design's layout but routes the user to the
 * place joining actually happens: the secure link in their invitation email.
 */
export default function InviteCode(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const toast = useToast();

  const openMail = async () => {
    const candidates = ["message://", "googlegmail://", "mailto:"];
    for (const url of candidates) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        /* try the next candidate */
      }
    }
    // No scheme opened (no mail app / schemes not declared) — a silent
    // no-op on the screen's only CTA would read as a broken button.
    toast.show(t("auth.toast.mailFail"));
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center" }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/welcome")} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1 }} />
        <Tag tone="neutral">{t("auth.org.badge")}</Tag>
      </View>
      <Body contentStyle={{ paddingTop: 12, gap: 16 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: p.inverse, alignItems: "center", justifyContent: "center" }}>
          <Icon name="users" size={24} color={p.fgInverse} />
        </View>
        <View style={{ gap: 8 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.invite.title")}</Text>
          <Text style={type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted })}>{t("auth.invite.sub")}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 11, alignItems: "flex-start", padding: 16, borderRadius: radii.card, backgroundColor: p.sunken, borderWidth: 1, borderColor: p.borderSubtle }}>
          <Icon name="mail" size={18} color={p.fgMuted} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type({ weight: 700, size: 14, leading: 1.3, color: p.fg })}>{t("auth.invite.webTitle")}</Text>
            <Text style={type({ weight: 400, size: 12.5, leading: 1.5, color: p.fgMuted })}>{t("auth.invite.webBody")}</Text>
          </View>
        </View>
      </Body>
      <ActionBar>
        <Btn full variant="primary" icon="mail" onPress={openMail}>{t("auth.invite.openMail")}</Btn>
      </ActionBar>
    </Screen>
  );
}
