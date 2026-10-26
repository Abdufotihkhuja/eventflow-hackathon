import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable } from "@shared/motion";
import { accent, gutter, type, usePalette } from "@shared/theme";
import { Btn, CodeInput, Icon, IconBtn, Screen, useToast } from "@shared/ui";

/** 04 · Verify email — segmented 6-digit code (EMAIL_VERIFICATION). */
export default function Verify(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const toast = useToast();
  const { verifyEmail, resendVerification, isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  // Attendees verify with a live session → Discover. Organization owners have
  // no session yet (org register issues no tokens) → send them to Log in.
  const next = isAuthenticated ? "/discover" : "/login";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  // A code was just sent on the previous step (register) — start the resend
  // cooldown so the screen opens in the design's "counting down" state.
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

  const submit = async (value = code) => {
    if (value.trim().length < 6) {
      setError(t("auth.error.required"));
      return;
    }
    setBusy(true);
    setError(null);
    setWrong(false);
    try {
      await verifyEmail(email, value.trim());
      setDone(true);
      haptics.success();
      // Confirmed attendees (live session) get the success moment; org owners
      // have no session yet → straight to log in.
      navTimer.current = setTimeout(() => router.replace(isAuthenticated ? "/success" : "/login"), 650);
    } catch (e) {
      // The error haptic fires inside CodeInput, in sync with the shake.
      setWrong(true);
      setError(authErrorText(e, lang, t("auth.verify.wrong")));
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
    if (v.length === 6 && !busy && !done) void submit(v);
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setCooldown(60);
    setError(null);
    try {
      await resendVerification(email);
    } catch {
      // A silently restarted countdown would claim a code was sent when it
      // wasn't — say so and unlock the link for another try.
      setCooldown(0);
      toast.show(t("auth.toast.resendFail"));
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/welcome")} accessibilityLabel={t("a11y.back")} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 40, gap: 18 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets
      >
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
          <Icon name="mail" size={26} color={accent.ink} />
        </View>

        <View style={{ gap: 8 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.verify.title")}</Text>
          <Text style={type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted })}>
            {t("auth.verify.sentTo")}{"\n"}
            <Text style={type({ weight: 700, size: 14, leading: 1.5, color: p.fg })}>{email || "—"}</Text>
            {email ? (
              <Text onPress={() => goBack(router, "/welcome")} style={type({ weight: 600, size: 14, leading: 1.5, color: accent.ink })}>
                {"  ·  "}
                {t("auth.verify.edit")}
              </Text>
            ) : null}
          </Text>
        </View>

        <CodeInput
          value={code}
          onChangeText={onChangeCode}
          error={wrong}
          success={done}
          autoFocus
          onComplete={(c) => void submit(c)}
          accessibilityLabel={t("auth.field.code")}
        />

        {done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Icon name="check" size={16} color={p.forestSoftFg} sw={2.5} />
            <Text style={type({ weight: 600, size: 13, leading: 1.3, color: p.forestSoftFg })}>{t("auth.verify.confirmed")}</Text>
          </View>
        ) : wrong ? (
          <Text style={type({ weight: 600, size: 13, leading: 1.3, color: p.danger })}>{error ?? t("auth.verify.wrong")}</Text>
        ) : (
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
        )}

        <View style={{ gap: 10, marginTop: 4 }}>
          <Btn full variant="primary" loading={busy} onPress={() => void submit()}>
            {done ? t("common.continue") : t("auth.verify.submit")}
          </Btn>
          <Btn full variant="ghost" onPress={() => router.replace(next)}>{t("auth.verify.skip")}</Btn>
        </View>
      </ScrollView>
    </Screen>
  );
}
