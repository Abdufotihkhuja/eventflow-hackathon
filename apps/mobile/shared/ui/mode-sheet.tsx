/**
 * ModeSheet — the canonical attending ⇄ organizing switcher (design
 * `org-switch.jsx` §2, GAP_PLAN W5). One surface, three variants driven by the
 * account's memberships: no org (onboarding doorway), single org, multi org.
 *
 * Built on the W0 BottomSheet. Selection rows follow the ModeRow anatomy
 * (44px leading tile / OrgBadge, accentSoft active fill, check pop). A commit
 * swaps the session token (enter/exitWorkspace) and only THEN swaps shells —
 * failures surface as an error toast + error haptic, never silently.
 *
 * "Join with an invite code" is intentionally omitted: invites arrive as email
 * deep links (invite/membership rework), there is nothing to type in.
 */
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Text, View, type TextStyle } from "react-native";
import Animated from "react-native-reanimated";

import { useMyOrganizationsQuery } from "@entities/organization";
import { useAuth, type OrgSummary } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, dur, fadeIn, popIn } from "@shared/motion";
import { accent, gutter, radii, shadow, type, usePalette } from "@shared/theme";

import { BottomSheet } from "./bottom-sheet";
import { Btn } from "./button";
import { Icon } from "./icon";
import { OrgBadge } from "./org/org-badge";
import { Skeleton, Spinner } from "./primitives";
import { useToast } from "./toast";

/** Mono section eyebrow (sheet convention — JetBrains, ls 0.06em, uppercase). */
function Eyebrow({ children, style }: { children: string; style?: TextStyle }): React.JSX.Element {
  const p = usePalette();
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[
        type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.06, color: p.fgSubtle, transform: "uppercase" }),
        { marginHorizontal: 2, marginBottom: 10 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * ModeRow — the switcher's selection row (design §2.4): 44px leading tile,
 * title/sub column, trailing check chip (active, pops in) or chevron.
 * Exported for the full-screen switcher (`app/workspace-switch.tsx`).
 */
export function ModeRow({
  active,
  busy,
  disabled,
  onPress,
  leading,
  title,
  sub,
  chevron,
}: {
  active: boolean;
  /** Show a trailing spinner while this row's switch is committing. */
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  leading: React.ReactNode;
  title: string;
  sub?: string;
  chevron?: boolean;
}): React.JSX.Element {
  const p = usePalette();

  let trailing: React.ReactNode = null;
  if (busy) {
    trailing = <Spinner size={22} />;
  } else if (active) {
    trailing = (
      <Animated.View
        entering={popIn()}
        style={{ width: 24, height: 24, borderRadius: radii.pill, backgroundColor: accent.base, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="check" size={15} color={accent.on} sw={3} />
      </Animated.View>
    );
  } else if (chevron) {
    trailing = <Icon name="cright" size={18} color={p.fgSubtle} />;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled, busy: !!busy }}
      haptic="select"
      scaleTo={0.98}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          padding: 14,
          borderRadius: radii.card,
          backgroundColor: active ? accent.soft : p.surface,
          borderWidth: 1.5,
          borderColor: active ? accent.base : p.border,
        },
        active ? null : shadow.xs,
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 15, leading: 1.15, color: p.fg })}>
          {title}
        </Text>
        {sub ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[type({ weight: 500, size: 12, leading: 1.2, color: p.fgMuted }), { marginTop: 3 }]}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing}
    </AnimatedPressable>
  );
}

/** 44px ink tile with the compass glyph — the "Attending" mode mark. */
export function AttendingTile(): React.JSX.Element {
  const p = usePalette();
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: radii.control,
        backgroundColor: p.inverse,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name="compass" size={22} color={p.fgInverse} />
    </View>
  );
}

export function ModeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t } = useI18n();
  const toast = useToast();
  const { status, user, actorType, workspace, enterWorkspace, exitWorkspace, createParticipantProfile } = useAuth();
  // An ORG-ONLY account has no participant profile: /account/me 403s and the
  // identity comes from /session/me, which is exactly what leaves `user` null
  // while the status is authenticated. Offering such an account a "personal
  // cabinet" hands it a shell it cannot use — Tickets/Certificates/Profile all
  // 403 and the tabs read "sign in" while the user IS signed in.
  const hasPersonalProfile = status !== "authenticated" || user !== null;
  // A STAFF member is a person and may attend events, so they can be given a
  // participant profile. An organization OWNER cannot: the subject of that
  // session is the company, not a human. The server enforces both.
  const canCreatePersonal = !hasPersonalProfile && actorType === "MEMBER";
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pause the query while a commit is in flight: enter/exitWorkspace clear the
  // whole query cache mid-swap, and an enabled query would (a) collapse the
  // rows — including the one showing the busy spinner — into skeletons and
  // (b) refetch /me/organizations under the org-scoped token before the sheet
  // closes. Render from the last known data instead, so the sheet truly holds.
  const orgsQ = useMyOrganizationsQuery({ enabled: visible && status === "authenticated" && !busyId });
  // Last-known rows survive the cache wipe — through the commit AND the sheet's
  // exit animation after it (busyId is already null there, data still gone).
  const lastOrgs = useRef<OrgSummary[] | undefined>(undefined);
  if (orgsQ.data) lastOrgs.current = orgsQ.data;
  const known = orgsQ.data ?? lastOrgs.current;
  const orgs = known ?? [];
  const settled = orgsQ.isSuccess || (!!busyId && known !== undefined);
  const noOrgs = settled && orgs.length === 0;

  /** Commit a mode switch: token swap first, shell swap only after it resolves. */
  const commit = async (id: string, run: () => Promise<void>, dest: string): Promise<void> => {
    if (busyId) return;
    setBusyId(id);
    try {
      await run();
      haptics.success();
      // Let the sheet play its exit, then cross-fade into the other shell (the
      // destination screen fades its content in on mount). The workspace host
      // HOLDS its canvas through this window instead of auto-redirecting, so
      // this delayed replace is the single navigation for the commit.
      onClose();
      setTimeout(() => router.replace(dest), dur.base);
    } catch {
      haptics.error();
      onClose();
      toast.show(t("mode.error.switch"));
    } finally {
      setBusyId(null);
    }
  };

  const goPersonal = (): void => {
    if (!workspace) {
      onClose();
      return;
    }
    void commit("personal", () => exitWorkspace(), "/discover");
  };

  const goOrg = (org: OrgSummary): void => {
    if (workspace?.organizationId === org.organizationId) {
      onClose();
      return;
    }
    void commit(
      org.organizationId,
      async () => {
        // Single-token stash semantics: the stash must always hold the PERSONAL
        // session — restore it before entering a different org.
        if (workspace) await exitWorkspace();
        await enterWorkspace(org);
      },
      "/org",
    );
  };

  const roleSub = (org: OrgSummary): string => {
    const role = org.isOwner ? t("workspace.owner") : org.roleName;
    return role ? `${t("orghome.role")} · ${role}` : t("orghome.role");
  };

  // Organizations section — skeletons / honest error + retry / rows.
  // During a commit (`busyId`) the branches fall through to the snapshot rows.
  let orgsSection: React.ReactNode = null;
  if (orgsQ.isPending && known === undefined && status === "authenticated") {
    orgsSection = (
      <View style={{ marginTop: 18, gap: 10 }}>
        <Skeleton h={75} r={radii.card} />
        <Skeleton h={75} r={radii.card} />
      </View>
    );
  } else if (orgsQ.isError && known === undefined) {
    orgsSection = (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 18,
          padding: 14,
          borderRadius: radii.card,
          backgroundColor: p.dangerSoft,
        }}
      >
        <Icon name="alert" size={18} color={p.danger} />
        <Text style={[type({ weight: 500, size: 13, leading: 1.35, color: p.dangerSoftFg }), { flex: 1 }]}>{t("mode.error.orgs")}</Text>
        <Btn size="sm" variant="secondary" onPress={() => void orgsQ.refetch()}>
          {t("common.retry")}
        </Btn>
      </View>
    );
  } else if (orgs.length > 0) {
    orgsSection = (
      <Animated.View entering={fadeIn()}>
        <Eyebrow style={{ marginTop: 18 }}>
          {orgs.length > 1 ? `${t("workspace.orgs")} · ${orgs.length}` : t("mode.org")}
        </Eyebrow>
        <View style={{ gap: 10 }}>
          {orgs.map((o) => (
            <ModeRow
              key={o.organizationId}
              active={workspace?.organizationId === o.organizationId}
              busy={busyId === o.organizationId}
              disabled={!!busyId}
              onPress={() => goOrg(o)}
              leading={<OrgBadge name={o.name} hue={hueFromId(o.organizationId)} src={resolveMediaUrl(o.logoUrl)} />}
              title={o.name}
              sub={roleSub(o)}
              chevron
            />
          ))}
        </View>
      </Animated.View>
    );
  }

  // Provisioning is administrator-only. Memberships arrive through invites.
  let doorway: React.ReactNode = null;
  if (noOrgs) {
    doorway = (
      <Animated.View entering={fadeIn()} style={{ marginTop: 16 }}>
        <View style={{ padding: 18, borderRadius: radii.card, backgroundColor: p.inverse, marginBottom: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.control,
              backgroundColor: accent.base,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 13,
            }}
          >
            <Icon name="zap" size={22} color={accent.on} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fgInverse })}>
            {t("mode.promo.title")}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 13, leading: 1.5, color: p.fgInverseMuted }), { marginTop: 7 }]}>
            {t("mode.promo.body")}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={busyId ? () => undefined : onClose} closeLabel={t("common.close")}>
      {/* Header (fixed) */}
      <View style={{ paddingHorizontal: gutter, paddingTop: 14, paddingBottom: 6 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.025, color: p.fg })}>{t("mode.title")}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 13, leading: 1.4, color: p.fgMuted }), { marginTop: 5 }]}>{t("mode.sub")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 26 }}
      >
        {/* Personal — hidden entirely for org-only accounts (see
            `hasPersonalProfile`). `active` is frozen during a commit so the
            check doesn't pop onto this row mid-swap while `workspace` is
            transiently null. */}
        {canCreatePersonal ? (
          <>
            <Eyebrow>{t("workspace.personal")}</Eyebrow>
            <ModeRow
              active={false}
              busy={busyId === "create-personal"}
              disabled={!!busyId}
              onPress={() =>
                void commit("create-personal", () => createParticipantProfile(), "/discover")
              }
              leading={<AttendingTile />}
              title={t("workspace.createPersonal")}
              sub={t("workspace.createPersonal.sub")}
              chevron
            />
          </>
        ) : null}

        {hasPersonalProfile ? (
          <>
            <Eyebrow>{t("workspace.personal")}</Eyebrow>
            <ModeRow
              active={!workspace && !busyId}
              busy={busyId === "personal"}
              disabled={!!busyId}
              onPress={goPersonal}
              leading={<AttendingTile />}
              title={t("mode.attending")}
              sub={t("mode.attending.sub")}
              chevron
            />
          </>
        ) : null}

        {/* Organizations */}
        {orgsSection}

        {doorway}
      </ScrollView>
    </BottomSheet>
  );
}
