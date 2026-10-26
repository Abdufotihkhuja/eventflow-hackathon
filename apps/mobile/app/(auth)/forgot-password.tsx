import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { accent, gutter, type, usePalette } from "@shared/theme";
import { ActionBar, Banner, Body, Btn, Field, FootLink, Icon, IconBtn, Screen } from "@shared/ui";

/** 05 · Forgot password — email a 6-digit PASSWORD_RESET code, then to Reset. */
export default function ForgotPassword(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError(t("auth.error.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      router.push({ pathname: "/reset-password", params: { email: email.trim() } });
    } catch (e) {
      setError(authErrorText(e, lang, t("auth.error.generic")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/welcome")} accessibilityLabel={t("a11y.back")} />
      </View>
      <Body keyboard contentStyle={{ paddingTop: 12, gap: 16 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: accent.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="lock" size={25} color={accent.ink} />
        </View>
        <View style={{ gap: 8 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.forgot.title")}</Text>
          <Text style={type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted })}>{t("auth.forgot.sub")}</Text>
        </View>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field
          label={t("auth.field.email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
        />
      </Body>
      <ActionBar>
        <Btn full variant="primary" loading={busy} onPress={submit}>{t("auth.forgot.submit")}</Btn>
        <View style={{ marginTop: 6 }}>
          <FootLink action={t("auth.foot.login")} onPress={() => router.replace("/login")}>{t("auth.foot.remembered")}</FootLink>
        </View>
      </ActionBar>
    </Screen>
  );
}
