import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { goBack } from "@shared/lib/go-back";
import { gutter, radii, type, usePalette } from "@shared/theme";
import {
  ActionBar,
  Banner,
  Body,
  Btn,
  Field,
  Icon,
  IconBtn,
  PasswordStrength,
  passwordValid,
  Screen,
  Tag,
} from "@shared/ui";

/**
 * Registers a distinct organization owner account. It receives ORGANIZATION
 * identity + OWNER workspace membership and deliberately has no participant
 * profile. Existing personal users join organizations only by invitation.
 */
export default function CreateOrg(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { registerOrg } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
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
      const { emailVerificationRequired } = await registerOrg({
        organizationName: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: confirm,
      });
      if (emailVerificationRequired) {
        router.push({ pathname: "/verify", params: { email: email.trim() } });
      } else {
        router.replace("/login");
      }
    } catch (cause) {
      setError(authErrorText(cause, lang, t("auth.error.generic")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: gutter,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <IconBtn
          name="cleft"
          size={40}
          onPress={() => goBack(router, "/welcome")}
          accessibilityLabel={t("a11y.back")}
        />
        <View style={{ flex: 1 }} />
        <Tag tone="neutral">{t("auth.org.badge")}</Tag>
      </View>

      <Body keyboard contentStyle={{ paddingTop: 12, gap: 16 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: p.inverse,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="building" size={24} color={p.fgInverse} />
        </View>
        <View style={{ gap: 8 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={type({
              role: "display",
              weight: 700,
              size: 28,
              leading: 1.05,
              track: -0.03,
              color: p.fg,
            })}
          >
            {t("auth.org.title")}
          </Text>
          <Text
            style={type({
              weight: 400,
              size: 14,
              leading: 1.5,
              color: p.fgMuted,
            })}
          >
            {t("auth.org.sub")}
          </Text>
        </View>

        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Field
          label={t("auth.org.field.name")}
          value={name}
          onChangeText={setName}
          placeholder={t("auth.org.field.namePh")}
          autoCapitalize="words"
          textContentType="organizationName"
          icon="building"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
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
          error={
            confirm.length > 0 && confirm !== password
              ? t("auth.error.match")
              : undefined
          }
          inputRef={confirmRef}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />

        <View
          style={{
            flexDirection: "row",
            gap: 9,
            alignItems: "flex-start",
            padding: 14,
            borderRadius: radii.control,
            backgroundColor: p.sunken,
            borderWidth: 1,
            borderColor: p.borderSubtle,
          }}
        >
          <Icon name="info" size={16} color={p.fgMuted} />
          <Text
            style={[
              type({
                weight: 400,
                size: 12,
                leading: 1.5,
                color: p.fgDefault,
              }),
              { flex: 1 },
            ]}
          >
            {t("auth.org.note")}
          </Text>
        </View>
      </Body>

      <ActionBar>
        <Btn
          full
          variant="primary"
          iconRight="aright"
          loading={busy}
          onPress={submit}
        >
          {t("auth.org.submit")}
        </Btn>
      </ActionBar>
    </Screen>
  );
}
