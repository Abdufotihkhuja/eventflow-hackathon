import { useMemo, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCreateInviteMutation,
  useOrgInvitesQuery,
  useOrgRolesQuery,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useTeamMembersQuery,
  type InviteVM,
  type RoleOption,
  type TeamMemberVM,
} from "@entities/org-team";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { resolveMediaUrl } from "@shared/lib/format";
import { confirm } from "@shared/lib/confirm";
import { haptics } from "@shared/lib/haptics";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable, enterStagger, popIn } from "@shared/motion";
import { accent, gutter, radii, shadow, type, usePalette } from "@shared/theme";
import { Avatar, Body, BottomSheet, Btn, Field, Icon, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

type TranslateFn = ReturnType<typeof useI18n>["t"];

/** Localize a role: known system roles map to a key; custom roles show raw. */
function roleLabel(t: TranslateFn, roleKey?: StringKey, roleRaw?: string | null): string {
  return roleKey ? t(roleKey) : roleRaw || "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Role pill — Owner gets the ember-soft treatment, everyone else neutral. */
function RolePill({ label, owner }: { label: string; owner: boolean }): React.JSX.Element {
  const p = usePalette();
  if (!label) return <View />;
  return (
    <View
      style={{
        height: 26,
        paddingHorizontal: 10,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: owner ? accent.soft : p.sunken,
      }}
    >
      <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11, leading: 1, color: owner ? accent.ink : p.fgDefault })}>
        {label}
      </Text>
    </View>
  );
}

/** A team member row (design 22 §5.5). Reads only whitelisted VM fields —
 *  never a raw member object (no passwordHash/invitationToken can appear). */
function MemberRow({ m, index, isYou }: { m: TeamMemberVM; index: number; isYou: boolean }): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const owner = m.roleKey === "org.team.role.owner";
  const inactive = !!m.status && m.status.toUpperCase() !== "ACTIVE";

  return (
    <Animated.View
      entering={enterStagger(Math.min(index, 5))}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderTopWidth: index ? 1 : 0,
        borderTopColor: p.borderSubtle,
        opacity: inactive ? 0.6 : 1,
      }}
    >
      <Avatar initials={m.initials} size={38} hue={m.hue} src={resolveMediaUrl(m.avatarUrl)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.15, color: p.fg })}>
          {m.name}
          {isYou ? <Text style={type({ weight: 500, size: 12, leading: 1.15, color: p.fgSubtle })}>{` · ${t("org.team.you")}`}</Text> : null}
        </Text>
      </View>
      <RolePill label={roleLabel(t, m.roleKey, m.roleRaw)} owner={owner} />
    </Animated.View>
  );
}

/** A pending-invite row (design 22 §5.5): dashed ghost avatar + resend/revoke. */
function InviteRow({
  invite,
  first,
  onResend,
  onRevoke,
  resending,
}: {
  invite: InviteVM;
  first: boolean;
  onResend: (id: string) => void;
  onRevoke: (invite: InviteVM) => void;
  resending: boolean;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const expired = invite.status === "EXPIRED";

  const resend = (): void => {
    onResend(invite.id);
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        backgroundColor: p.sunken,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: p.borderSubtle,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: p.borderStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="mail" size={17} color={p.fgSubtle} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.15, color: p.fgDefault })}>{invite.email}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 10, leading: 1.2, color: p.fgSubtle }), { marginTop: 4 }]}>
          {expired ? t("org.team.invite.expired") : t("org.team.invite.sent")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <AnimatedPressable
          onPress={resend}
          disabled={resending}
          accessibilityRole="button"
          accessibilityLabel={t("org.team.resend")}
          haptic="tap"
          hitSlop={8}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
        >
          <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 12, leading: 1, color: sent ? p.forestSoftFg : p.fgMuted })}>
            {sent ? t("org.team.resent") : t("org.team.resend")}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => onRevoke(invite)}
          accessibilityRole="button"
          accessibilityLabel={t("org.team.revoke")}
          haptic="tap"
          rippleBorderless
          hitSlop={8}
          style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="x" size={16} color={p.fgSubtle} sw={2.2} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

/** Section label — mono eyebrow with an optional trailing count. */
function SectionLabel({ children }: { children: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginTop: 24, marginBottom: 10, marginHorizontal: 4 }]}
    >
      {children}
    </Text>
  );
}

/** Invite-by-email bottom sheet: email + role picker (roles.list) → create. */
function InviteSheet({
  visible,
  onClose,
  orgId,
}: {
  visible: boolean;
  onClose: () => void;
  orgId: string;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const rolesQ = useOrgRolesQuery(visible ? orgId : undefined);
  const create = useCreateInviteMutation(orgId);

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const roles = rolesQ.data ?? [];
  // Default to the first non-owner role once the catalog loads.
  const effectiveRoleId =
    roleId ?? roles.find((r) => r.roleKey !== "org.team.role.owner")?.id ?? roles[0]?.id ?? null;

  const reset = (): void => {
    setEmail("");
    setRoleId(null);
    setError(null);
    setOkMsg(null);
  };
  const close = (): void => {
    if (create.isPending) return;
    reset();
    onClose();
  };

  const send = (): void => {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t("org.team.sheet.invalidEmail"));
      haptics.warn();
      return;
    }
    if (!effectiveRoleId) return;
    setError(null);
    create.mutate(
      { email: value, roleId: effectiveRoleId },
      {
        onSuccess: () => {
          haptics.success();
          setOkMsg(t("org.team.sheet.sent", { email: value }));
          setEmail("");
          // Let the confirmation breathe, then dismiss.
          setTimeout(() => {
            reset();
            onClose();
          }, 1400);
        },
        onError: () => {
          haptics.error();
          setError(t("org.team.sheet.error"));
        },
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={close} closeLabel={t("common.close")}>
      <View style={{ paddingHorizontal: gutter, paddingTop: 14, paddingBottom: 6 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ role: "display", weight: 700, size: 20, leading: 1.2, track: -0.025, color: p.fg })}>{t("org.team.sheet.title")}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 13, leading: 1.4, color: p.fgMuted }), { marginTop: 5 }]}>{t("org.team.sheet.sub")}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 26, gap: 16 }}
      >
        <Field
          label={t("org.team.sheet.email")}
          value={email}
          onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
          placeholder={t("org.team.sheet.emailPlaceholder")}
          icon="mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={error ?? undefined}
          returnKeyType="done"
          onSubmitEditing={send}
        />

        <View>
          <Text style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" }), { marginBottom: 8 }]}>
            {t("org.team.sheet.role")}
          </Text>
          {rolesQ.isPending ? (
            <View style={{ gap: 8 }}>
              <Skeleton h={48} r={radii.control} />
              <Skeleton h={48} r={radii.control} />
            </View>
          ) : rolesQ.isError ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radii.control, backgroundColor: p.dangerSoft }}>
              <Icon name="alert" size={16} color={p.danger} />
              <Text style={[type({ weight: 500, size: 13, leading: 1.35, color: p.dangerSoftFg }), { flex: 1 }]}>{t("org.team.sheet.rolesError")}</Text>
              <Btn size="sm" variant="secondary" onPress={() => void rolesQ.refetch()}>{t("common.retry")}</Btn>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {roles
                // Owner is not assignable via invite — hide it from the picker.
                .filter((r) => r.roleKey !== "org.team.role.owner")
                .map((r) => (
                  <RolePickRow
                    key={r.id}
                    role={r}
                    active={effectiveRoleId === r.id}
                    onPress={() => setRoleId(r.id)}
                  />
                ))}
            </View>
          )}
        </View>

        {okMsg ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radii.control, backgroundColor: p.forestSoft }}>
            <Icon name="check" size={16} color={p.forestSoftFg} sw={2.6} />
            <Text style={[type({ weight: 500, size: 13, leading: 1.35, color: p.forestSoftFg }), { flex: 1 }]}>{okMsg}</Text>
          </View>
        ) : (
          <Btn full variant="primary" icon="mail" loading={create.isPending} disabled={!effectiveRoleId} onPress={send}>
            {t("org.team.sheet.send")}
          </Btn>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

/** One selectable role row in the invite sheet (radio-style, check pops in). */
function RolePickRow({ role, active, onPress }: { role: RoleOption; active: boolean; onPress: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      haptic="select"
      scaleTo={0.98}
      onPress={onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radii.control,
          backgroundColor: active ? accent.soft : p.surface,
          borderWidth: 1.5,
          borderColor: active ? accent.base : p.border,
        },
        active ? null : shadow.xs,
      ]}
    >
      <Text style={[type({ weight: 600, size: 14, leading: 1.2, color: active ? accent.ink : p.fg }), { flex: 1 }]}>
        {roleLabel(t, role.roleKey, role.roleRaw)}
      </Text>
      {active ? (
        <Animated.View entering={popIn()} style={{ width: 22, height: 22, borderRadius: radii.pill, backgroundColor: accent.base, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={14} color={accent.on} sw={3} />
        </Animated.View>
      ) : (
        <View style={{ width: 22, height: 22, borderRadius: radii.pill, borderWidth: 1.5, borderColor: p.border }} />
      )}
    </AnimatedPressable>
  );
}

/** 21 · Team — organization members + pending invites + invite-by-email.
 *  SECURITY: the ONLY member source is `useTeamMembersQuery` (sanitized at the
 *  SDK boundary); rows read named VM fields, never a raw member object. */
export default function Team(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const { workspace, user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  const orgId = workspace?.organizationId;
  const membersQ = useTeamMembersQuery(orgId);
  const invitesQ = useOrgInvitesQuery(orgId);
  const resend = useResendInviteMutation(orgId ?? "");
  const revoke = useRevokeInviteMutation(orgId ?? "");

  const members = useMemo(() => membersQ.data ?? [], [membersQ.data]);
  // Only actionable invites (pending / expired) surface as rows.
  const pending = useMemo(
    () => (invitesQ.data ?? []).filter((i) => i.status === "PENDING" || i.status === "EXPIRED"),
    [invitesQ.data],
  );
  const myEmail = user?.email?.toLowerCase();

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onResend = (id: string): void => {
    resend.mutate(id, {
      onError: () => {
        haptics.error();
        confirm({
          title: t("org.team.resend.error"),
          confirmText: t("common.retry"),
          cancelText: t("common.close"),
          onConfirm: () => resend.mutate(id),
        });
      },
    });
  };
  const onRevoke = (invite: InviteVM): void => {
    confirm({
      title: t("org.team.revoke.title"),
      message: t("org.team.revoke.body", { email: invite.email }),
      confirmText: t("org.team.revoke"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        haptics.tap();
        revoke.mutate(invite.id, {
          onError: () => {
            haptics.error();
            confirm({ title: t("org.team.revoke.error"), confirmText: t("common.retry"), cancelText: t("common.close"), onConfirm: () => revoke.mutate(invite.id) });
          },
        });
      },
    });
  };

  const memberCount = members.length;
  const loading = membersQ.isPending;

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: p.borderSubtle, paddingBottom: 12 }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>{t("org.team.title")}</Text>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>{t("org.team.sub")}</Text>
        </View>
        <IconBtn name="plus" size={40} active onPress={() => setInviteOpen(true)} accessibilityLabel={t("org.team.inviteShort")} />
      </View>

      <Body>
        {loading ? (
          <View style={{ marginTop: 8, gap: 10 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} h={60} r={radii.card} />)}
          </View>
        ) : membersQ.isError ? (
          <View style={{ paddingVertical: 40 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("org.team.error")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => membersQ.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : (
          <>
            <SectionLabel>{t("org.team.count", { n: memberCount })}</SectionLabel>
            <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, overflow: "hidden" }}>
              {members.map((m, i) => (
                <MemberRow key={m.id} m={m} index={i} isYou={!!myEmail && m.email?.toLowerCase() === myEmail} />
              ))}
            </View>

            {/* "В команде только вы" — ТОЛЬКО когда сотрудников нет вовсе.
                На `<= 1` этот блок печатался под уже показанным участником. */}
            {memberCount === 0 && pending.length === 0 ? (
              <View style={{ paddingTop: 28 }}>
                <StateBlock icon="users" title={t("org.team.empty.title")} body={t("org.team.empty.body")} />
              </View>
            ) : null}

            {pending.length > 0 ? (
              <>
                <SectionLabel>{t("org.team.pending.title")}</SectionLabel>
                <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, overflow: "hidden" }}>
                  {pending.map((invite, i) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      first={i === 0}
                      onResend={onResend}
                      onRevoke={onRevoke}
                      resending={resend.isPending}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <View style={{ marginTop: 24 }}>
              <Btn full variant="secondary" size="lg" icon="plus" onPress={() => setInviteOpen(true)}>
                {t("org.team.inviteCta")}
              </Btn>
            </View>
          </>
        )}
      </Body>

      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} orgId={orgId ?? ""} />
    </Screen>
  );
}
