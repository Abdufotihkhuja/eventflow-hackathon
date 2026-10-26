/**
 * Organization profile editor.
 *
 * The org tab used to carry four read-only rows and a line saying the public
 * profile "is edited in the browser". That was never true: `PATCH /workspace/me`
 * and `POST`/`DELETE /workspace/me/logo` have shipped all along, and
 * `@eventflow/sdk-workspace` already wraps all three. An organizer could not fix
 * a typo in their own name from the phone they run the event on.
 *
 * Scope is the PUBLIC identity plus the one internal field support needs:
 * name, bio, website, address, phone, logo. INN, industry and company size stay
 * on the web — they belong to the verification packet, not to a phone.
 *
 * The server allows this only for the ORGANIZATION actor (`@Roles`), so a staff
 * member gets a 403. The tab hides the entry point for non-owners; this screen
 * still states the rule if someone deep-links into it, because the client gate
 * is a courtesy and the server is the authority.
 */
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { useWorkspaceLogoMutation, useUpdateWorkspaceOrgMutation, useWorkspaceOrgQuery } from "@entities/organization";
import { authErrorText, useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { goBack } from "@shared/lib/go-back";
import { hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { radii, type, usePalette } from "@shared/theme";
import {
  ActionBar, Banner, Body, Btn, Field, IconBtn, OrgBadge, Screen, Skeleton, StateBlock, TopBar, useToast,
} from "@shared/ui";

/** A bare domain ("eventflow.uz") is what people type; the API validates a full
 *  URL. Add the scheme rather than rejecting the input. */
function normalizeWebsite(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function websiteLooksValid(raw: string): boolean {
  const v = normalizeWebsite(raw);
  if (!v) return true;
  // A host with at least one dot and no spaces — the server does the real
  // validation, this only stops the obvious round-trip.
  return /^https?:\/\/[^\s/.]+\.[^\s/]+/i.test(v);
}

/** Server rule: `/^\+?[1-9]\d{6,14}$/` on the DIGITS. Spaces and dashes are how
 *  a phone number is actually typed, so strip them before testing. */
function normalizePhone(raw: string): string {
  return raw.replace(/[\s()-]/g, "");
}

function phoneLooksValid(raw: string): boolean {
  const v = normalizePhone(raw);
  return !v || /^\+?[1-9]\d{6,14}$/.test(v);
}

export default function OrgProfileEdit(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { workspace, refreshWorkspace } = useAuth();
  const toast = useToast();

  const orgId = workspace?.organizationId;
  const orgQ = useWorkspaceOrgQuery(orgId);
  const save = useUpdateWorkspaceOrgMutation(orgId);
  const logo = useWorkspaceLogoMutation(orgId);

  const org = orgQ.data;
  // Draft state is seeded ONCE the record arrives. `key` on the form below
  // remounts it when that happens, so the fields carry real values without a
  // controlled/uncontrolled flip mid-typing (the Field's native-text rule).
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: "name" | "website" | "phone"; msg: string } | null>(null);

  const gate = useWorkspaceGate();

  if (org && !seeded) {
    setSeeded(true);
    setName(org.name === "—" ? "" : org.name);
    setBio(org.description ?? "");
    setWebsite(org.website ?? "");
    setAddress(org.address ?? "");
    setPhone(org.phone ?? "");
  }

  const back = (): void => goBack(router, "/org/profile");

  const dirty =
    !!org &&
    (name.trim() !== (org.name === "—" ? "" : org.name) ||
      bio.trim() !== (org.description ?? "") ||
      normalizeWebsite(website) !== (org.website ?? "") ||
      address.trim() !== (org.address ?? "") ||
      normalizePhone(phone) !== (org.phone ?? ""));

  async function pickLogo(): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show(t("org.edit.photoPermission"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;

    setError(null);
    try {
      await logo.mutateAsync({
        uri: asset.uri,
        name: asset.fileName ?? "logo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      await refreshWorkspace();
      toast.show(t("org.edit.logoSaved"));
    } catch (e) {
      setError(authErrorText(e, lang, t("org.edit.error")));
    }
  }

  function removeLogo(): void {
    confirm({
      title: t("org.edit.logoRemove.title"),
      message: t("org.edit.logoRemove.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setError(null);
          try {
            await logo.mutateAsync(null);
            await refreshWorkspace();
          } catch (e) {
            setError(authErrorText(e, lang, t("org.edit.error")));
          }
        })();
      },
    });
  }

  async function onSave(): Promise<void> {
    // Validation lands ON the field that is wrong — a banner at the top of a
    // five-field form makes the reader hunt for which one it means.
    if (!name.trim()) {
      setFieldError({ field: "name", msg: t("org.edit.name.required") });
      return;
    }
    if (!websiteLooksValid(website)) {
      setFieldError({ field: "website", msg: t("org.edit.website.invalid") });
      return;
    }
    if (!phoneLooksValid(phone)) {
      setFieldError({ field: "phone", msg: t("org.edit.phone.invalid") });
      return;
    }
    setFieldError(null);
    setError(null);
    try {
      // Only changed fields go up: sending `""` for an untouched empty field
      // would fail the API's `@IsUrl`/`@Matches` validators on the blank value.
      const patch: Record<string, string> = {};
      const site = normalizeWebsite(website);
      const tel = normalizePhone(phone);
      if (name.trim() !== org?.name) patch.organizationName = name.trim();
      if (bio.trim() !== (org?.description ?? "")) patch.description = bio.trim();
      if (site !== (org?.website ?? "") && site) patch.website = site;
      if (address.trim() !== (org?.address ?? "")) patch.address = address.trim();
      if (tel !== (org?.phone ?? "") && tel) patch.phone = tel;

      await save.mutateAsync(patch);
      await refreshWorkspace();
      toast.show(t("org.edit.saved"));
      // REPLACE, not back(): the destination after a save is the profile that
      // now shows the new values. `back()` pops whatever happens to be below —
      // which, when this screen was reached by deep link, is the app root, and
      // the organizer lands in the participant feed.
      router.replace("/org/profile");
    } catch (e) {
      setError(authErrorText(e, lang, t("org.edit.error")));
    }
  }

  const busy = save.isPending;
  const logoUrl = resolveMediaUrl(org?.logoUrl);
  const hue = hueFromId(orgId ?? "org");
  // A 403 means "you are staff, not the owner" — the one error worth its own
  // screen rather than a red banner over a form that can never submit.
  const forbidden = (orgQ.error as { status?: number } | null)?.status === 403;

  if (gate) return gate;

  return (
    <Screen>
      <TopBar
        title={t("org.edit.title")}
        border
        left={<IconBtn name="cleft" size={40} onPress={back} accessibilityLabel={t("a11y.back")} />}
      />

      {forbidden ? (
        <Body contentStyle={{ paddingTop: 40 }}>
          <StateBlock icon="lock" title={t("org.edit.forbidden")} body={t("org.profile.readOnly")} />
        </Body>
      ) : orgQ.isPending ? (
        <Body contentStyle={{ paddingTop: 20, gap: 18 }}>
          <View style={{ alignItems: "center", gap: 14 }}>
            <Skeleton w={92} h={92} r={radii.xl} />
            <Skeleton w={160} h={34} r={radii.pill} />
          </View>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={72} r={radii.control} />)}
        </Body>
      ) : orgQ.isError ? (
        <Body contentStyle={{ paddingTop: 40 }}>
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => void orgQ.refetch()}>{t("common.retry")}</Btn>}
          />
        </Body>
      ) : (
        <>
          <Body key={org?.id ?? "org"} keyboard contentStyle={{ paddingTop: 18, gap: 18 }}>
            {error ? <Banner tone="danger">{error}</Banner> : null}

            {/* Identity mark. The logo is the one field with an immediate,
                visible effect, so it leads and commits on pick — no Save. */}
            <View style={{ alignItems: "center", gap: 14 }}>
              <OrgBadge name={name || org?.name || "EF"} hue={hue} size={92} radius={22} src={logoUrl} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Btn size="sm" variant="secondary" icon="cam" loading={logo.isPending} onPress={() => void pickLogo()}>
                  {logoUrl ? t("org.edit.logoChange") : t("org.edit.logoAdd")}
                </Btn>
                {logoUrl ? (
                  <Btn size="sm" variant="ghost" disabled={logo.isPending} onPress={removeLogo}>{t("common.delete")}</Btn>
                ) : null}
              </View>
            </View>

            <Text style={[type({ weight: 400, size: 12, leading: 1.5, color: p.fgMuted, align: "center" }), { paddingHorizontal: 12 }]}>
              {t("org.edit.intro")}
            </Text>

            <View style={{ gap: 16, marginTop: 2 }}>
              <Field
                label={t("org.edit.name")}
                required
                value={name}
                onChangeText={(v) => { setName(v); if (fieldError?.field === "name") setFieldError(null); }}
                autoCapitalize="words"
                icon="building"
                maxLength={200}
                hint={t("org.edit.name.hint")}
                error={fieldError?.field === "name" ? fieldError.msg : undefined}
                returnKeyType="next"
              />
              <Field
                label={t("org.edit.bio")}
                value={bio}
                onChangeText={setBio}
                autoCapitalize="sentences"
                multiline
                maxLength={2000}
                hint={t("org.edit.bio.hint")}
              />
              <Field
                label={t("org.edit.website")}
                value={website}
                onChangeText={(v) => { setWebsite(v); if (fieldError?.field === "website") setFieldError(null); }}
                placeholder="eventflow.uz"
                keyboardType="url"
                autoCapitalize="none"
                autoComplete="url"
                icon="globe"
                error={fieldError?.field === "website" ? fieldError.msg : undefined}
              />
              <Field
                label={t("org.edit.address")}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="sentences"
                icon="pin"
                maxLength={500}
                hint={t("org.edit.address.hint")}
              />
              <Field
                label={t("org.edit.phone")}
                value={phone}
                onChangeText={(v) => { setPhone(v); if (fieldError?.field === "phone") setFieldError(null); }}
                placeholder="+998 90 123 45 67"
                keyboardType="phone-pad"
                autoComplete="tel"
                icon="phone"
                hint={t("org.edit.phone.hint")}
                error={fieldError?.field === "phone" ? fieldError.msg : undefined}
                returnKeyType="done"
                onSubmitEditing={() => void onSave()}
              />
            </View>
          </Body>

          <ActionBar>
            <Btn full variant="primary" loading={busy} disabled={!dirty} onPress={() => void onSave()}>
              {t("common.save")}
            </Btn>
          </ActionBar>
        </>
      )}
    </Screen>
  );
}
