import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError } from "@shared/api";
import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable } from "@shared/motion";
import { accent, gutter, type, usePalette } from "@shared/theme";
import { ActionBar, Banner, Body, Btn, CodeInput, Field, PasswordStrength, passwordValid, IconBtn, Screen, useToast } from "@shared/ui";

/** 06 · Reset password — emailed code + a new password (PASSWORD_RESET). */
export default function ResetPassword(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const toast = useToast();
  const { resetPassword, requestPasswordReset } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
  }, []);

  const submit = async () => {
    if (code.length < 6) {
      setError(t("auth.error.required"));
      return;
    }
    if (!passwordValid(password)) {
      setError(t("auth.error.password"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.error.match"));
      return;
    }
    setBusy(true);
    setError(null);
    setWrong(false);
    try {
      await resetPassword(email, code, password);
      setDone(true);
      haptics.success();
      navTimer.current = setTimeout(() => router.replace("/login"), 1000);
    } catch (e) {
      // A rejected reset is almost always the code (wrong/expired) — flip the
      // cells red + shake them like Verify does. Error haptic fires inside
      // CodeInput, in sync with the shake.
      if (e instanceof ApiError) setWrong(true);
      setError(authErrorText(e, lang, t("auth.error.generic")));
    } finally {
      setBusy(false);
    }
  };

  const onChangeCode = (v: string) => {
    setCode(v);
    if (wrong) {
      setWrong(false);
      setError(null);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setCooldown(60);
    setError(null);
    try {
      await requestPasswordReset(email);
    } catch {
      // Don't fake a running countdown when nothing was sent.
      setCooldown(0);
      toast.show(t("auth.toast.resendFail"));
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/welcome")} accessibilityLabel={t("a11y.back")} />
      </View>
      <Body keyboard contentStyle={{ paddingTop: 12, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.reset.title")}</Text>
          <Text style={type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted })}>{t("auth.reset.sub")}</Text>
        </View>

        {done ? <Banner tone="success">{t("auth.reset.success")}</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <View style={{ gap: 10 }}>
          <Text style={type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" })}>{t("auth.reset.codeLabel")}</Text>
          <CodeInput value={code} onChangeText={onChangeCode} error={wrong} success={done} accessibilityLabel={t("auth.reset.codeLabel")} />
          <AnimatedPressable
            onPress={resend}
            disabled={cooldown > 0}
            haptic="tap"
            scaleTo={0.98}
            accessibilityRole="button"
            style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }}
          >
            <Text style={type({ role: "mono", weight: 500, size: 12, leading: 1, color: cooldown > 0 ? p.fgMuted : accent.ink })}>
              {cooldown > 0 ? t("auth.verify.resendIn", { n: cooldown }) : t("auth.verify.resend")}
            </Text>
          </AnimatedPressable>
        </View>

        <View>
          <Field
            label={t("auth.field.newPassword")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
            showLabel={t("auth.pw.show")}
            hideLabel={t("auth.pw.hide")}
            icon="lock"
          />
          {password.length > 0 ? <PasswordStrength value={password} /> : null}
        </View>
        <Field
          label={t("auth.field.confirmNew")}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          secureToggle
          autoComplete="new-password"
          textContentType="newPassword"
          showLabel={t("auth.pw.show")}
          hideLabel={t("auth.pw.hide")}
          icon="lock"
          error={confirm.length > 0 && confirm !== password ? t("auth.error.match") : undefined}
        />
      </Body>
      <ActionBar>
        <Btn full variant="primary" loading={busy} disabled={done} onPress={submit}>{t("auth.reset.submit")}</Btn>
      </ActionBar>
    </Screen>
  );
}
