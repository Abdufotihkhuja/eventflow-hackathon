/**
 * Social sign-in block (Google / LinkedIn) — parity with the web login. Shown
 * under the primary email/password action on the login + signup screens.
 *
 * The provider flow (auth-context → shared/auth/oauth) opens an in-app browser
 * and returns via the app deep link. On success we route exactly like a
 * password login; cancel is silent; failure surfaces a toast.
 */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { useAuth } from "@shared/auth";
import type { OAuthProvider } from "@shared/auth/oauth";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable } from "@shared/motion";
import { radii, type, usePalette } from "@shared/theme";
import { GoogleMark, LinkedInMark, Spinner, useToast } from "@shared/ui";

function Divider({ label }: { label: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: p.borderSubtle }} />
      <Text style={type({ role: "mono", weight: 500, size: 10, leading: 1, track: 0.06, color: p.fgSubtle, transform: "uppercase" })}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: p.borderSubtle }} />
    </View>
  );
}

export function SocialAuth(): React.JSX.Element {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const run = async (provider: OAuthProvider): Promise<void> => {
    if (busy) return;
    haptics.tap();
    setBusy(provider);
    try {
      const { ok, isParticipant } = await signInWithProvider(provider);
      if (!ok) return; // user cancelled — stay put, no noise
      haptics.success();
      router.replace(isParticipant ? "/discover" : "/workspace-switch");
    } catch {
      haptics.error();
      toast.show(t("auth.social.error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Divider label={t("auth.social.continueWith")} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <ProviderButton
          label={t("auth.social.google")}
          mark={<GoogleMark size={18} />}
          loading={busy === "google"}
          disabled={!!busy}
          onPress={() => void run("google")}
        />
        <ProviderButton
          label={t("auth.social.linkedin")}
          mark={<LinkedInMark size={18} />}
          loading={busy === "linkedin"}
          disabled={!!busy}
          onPress={() => void run("linkedin")}
        />
      </View>
    </View>
  );
}

function ProviderButton({
  label,
  mark,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  mark: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        height: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        borderRadius: radii.control,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: p.surface,
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <Spinner size={18} />
      ) : (
        <>
          {mark}
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1, color: p.fg })}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
