import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import Constants from "expo-constants";

import { useUserEventsStatsQuery } from "@entities/profile";
import { useMyOrganizationsQuery } from "@entities/organization";
import { confirm } from "@shared/lib/confirm";
import { hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { useAuth } from "@shared/auth";
import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable, fadeIn, useCountUp } from "@shared/motion";
import { radii, type, usePalette } from "@shared/theme";
import {
  Avatar, Body, Btn, Icon, LanguageSheet, LanguageValue, ModeSheet, Screen,
  SettingsGroup, SettingsRow, Skeleton, StateBlock, TopBar,
} from "@shared/ui";

const SUPPORT_EMAIL = "support@eventflow.uz";

function initialsOf(first?: string | null, last?: string | null): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "EF";
}

/** 13 · Profile — live identity (getMe), participation stats, language, support, logout. */
export default function Profile(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { status, user, logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  // A floating (blurred) header overlays the scroller, so the body pads by its
  // measured height instead of stopping at an opaque edge.
  const [headerH, setHeaderH] = useState(128);

  const statsQ = useUserEventsStatsQuery({ enabled: status === "authenticated" });
  const stats = statsQ.data as unknown as
    | { totalEvents?: number; attendedEvents?: number; certificatesCount?: number }
    | undefined;

  const orgsQ = useMyOrganizationsQuery({ enabled: status === "authenticated" });
  const hasOrgs = (orgsQ.data?.length ?? 0) > 0;

  // Count-up on first paint of real values (design: subtle, once).
  const nEvents = useCountUp(stats?.totalEvents ?? 0);
  const nAttended = useCountUp(stats?.attendedEvents ?? 0);
  const nCerts = useCountUp(stats?.certificatesCount ?? 0);

  const version = Constants.expoConfig?.version ?? "1.0.0";

  function onLogout(): void {
    confirm({
      title: t("profile.logout.title"),
      message: t("profile.logout.message"),
      confirmText: t("profile.logout"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        void logout().then(() => router.replace("/welcome"));
      },
    });
  }

  const openHelp = () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined);
  const openTerms = () => void Linking.openURL(`${env.webUrl}/${lang}/terms`).catch(() => undefined);

  const statCells: [number, string][] = [
    [nEvents, t("profile.stats.events")],
    [nAttended, t("profile.stats.attended")],
    [nCerts, t("profile.stats.certs")],
  ];

  const stripFrame = {
    flexDirection: "row" as const,
    marginTop: 16,
    borderRadius: radii.card,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    overflow: "hidden" as const,
  };

  // Stats strip — skeleton while loading, honest error + retry (no zeros-flash).
  let statsStrip: React.ReactNode;
  if (statsQ.isPending) {
    statsStrip = (
      <View style={stripFrame}>
        {statCells.map(([, label], i) => (
          <View key={label} style={{ flex: 1, paddingVertical: 15, paddingHorizontal: 14, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.borderSubtle }}>
            <Skeleton w={44} h={24} />
            <Skeleton w="70%" h={12} style={{ marginTop: 10 }} />
          </View>
        ))}
      </View>
    );
  } else if (statsQ.isError) {
    statsStrip = (
      <View style={[stripFrame, { alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }]}>
        <Icon name="alert" size={18} color={p.danger} />
        <Text style={[type({ weight: 500, size: 13, leading: 1.35, color: p.fgMuted }), { flex: 1 }]}>{t("state.error.title")}</Text>
        <Btn size="sm" variant="secondary" onPress={() => void statsQ.refetch()}>{t("common.retry")}</Btn>
      </View>
    );
  } else if (!stats?.totalEvents && !stats?.attendedEvents && !stats?.certificatesCount) {
    // A brand-new account has nothing to count, and three tiles reading "0" is a
    // dashboard about nothing. Show no strip at all rather than a sentence
    // explaining its own absence — the tiles appear with the first real number.
    statsStrip = null;
  } else {
    statsStrip = (
      <Animated.View entering={fadeIn()} style={stripFrame}>
        {statCells.map(([v, label], i) => (
          <View key={label} style={{ flex: 1, paddingVertical: 15, paddingHorizontal: 14, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.borderSubtle }}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[type({ role: "display", weight: 700, size: 24, leading: 1.2, track: -0.03, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
            >
              {v}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 12, leading: 1.2, color: p.fg }), { marginTop: 8 }]}>{label}</Text>
          </View>
        ))}
      </Animated.View>
    );
  }

  return (
    <Screen>
      <Body tabBarClearance contentStyle={{ paddingTop: headerH + 18 }}>
        {status === "guest" ? (
          <View style={{ paddingVertical: 28 }}>
            <StateBlock
              icon="user"
              title={t("profile.guest.title")}
              body={t("profile.guest.body")}
              action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
            />
          </View>
        ) : (
          <>
            {/* Identity — tappable: the profile had no way to fix a name or set
                a photo, though the API supports both. */}
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.edit")}
              haptic="tap"
              scaleTo={0.99}
              onPress={() => router.push("/profile-edit")}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4, paddingBottom: 2 }}
            >
              <Avatar
                initials={initialsOf(user?.firstName, user?.lastName)}
                size={64}
                hue={hueFromId(user?.id ?? "me")}
                src={resolveMediaUrl((user as { avatarUrl?: string | null } | null)?.avatarUrl)}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                {status === "loading" && !user ? (
                  <>
                    <Skeleton w="60%" h={20} />
                    <Skeleton w="80%" h={13} style={{ marginTop: 8 }} />
                  </>
                ) : (
                  <>
                    <Text numberOfLines={1} style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.02, color: p.fg })}>
                      {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
                    </Text>
                    <Text numberOfLines={1} style={[type({ weight: 400, size: 13, leading: 1.3, color: p.fgMuted }), { marginTop: 4 }]}>
                      {user?.email ?? ""}
                    </Text>
                  </>
                )}
              </View>
              <Icon name="cright" size={18} color={p.fgSubtle} />
            </AnimatedPressable>

            {statsStrip}
          </>
        )}

        {/* Mode switch — the canonical ModeSheet entry (design `switch` section) */}
        {status !== "guest" ? (
          <SettingsGroup>
            <SettingsRow
              icon="building"
              label={hasOrgs ? t("mode.switchToOrganizing") : t("workspace.entry")}
              onPress={() => setModeOpen(true)}
              last
            />
          </SettingsGroup>
        ) : null}

        {/* Preferences */}
        <SettingsGroup title={t("profile.preferences")}>
          {/* Матрица преференсов — серверная, гостю показывать нечего. */}
          {status !== "guest" ? (
            <SettingsRow icon="bell" label={t("notifSettings.title")} onPress={() => router.push("/notification-settings")} />
          ) : null}
          <SettingsRow icon="globe" label={t("profile.language")} onPress={() => setLangOpen(true)} trailing={<LanguageValue />} last />
        </SettingsGroup>

        {/* Support */}
        <SettingsGroup title={t("profile.support")}>
          <SettingsRow icon="info" label={t("profile.help")} onPress={openHelp} />
          <SettingsRow icon="doc" label={t("profile.terms")} onPress={openTerms} last />
        </SettingsGroup>

        {/* Account */}
        {status !== "guest" ? (
          <SettingsGroup title={t("profile.account")}>
            <SettingsRow icon="logout" label={t("profile.logout")} danger onPress={onLogout} last />
          </SettingsGroup>
        ) : null}

        <Text style={[type({ role: "mono", weight: 500, size: 11, leading: 1.3, color: p.fgSubtle, align: "center" }), { marginTop: 22, marginBottom: 8 }]}>
          Eventflow · v{version}
        </Text>
      </Body>
      <TopBar large floating onHeight={setHeaderH} title={t("profile.title")} />

      <ModeSheet visible={modeOpen} onClose={() => setModeOpen(false)} />
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}
