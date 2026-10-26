import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMyOrganizationsQuery } from "@entities/organization";
import { useAuth, type OrgSummary } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, enterStagger, fadeIn } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import {
  AttendingTile,
  Body,
  Btn,
  Icon,
  IconBtn,
  ModeRow,
  OrgBadge,
  Screen,
  Skeleton,
  StateBlock,
  useToast,
} from "@shared/ui";

/** 11 · Continue as — switch between the personal account and org workspaces.
 *  Full-screen sibling of the ModeSheet (org-only accounts boot here); rows
 *  share the ModeRow anatomy. Switch failures surface as a toast — the busy
 *  row shows a spinner until the token swap resolves. */
export default function WorkspaceSwitch(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const toast = useToast();
  const { user, actorType, workspace, status, enterWorkspace, exitWorkspace, logout, createParticipantProfile } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const orgsQ = useMyOrganizationsQuery({ enabled: status === "authenticated" });
  const orgs = orgsQ.data ?? [];

  const goPersonal = async (): Promise<void> => {
    if (busyId) return;
    if (!workspace) {
      // Already personal — the row is a dismiss. Same deep-link caveat as the
      // back button above: pop if we can, otherwise land in the personal shell.
      goBack(router, "/discover");
      return;
    }
    setBusyId("personal");
    try {
      await exitWorkspace();
      haptics.success();
      router.replace("/discover");
    } catch {
      haptics.error();
      toast.show(t("mode.error.switch"));
    } finally {
      setBusyId(null);
    }
  };

  const goOrg = async (org: OrgSummary): Promise<void> => {
    if (busyId) return;
    if (workspace?.organizationId === org.organizationId) {
      router.replace("/org");
      return;
    }
    setBusyId(org.organizationId);
    try {
      // Single-token stash semantics: the stash must always hold the PERSONAL
      // session — restore it before entering a different org.
      if (workspace) await exitWorkspace();
      await enterWorkspace(org);
      haptics.success();
      router.replace("/org");
    } catch {
      haptics.error();
      toast.show(t("mode.error.switch"));
    } finally {
      setBusyId(null);
    }
  };

  /** Same confirm-then-logout contract as the participant profile — signing
   *  out from the switcher must not behave differently from signing out there. */
  const onSignOut = async (): Promise<void> => {
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
  };

  const personalName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || t("mode.attending");
  // Org-only accounts have no participant profile (/account/me 403s), so the
  // personal shell would be a dead end: its tabs 403 and read "sign in" while
  // the user IS signed in. Do not offer a cabinet that does not exist.
  const hasPersonalProfile = status !== "authenticated" || user !== null;
  // Staff may become participants; an organization owner may not (the server
  // enforces it — this only decides whether to offer the action).
  const canCreatePersonal = !hasPersonalProfile && actorType === "MEMBER";

  const makePersonal = async (): Promise<void> => {
    if (busyId) return;
    setBusyId("create-personal");
    try {
      await createParticipantProfile();
      haptics.success();
      router.replace("/discover");
    } catch {
      haptics.error();
      toast.show(t("workspace.createPersonal.error"));
    } finally {
      setBusyId(null);
    }
  };

  const roleSub = (org: OrgSummary): string => {
    const role = org.isOwner ? t("workspace.owner") : org.roleName;
    return role ? `${t("orghome.role")} · ${role}` : t("orghome.role");
  };

  const eyebrow = (label: string, marginTop = 0): React.JSX.Element => (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[
        type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.06, color: p.fgSubtle, transform: "uppercase" }),
        { marginTop, marginBottom: 10 },
      ]}
    >
      {label}
    </Text>
  );

  // Organizations area — skeletons / honest error + retry / rows / empty promo.
  let orgsSection: React.ReactNode;
  if (orgsQ.isPending && status === "authenticated") {
    orgsSection = (
      <View style={{ marginTop: 22, gap: 10 }}>
        <Skeleton h={75} r={radii.card} />
        <Skeleton h={75} r={radii.card} />
      </View>
    );
  } else if (orgsQ.isError) {
    /* Honest failure — a network error must NOT read as "no orgs yet". */
    orgsSection = (
      <View style={{ paddingVertical: 28 }}>
        <StateBlock
          icon="alert"
          tone="error"
          title={t("state.error.title")}
          body={t("state.error.body")}
          action={
            <Btn size="md" variant="secondary" onPress={() => void orgsQ.refetch()}>
              {t("common.retry")}
            </Btn>
          }
        />
      </View>
    );
  } else if (orgs.length > 0) {
    orgsSection = (
      <Animated.View entering={fadeIn()}>
        {eyebrow(orgs.length > 1 ? `${t("workspace.orgs")} · ${orgs.length}` : t("mode.org"), 22)}
        <View style={{ gap: 10 }}>
          {orgs.map((o) => (
            <ModeRow
              key={o.organizationId}
              active={workspace?.organizationId === o.organizationId}
              busy={busyId === o.organizationId}
              disabled={!!busyId}
              onPress={() => void goOrg(o)}
              leading={<OrgBadge name={o.name} hue={hueFromId(o.organizationId)} src={resolveMediaUrl(o.logoUrl)} />}
              title={o.name}
              sub={roleSub(o)}
              chevron
            />
          ))}
        </View>
      </Animated.View>
    );
  } else {
    /* Empty — no organizations yet (design 11 empty variant) */
    orgsSection = (
      <Animated.View entering={fadeIn()} style={{ marginTop: 18, padding: 22, borderRadius: radii.card, backgroundColor: p.inverse, alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: radii.control, backgroundColor: accent.base, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Icon name="building" size={24} color={accent.on} />
        </View>
        <Text style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fgInverse, align: "center" })}>{t("workspace.empty.title")}</Text>
        <Text style={[type({ weight: 400, size: 13, leading: 1.5, color: p.fgInverseMuted, align: "center" }), { marginTop: 8 }]}>{t("workspace.empty.body")}</Text>
      </Animated.View>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
        {/* An org-only account BOOTS here, so there is routinely nothing to pop:
            fall back to whichever shell the session is actually in. */}
        <IconBtn
          name="cleft"
          size={40}
          onPress={() => goBack(router, workspace ? "/org" : "/discover")}
          accessibilityLabel={t("a11y.back")}
        />
      </View>
      <Body contentStyle={{ paddingTop: 10 }}>
        <Animated.View entering={enterStagger(0)} style={{ marginBottom: 18 }}>
          <Text style={type({ role: "display", weight: 700, size: 26, leading: 1.05, track: -0.03, color: p.fg })}>{t("workspace.switch.title")}</Text>
          <Text style={[type({ weight: 400, size: 14, leading: 1.45, color: p.fgMuted }), { marginTop: 7 }]}>{t("workspace.switch.sub")}</Text>
        </Animated.View>

        {/* Staff with no participant profile yet — offer to create one */}
        {canCreatePersonal ? (
          <Animated.View entering={enterStagger(1)}>
            {eyebrow(t("workspace.personal"))}
            <ModeRow
              active={false}
              busy={busyId === "create-personal"}
              disabled={!!busyId}
              onPress={() => void makePersonal()}
              leading={<AttendingTile />}
              title={t("workspace.createPersonal")}
              sub={t("workspace.createPersonal.sub")}
              chevron
            />
          </Animated.View>
        ) : null}

        {/* Personal — only for accounts that actually have one */}
        {hasPersonalProfile ? (
          <Animated.View entering={enterStagger(1)}>
            {eyebrow(t("workspace.personal"))}
            <ModeRow
              active={!workspace}
              busy={busyId === "personal"}
              disabled={!!busyId}
              onPress={() => void goPersonal()}
              leading={<AttendingTile />}
              title={personalName}
              sub={t("workspace.personal.sub")}
              chevron
            />
          </Animated.View>
        ) : null}

        {/* Organizations */}
        {orgsSection}

        {/* Account footer (design 4.1b). An org-only account boots straight
            here, so without this there is no way to tell WHICH account you are
            on — or to get off it — short of finding the participant profile. */}
        {user?.email ? (
          <Animated.View
            entering={enterStagger(2)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 24,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: p.borderSubtle,
            }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[type({ role: "mono", weight: 500, size: 12, leading: 1.2, color: p.fgMuted }), { flex: 1 }]}
            >
              {user.email}
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              haptic="tap"
              scaleTo={0.96}
              hitSlop={8}
              disabled={!!busyId}
              onPress={() => void onSignOut()}
            >
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, color: p.danger })}>
                {t("profile.logout")}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        ) : null}
      </Body>
    </Screen>
  );
}
