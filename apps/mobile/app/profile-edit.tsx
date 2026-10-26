import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { accountSdk } from "@shared/api";
import { authErrorText, useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { goBack } from "@shared/lib/go-back";
import { hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { gutter, type, usePalette } from "@shared/theme";
import {
  ActionBar, Avatar, Banner, Body, Btn, Field, IconBtn, Screen, TopBar, useToast,
} from "@shared/ui";

function initialsOf(first?: string | null, last?: string | null): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "EF";
}

/**
 * Edit profile — name and photo.
 *
 * The API has had `PATCH /account/me` and `POST/DELETE /account/me/avatar` all
 * along; the app simply never offered a way in, so a participant could not fix
 * a typo in their own name or set a picture. Everything else on the profile
 * (email, language) is handled elsewhere, so this screen stays to two fields
 * plus the photo.
 */
export default function ProfileEdit(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [first, setFirst] = useState(user?.firstName ?? "");
  const [last, setLast] = useState(user?.lastName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const avatarUrl = resolveMediaUrl((user as { avatarUrl?: string | null } | null)?.avatarUrl);
  const dirty = first.trim() !== (user?.firstName ?? "") || last.trim() !== (user?.lastName ?? "");

  async function pickPhoto(): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show(t("profile.edit.photoPermission"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;

    setPhotoBusy(true);
    setError(null);
    try {
      // RN's FormData takes a {uri,name,type} part, not a DOM File — the SDK
      // types the argument as File because it is shared with the web apps.
      const part = {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as File;
      await accountSdk.account.uploadAvatar(part);
      await refreshUser();
      toast.show(t("profile.edit.photoSaved"));
    } catch (e) {
      setError(authErrorText(e, lang, t("profile.edit.error")));
    } finally {
      setPhotoBusy(false);
    }
  }

  function removePhoto(): void {
    confirm({
      title: t("profile.edit.photoRemove"),
      message: t("profile.edit.photoRemoveMsg"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setPhotoBusy(true);
          try {
            await accountSdk.account.deleteAvatar();
            await refreshUser();
          } catch (e) {
            setError(authErrorText(e, lang, t("profile.edit.error")));
          } finally {
            setPhotoBusy(false);
          }
        })();
      },
    });
  }

  async function save(): Promise<void> {
    if (!first.trim() || !last.trim()) {
      setError(t("auth.error.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountSdk.account.updateMe({ firstName: first.trim(), lastName: last.trim() });
      await refreshUser();
      toast.show(t("profile.edit.saved"));
      goBack(router, "/profile");
    } catch (e) {
      setError(authErrorText(e, lang, t("profile.edit.error")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar
        title={t("profile.edit.title")}
        border
        left={<IconBtn name="cleft" size={40} onPress={() => goBack(router, "/profile")} accessibilityLabel={t("a11y.back")} />}
      />
      <Body keyboard contentStyle={{ paddingTop: 20, gap: 18 }}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <View style={{ alignItems: "center", gap: 14 }}>
          <Avatar
            initials={initialsOf(first, last)}
            size={92}
            hue={hueFromId(user?.id ?? "me")}
            src={avatarUrl}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn size="sm" variant="secondary" icon="cam" loading={photoBusy} onPress={() => void pickPhoto()}>
              {avatarUrl ? t("profile.edit.photoChange") : t("profile.edit.photoAdd")}
            </Btn>
            {avatarUrl ? (
              <Btn size="sm" variant="ghost" onPress={removePhoto}>{t("common.delete")}</Btn>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 14, marginTop: 4 }}>
          <Field
            label={t("profile.edit.firstName")}
            value={first}
            onChangeText={setFirst}
            autoCapitalize="words"
            textContentType="givenName"
            icon="user"
            returnKeyType="next"
          />
          <Field
            label={t("profile.edit.lastName")}
            value={last}
            onChangeText={setLast}
            autoCapitalize="words"
            textContentType="familyName"
            icon="user"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
        </View>

        <Text style={[type({ weight: 400, size: 12, leading: 1.5, color: p.fgMuted }), { paddingHorizontal: 2 }]}>
          {t("profile.edit.emailNote", { email: user?.email ?? "" })}
        </Text>
      </Body>
      <ActionBar>
        <Btn full variant="primary" loading={busy} disabled={!dirty} onPress={() => void save()}>
          {t("common.save")}
        </Btn>
      </ActionBar>
    </Screen>
  );
}
