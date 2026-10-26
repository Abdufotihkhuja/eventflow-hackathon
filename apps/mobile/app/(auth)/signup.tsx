import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SocialAuth } from "@features/auth";
import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { gutter, type, usePalette } from "@shared/theme";
import { ActionBar, Banner, Body, Btn, Field, FootLink, IconBtn, PasswordStrength, passwordValid, Screen, Tag } from "@shared/ui";

/**
 * 02 · Sign up — identity + email/password. The design's 3-step wizard collapses
 * to one step: the OTP step is dropped (Gate-1) and the interests/onboarding step
 * is a deferred P2 (onboarding-prefs); email verification follows on the next
 * screen (pushed, so Back/"edit" returns here with the form intact).
 */
export default function SignUp(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
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
    try {
      const { emailVerificationRequired } = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        passwordConfirm: confirm,
      });
      if (emailVerificationRequired) {
        // Push (not replace): Back / the "edit" link on Verify must land on
        // this form with everything the user typed still in place.
        router.push({ pathname: "/verify", params: { email: email.trim() } });
      } else {
        router.replace("/success");
      }
    } catch (e) {
      setError(authErrorText(e, lang, t("auth.error.generic")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center" }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/welcome")} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1 }} />
        <Tag tone="neutral">{t("auth.attendee.badge")}</Tag>
      </View>
      <Body keyboard contentStyle={{ paddingTop: 18, gap: 16 }}>
        <View>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 28, leading: 1.05, track: -0.03, color: p.fg })}>{t("auth.signup.title")}</Text>
          <Text style={[type({ weight: 400, size: 14, leading: 1.4, color: p.fgMuted }), { marginTop: 6 }]}>{t("auth.signup.sub")}</Text>
        </View>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label={t("auth.field.firstName")}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              icon="user"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t("auth.field.lastName")}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              inputRef={lastNameRef}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
        </View>
        <Field
          label={t("auth.field.email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail"
          inputRef={emailRef}
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
            autoComplete="new-password"
            textContentType="newPassword"
            showLabel={t("auth.pw.show")}
            hideLabel={t("auth.pw.hide")}
            icon="lock"
            inputRef={passwordRef}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          {password.length > 0 ? <PasswordStrength value={password} /> : null}
        </View>
        <Field
          label={t("auth.field.confirm")}
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
          inputRef={confirmRef}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <SocialAuth />
      </Body>
      <ActionBar>
        <Btn full variant="primary" loading={busy} onPress={submit}>{t("auth.signup.submit")}</Btn>
        <View style={{ marginTop: 6 }}>
          <FootLink action={t("auth.foot.login")} onPress={() => router.replace("/login")}>{t("auth.foot.haveAccount")}</FootLink>
        </View>
      </ActionBar>
    </Screen>
  );
}
