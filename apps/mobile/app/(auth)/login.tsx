import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SocialAuth } from "@features/auth";
import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { accent, gutter, type, usePalette } from "@shared/theme";
import { AnimatedPressable } from "@shared/motion";
import { ActionBar, Banner, Body, Btn, Field, FootLink, IconBtn, Screen, Wordmark } from "@shared/ui";

/** 03 · Log in — unified /auth/login (email + password). */
export default function Login(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError(t("auth.error.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { isParticipant } = await login({ email: email.trim(), password });
      // Org-only accounts have no participant profile (Tickets/Certs would 403)
      // — send them to pick their workspace instead of the broken attendee tabs.
      router.replace(isParticipant ? "/discover" : "/workspace-switch");
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
      <Body keyboard contentStyle={{ paddingTop: 18, gap: 16 }}>
        <View style={{ marginBottom: 4 }} accessible={false} importantForAccessibility="no-hide-descendants">
          <Wordmark size={24} />
        </View>
        <View>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.login.title")}</Text>
          <Text style={[type({ weight: 400, size: 14, leading: 1.4, color: p.fgMuted }), { marginTop: 6 }]}>{t("auth.login.sub")}</Text>
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View>
          <Field
            label={t("auth.field.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            autoComplete="current-password"
            textContentType="password"
            showLabel={t("auth.pw.show")}
            hideLabel={t("auth.pw.hide")}
            icon="lock"
            inputRef={passwordRef}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          <AnimatedPressable
            onPress={() => router.push("/forgot-password")}
            haptic="tap"
            scaleTo={0.98}
            accessibilityRole="button"
            style={{ alignSelf: "flex-end", marginTop: 4, minHeight: 44, justifyContent: "center" }}
          >
            <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{t("auth.login.forgot")}</Text>
          </AnimatedPressable>
        </View>
        <SocialAuth />
      </Body>
      <ActionBar>
        <Btn full variant="primary" loading={busy} onPress={submit}>{t("auth.login.submit")}</Btn>
        <View style={{ marginTop: 6 }}>
          <FootLink action={t("auth.foot.createOne")} onPress={() => router.replace("/signup")}>{t("auth.foot.noAccount")}</FootLink>
        </View>
      </ActionBar>
    </Screen>
  );
}
