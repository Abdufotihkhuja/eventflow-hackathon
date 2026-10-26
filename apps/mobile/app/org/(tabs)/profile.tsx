/**
 * Organization — the fourth organizer tab.
 *
 * What it replaced: a decorative cover band, a two-number strip, and four rows
 * (Name / Bio / Links / Location) that each carried a chevron and each opened
 * the SAME public page. Four affordances, one destination, nothing editable —
 * and a footnote claiming the profile "is edited in the browser", which was
 * never true (`PATCH /workspace/me` has always existed).
 *
 * What it is now, in the order an organizer needs it:
 *
 *   1. Identity      — the mark, the name, tenure. Tap to edit (owners).
 *   2. Verification  — only when it is NOT settled, and it says what to DO.
 *                      A REJECTED org used to read as "In review" forever and
 *                      never saw `rejectionReason`; now it does.
 *   3. Numbers       — events / followers / team.
 *   4. Public profile— the actual copy a visitor reads, not four blank rows,
 *                      with the two real actions: edit it, or go look at it.
 *   5. Plan          — the org home's plan chip pushes here; before this the
 *                      destination said nothing about the plan.
 *   6. Organization  — team, workspace switch.
 *   7. App + Account — language, help, terms, log out. An ORG-ONLY account has
 *                      no participant profile, so the organizer shell was the
 *                      only shell it could reach — and it had no way out.
 */
import { useState } from "react";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Linking, RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useEntitlementsQuery } from "@entities/billing";
import { useOrgProfileQuery, useWorkspaceOrgQuery, toOrgVM, type WorkspaceOrg } from "@entities/organization";
import { useTeamMembersQuery } from "@entities/org-team";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { formatMonthYear, formatNumber, hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";
import {
  Avatar, Body, Btn, Icon, LanguageSheet, LanguageValue, ModeSheet, OrgBadge, OrgHeader,
  Screen, SettingsGroup, SettingsRow, Skeleton,
} from "@shared/ui";

const SUPPORT_EMAIL = "support@eventflow.uz";

/** Handle shown under the name. Derived from the same rule the public
 *  view-model uses (`toOrgVM`), so the two surfaces can never print different
 *  handles for one organization. */
function handleOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "org";
}

/** One number in the summary strip. */
function Stat({ value, label, first, pending }: { value: string; label: string; first?: boolean; pending?: boolean }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", borderLeftWidth: first ? 0 : 1, borderLeftColor: p.borderSubtle }}>
      {pending ? (
        <Skeleton w={34} h={20} />
      ) : (
        <Text
          maxFontSizeMultiplier={1.3}
          style={[type({ role: "display", weight: 700, size: 18, leading: 1, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
        >
          {value}
        </Text>
      )}
      <Text
        maxFontSizeMultiplier={1.3}
        style={[type({ role: "mono", weight: 500, size: 10, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginTop: 8 }]}
      >
        {label}
      </Text>
    </View>
  );
}

/** Section eyebrow with an optional trailing link — the org home's rail-header
 *  pattern. Secondary actions belong up here: inside the card they turn into a
 *  row of competing buttons, which is what a template looks like. */
function Eyebrow({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginHorizontal: 4, marginBottom: 10 }}>
      <Text
        maxFontSizeMultiplier={1.3}
        style={type({ weight: 600, size: 11, leading: 1.2, track: 0.04, color: p.fgMuted, transform: "uppercase" })}
      >
        {children}
      </Text>
      {action ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={action}
          haptic="tap"
          scaleTo={0.96}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onAction}
        >
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 12, leading: 1.2, color: accent.ink })}>
            {action}
          </Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

/**
 * The verification strip. It exists only while verification is UNSETTLED —
 * an approved org gets a quiet line in the masthead instead, because a green
 * "Verified" card that never goes away is decoration.
 */
function VerificationNote({ org }: { org: WorkspaceOrg }): React.JSX.Element | null {
  const p = usePalette();
  const { t } = useI18n();
  if (org.verificationStatus === "APPROVED") return null;

  const rejected = org.verificationStatus === "REJECTED";
  const fg = rejected ? p.dangerSoftFg : p.fg;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 14,
        borderRadius: radii.card,
        backgroundColor: rejected ? p.dangerSoft : p.sunken,
        borderWidth: 1,
        borderColor: rejected ? "rgba(194,39,14,0.24)" : p.borderSubtle,
      }}
    >
      <Icon name={rejected ? "alert" : "clock"} size={18} sw={2} color={rejected ? p.danger : p.fgMuted} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.25, color: fg })}>
          {t(rejected ? "org.verify.rejected.title" : "org.verify.pending.title")}
        </Text>
        {/* The reason the super-admin actually wrote. Nothing on mobile showed
            it before, so a rejected organization had no idea what to fix. */}
        {rejected && org.rejectionReason ? (
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 500, size: 13, leading: 1.45, color: fg })}>
            {org.rejectionReason}
          </Text>
        ) : null}
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.45, color: rejected ? fg : p.fgMuted })}>
          {t(rejected ? "org.verify.rejected.body" : "org.verify.pending.body")}
        </Text>
      </View>
    </View>
  );
}

/** A line of public-profile meta (icon + value), or nothing when unset. */
function MetaLine({ icon, value, onPress }: { icon: string; value?: string; onPress?: () => void }): React.JSX.Element | null {
  const p = usePalette();
  if (!value) return null;
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={14} color={p.fgSubtle} />
      <Text numberOfLines={1} style={[type({ weight: 500, size: 13, leading: 1.3, color: onPress ? accent.ink : p.fgDefault }), { flex: 1 }]}>
        {value}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <AnimatedPressable accessibilityRole="link" haptic="tap" scaleTo={0.99} onPress={onPress}>
      {body}
    </AnimatedPressable>
  );
}

export default function OrgProfile(): React.JSX.Element {
  const p = usePalette();
  const { t, tn, lang } = useI18n();
  const router = useRouter();
  const { workspace, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const orgId = workspace?.organizationId;
  const profileQ = useOrgProfileQuery(orgId);
  const membersQ = useTeamMembersQuery(orgId);
  const entQ = useEntitlementsQuery(orgId);
  // The org's OWN record: description/website/address as stored, plus the
  // rejection reason and tenure the public profile does not carry.
  const orgQ = useWorkspaceOrgQuery(orgId);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;
  // Unreachable at runtime — the gate above already returned when `workspace`
  // is null. It exists so TypeScript can narrow: the gate hides the check
  // inside a hook, and the compiler cannot see through that.
  if (!workspace) return <View style={{ flex: 1 }} />;

  const vm = profileQ.data ? toOrgVM(profileQ.data) : undefined;
  const org = orgQ.data;
  // `workspace` is the switcher's snapshot and is refreshed after an edit;
  // `org` is authoritative but 403s for staff. Prefer the record, fall back.
  const name = org?.name && org.name !== "—" ? org.name : workspace.name;
  const hue = hueFromId(workspace.organizationId);
  const handle = handleOf(name);
  const members = membersQ.data ?? [];
  const memberPreview = members.slice(0, 4);
  const ent = entQ.data;

  // Only the ORGANIZATION actor may write the profile (`@Roles` on the API).
  // Staff see the same content, read-only, with the reason stated once.
  const canEdit = workspace.isOwner;
  const verified = (org?.verificationStatus ?? workspace.verificationStatus) === "APPROVED";

  const description = org?.description ?? vm?.description;
  const website = org?.website ?? vm?.website;
  const websiteLabel = website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const address = org?.address ?? vm?.address;
  const blank = !description && !website && !address;

  const openPublic = (): void => router.push(`/organizer/${workspace.organizationId}`);
  const openEdit = (): void => router.push("/org/profile-edit");
  const openTeam = (): void => router.push("/org/team");
  const openHelp = (): void => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined);
  const openTerms = (): void => void Linking.openURL(`${env.webUrl}/${lang}/terms`).catch(() => undefined);
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

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([profileQ.refetch(), membersQ.refetch(), orgQ.refetch(), entQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      {/* Title matches the TAB label, not the section noun: tapping «Ещё» and
          landing on a screen headed «Организация» reads as a mis-navigation.
          The org identity card directly below already says which organization
          this is, so the header does not need to repeat it. */}
      {/* Header and tab carry the SAME word. Which organization it is, the
          identity card says a few pixels below — repeating the name in a
          subtitle just prints it twice. */}
      <OrgHeader title={t("org.tab.org")} />
      <Body
        tabBarClearance
        contentStyle={{ paddingTop: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {/* 1 · Identity. No decorative cover band: the participant profile
            opens on substance too, and a generated colour field here says
            nothing this organization does not already say with its mark. */}
        <Animated.View entering={enterStagger(0)}>
          <AnimatedPressable
            accessibilityRole={canEdit ? "button" : undefined}
            accessibilityLabel={canEdit ? t("org.edit.title") : undefined}
            disabled={!canEdit}
            haptic={canEdit ? "tap" : "none"}
            scaleTo={0.99}
            onPress={openEdit}
            style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
          >
            <OrgBadge name={name} hue={hue} size={64} radius={16} src={resolveMediaUrl(org?.logoUrl ?? workspace.logoUrl)} />
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 21, leading: 1.15, track: -0.02, color: p.fg })}>
                {name}
              </Text>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 12, leading: 1.2, color: p.fgMuted })}>
                {t("org.profile.handle", { handle })}
              </Text>
              {/* Trust and tenure, on one quiet line — an approved org needs no
                  green card, and "since" is a fact only this org has. */}
              {verified && org?.verifiedAt ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
                  <Icon name="verified" size={13} color={p.forest} />
                  <Text numberOfLines={1} style={type({ weight: 500, size: 12, leading: 1.2, color: p.forest })}>
                    {t("org.verify.approved.since", { date: formatMonthYear(org.verifiedAt, lang) })}
                  </Text>
                </View>
              ) : org?.createdAt ? (
                <Text numberOfLines={1} style={type({ weight: 400, size: 12, leading: 1.2, color: p.fgSubtle })}>
                  {t("org.profile.since", { date: formatMonthYear(org.createdAt, lang) })}
                </Text>
              ) : null}
            </View>
            {canEdit ? <Icon name="cright" size={18} color={p.fgSubtle} /> : null}
          </AnimatedPressable>
        </Animated.View>

        {/* 2 · Verification — shown only while it is unsettled. */}
        {org && org.verificationStatus !== "APPROVED" ? (
          <Animated.View entering={enterStagger(1)} style={{ marginTop: 16 }}>
            <VerificationNote org={org} />
          </Animated.View>
        ) : null}

        {/* 3 · Numbers */}
        <Animated.View
          entering={enterStagger(2)}
          style={{ flexDirection: "row", borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, overflow: "hidden", marginTop: 16 }}
        >
          <Stat first pending={profileQ.isPending} value={formatNumber(vm?.eventsCount ?? 0, lang)} label={t("org.profile.stat.events")} />
          <Stat pending={profileQ.isPending} value={formatNumber(vm?.followersCount ?? 0, lang)} label={t("org.profile.stat.followers")} />
          <Stat pending={membersQ.isPending} value={formatNumber(members.length, lang)} label={t("org.profile.stat.team")} />
        </Animated.View>

        {/* 4 · Public profile — the copy itself, then the two real actions.
            The old four rows were four chevrons into one screen. */}
        <Animated.View entering={enterStagger(3)} style={{ marginTop: 22 }}>
          <Eyebrow action={t("org.profile.publicPage")} onAction={openPublic}>
            {t("org.profile.public.section")}
          </Eyebrow>
          <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 16, gap: 12 }}>
            {orgQ.isPending && !vm ? (
              <View style={{ gap: 10 }}>
                <Skeleton w="90%" h={14} />
                <Skeleton w="60%" h={14} />
              </View>
            ) : blank ? (
              <Text style={type({ weight: 400, size: 13, leading: 1.5, color: p.fgMuted })}>
                {t("org.profile.public.blank")}
              </Text>
            ) : (
              <>
                {description ? (
                  <Text style={type({ weight: 400, size: 14, leading: 1.55, color: p.fgDefault })}>{description}</Text>
                ) : null}
                {website || address ? (
                  <View style={{ gap: 9 }}>
                    <MetaLine icon="globe" value={websiteLabel} onPress={website ? () => void Linking.openURL(website).catch(() => undefined) : undefined} />
                    <MetaLine icon="pin" value={address} />
                  </View>
                ) : null}
              </>
            )}

            {/* One action in the card — editing. Viewing the public page is
                the section header's link. */}
            {canEdit ? (
              <View style={{ marginTop: 2 }}>
                <Btn size="sm" variant="secondary" icon="edit" onPress={openEdit}>{t("org.profile.edit")}</Btn>
              </View>
            ) : null}
          </View>
          {canEdit ? null : (
            <Text style={[type({ weight: 400, size: 12, leading: 1.4, color: p.fgSubtle }), { marginTop: 8, marginHorizontal: 4 }]}>
              {t("org.profile.readOnly")}
            </Text>
          )}
        </Animated.View>

        {/* 5 · Plan. The org home's plan chip pushes here — before this the
            destination carried nothing about the plan at all. Absent for a
            staff member without BILLING_VIEW (the query 403s and stays quiet). */}
        {ent ? (
          <Animated.View entering={enterStagger(4)} style={{ marginTop: 22 }}>
            <Eyebrow>{t("org.profile.planSection")}</Eyebrow>
            <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: radii.sm, backgroundColor: p.inverse }}>
                  <Text style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.08, color: p.fgInverse })}>{ent.tierKey}</Text>
                </View>
                {ent.suspended ? (
                  <Text style={type({ weight: 600, size: 13, leading: 1.2, color: p.danger })}>{t("org.plan.suspended")}</Text>
                ) : null}
              </View>

              {/* Only the meters that carry a real ceiling. `enforcementEnabled:
                  false` means nothing is being applied yet — nagging about a
                  limit nobody enforces is the entity's own documented rule. */}
              {ent.eventCredits || (ent.enforcementEnabled && (ent.maxEvents || ent.staffSeats)) ? (
                <View style={{ gap: 7 }}>
                  {ent.eventCredits ? (
                    <MetaLine icon="ticket" value={t("org.plan.credits", { n: formatNumber(ent.eventCredits.remaining, lang) })} />
                  ) : null}
                  {ent.enforcementEnabled && ent.maxEvents ? (
                    <MetaLine icon="cal" value={t("org.plan.eventsUsed", { used: formatNumber(vm?.eventsCount ?? 0, lang), limit: formatNumber(ent.maxEvents, lang) })} />
                  ) : null}
                  {ent.enforcementEnabled && ent.staffSeats ? (
                    <MetaLine icon="users" value={t("org.plan.seats", { n: formatNumber(ent.staffSeats, lang) })} />
                  ) : null}
                </View>
              ) : null}

              <Text style={type({ weight: 400, size: 12, leading: 1.45, color: p.fgSubtle })}>{t("org.plan.changeOnWeb")}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* 6 · Organization */}
        <Animated.View entering={enterStagger(5)}>
          <SettingsGroup title={t("org.profile.orgSection")}>
            <SettingsRow
              icon="users"
              label={t("org.team.title")}
              sub={membersQ.data ? tn("org.team.members", members.length) : undefined}
              onPress={openTeam}
              trailing={
                memberPreview.length > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row" }}>
                      {memberPreview.map((m, i) => (
                        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -9, borderRadius: radii.pill, borderWidth: 2, borderColor: p.surface }}>
                          <Avatar initials={m.initials} size={26} hue={m.hue} src={resolveMediaUrl(m.avatarUrl)} />
                        </View>
                      ))}
                    </View>
                    <Icon name="cright" size={17} color={p.fgSubtle} />
                  </View>
                ) : undefined
              }
            />
            <SettingsRow icon="building" label={t("org.profile.switch")} onPress={() => setModeOpen(true)} last />
          </SettingsGroup>
        </Animated.View>

        {/* 7 · App + Account. An org-only account reaches no other shell —
            without these it could not change language or sign out at all. */}
        <Animated.View entering={enterStagger(6)}>
          <SettingsGroup title={t("org.profile.appSection")}>
            <SettingsRow icon="bell" label={t("notifSettings.title")} onPress={() => router.push("/notification-settings")} />
            <SettingsRow icon="globe" label={t("profile.language")} onPress={() => setLangOpen(true)} trailing={<LanguageValue />} />
            <SettingsRow icon="info" label={t("profile.help")} onPress={openHelp} />
            <SettingsRow icon="doc" label={t("profile.terms")} onPress={openTerms} last />
          </SettingsGroup>

          <SettingsGroup title={t("profile.account")}>
            <SettingsRow icon="logout" label={t("profile.logout")} danger onPress={onLogout} last />
          </SettingsGroup>
        </Animated.View>

        <Text style={[type({ role: "mono", weight: 500, size: 11, leading: 1.3, color: p.fgSubtle, align: "center" }), { marginTop: 22, marginBottom: 8 }]}>
          Eventflow · v{version}
        </Text>
      </Body>

      <ModeSheet visible={modeOpen} onClose={() => setModeOpen(false)} />
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}
