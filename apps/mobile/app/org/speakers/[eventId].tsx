/**
 * 4.x · Event speakers — «Спикеры» from the web cabinet, at phone scale.
 *
 * Two entry paths, both real API operations: add by hand, or invite by email
 * and let the speaker fill their own profile in. The invitation state rides on
 * the card, because "did Aziz accept yet?" is the question an organizer asks
 * from a phone — and the answer is what decides whether they chase him.
 *
 * Avatar upload and reordering stay in the web cabinet (see the entity module).
 */
import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  speakerFullName,
  speakerSubtitle,
  useCreateSpeakerMutation,
  useDeleteSpeakerMutation,
  useInviteSpeakerMutation,
  useResendSpeakerInviteMutation,
  useSpeakersQuery,
  useUpdateSpeakerMutation,
  type Speaker,
  type SpeakerInviteStatus,
} from "@entities/speakers";
import { useCanEditEvent, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { resolveMediaUrl } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Avatar, backToEvent, Body, BottomSheet, Btn, EventSectionRail, Field, Icon, IconBtn, Screen, Skeleton, StateBlock, useMutationError, useToast } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const INVITE_LABEL: Record<Exclude<SpeakerInviteStatus, "NONE">, StringKey> = {
  PENDING: "org.speakers.status.pending",
  ACCEPTED: "org.speakers.status.accepted",
  REJECTED: "org.speakers.status.rejected",
};

interface Draft {
  id?: string;
  firstName: string;
  lastName: string;
  position: string;
  company: string;
  bio: string;
}

/** Monogram for a speaker without a photo — first letters of the name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function emptyDraft(): Draft {
  return { firstName: "", lastName: "", position: "", company: "", bio: "" };
}

function toDraft(s: Speaker): Draft {
  return {
    id: s.id,
    firstName: s.firstName ?? "",
    lastName: s.lastName ?? "",
    position: s.position ?? "",
    company: s.company ?? "",
    bio: s.bio ?? "",
  };
}

/** Invitation state, in the tone that matches what it asks of the organizer:
 *  accepted is settled, rejected/expired want a decision, pending is waiting. */
function inviteTone(status: SpeakerInviteStatus, p: ReturnType<typeof usePalette>): string {
  if (status === "ACCEPTED") return p.success;
  if (status === "REJECTED") return p.danger;
  return p.fgMuted;
}

function SpeakerCard({
  speaker,
  index,
  onEdit,
  onDelete,
  onResend,
  resending,
}: {
  speaker: Speaker;
  index: number;
  /** Absent for a read-only member — the card then just reads. */
  onEdit?: () => void;
  onDelete?: () => void;
  onResend: () => void;
  resending: boolean;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const name = speakerFullName(speaker);
  const subtitle = speakerSubtitle(speaker);
  const status = speaker.invitationStatus ?? "NONE";
  const photo = speaker.photoUrl ? resolveMediaUrl(speaker.photoUrl) : null;

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={name}
        haptic="tap"
        scaleTo={0.99}
        onPress={onEdit}
        onLongPress={onDelete}
        style={{
          flexDirection: "row",
          gap: 12,
          padding: 14,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: p.surface,
        }}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: radii.pill }} resizeMode="cover" />
        ) : (
          <Avatar initials={initialsOf(name)} size={48} />
        )}

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.25, track: -0.015, color: p.fg })}>
            {name}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.35, color: p.fgMuted })}>
              {subtitle}
            </Text>
          ) : null}
          {status !== "NONE" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: inviteTone(status, p) }} />
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 11.5, leading: 1, color: p.fgDefault })}>
                {t(INVITE_LABEL[status])}
              </Text>
              {/* Only a stalled invitation is worth chasing. */}
              {status === "PENDING" ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("org.speakers.resend")}
                  haptic="tap"
                  hitSlop={8}
                  onPress={onResend}
                  disabled={resending}
                >
                  <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11.5, leading: 1, color: accent.base })}>
                    {t("org.speakers.resend")}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <Icon name="cright" size={18} color={p.fgSubtle} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function OrgSpeakers(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const toast = useToast();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [sheet, setSheet] = useState<Draft | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = useCanEditEvent();
  const query = useSpeakersQuery(eventId);
  const createM = useCreateSpeakerMutation(eventId);
  const updateM = useUpdateSpeakerMutation(eventId);
  const deleteM = useDeleteSpeakerMutation(eventId);
  const inviteM = useInviteSpeakerMutation(eventId);
  const resendM = useResendSpeakerInviteMutation(eventId);
  const onError = useMutationError();

  const rows = query.data ?? [];
  const busy = createM.isPending || updateM.isPending;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const onSave = (): void => {
    if (!sheet) return;
    if (!sheet.firstName.trim()) {
      setErrors({ name: t("org.speakers.err.name") });
      haptics.error();
      return;
    }
    setErrors({});
    const payload = {
      firstName: sheet.firstName.trim(),
      lastName: sheet.lastName.trim() || undefined,
      position: sheet.position.trim() || undefined,
      company: sheet.company.trim() || undefined,
      bio: sheet.bio.trim() || undefined,
    };
    const done = (): void => {
      haptics.success();
      setSheet(null);
    };
    if (sheet.id) updateM.mutate({ id: sheet.id, ...payload }, { onSuccess: done, onError });
    else createM.mutate(payload, { onSuccess: done, onError });
  };

  const onInvite = (): void => {
    const email = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: t("org.speakers.err.email") });
      haptics.error();
      return;
    }
    setErrors({});
    inviteM.mutate(
      { email },
      {
        onSuccess: () => {
          haptics.success();
          setInviteOpen(false);
          setInviteEmail("");
          toast.show(t("org.speakers.invite.sent"));
        },
        onError,
      },
    );
  };

  const onDelete = (s: Speaker): void => {
    confirm({
      title: t("org.speakers.delete.title"),
      message: t("org.speakers.delete.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => deleteM.mutate(s.id, { onError }),
    });
  };

  const gate = useWorkspaceGate();
  if (gate) return gate;

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingBottom: 4,
        }}
      >
        <IconBtn name="cleft" size={40} onPress={() => backToEvent(router, eventId)} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {t("org.section.speakers")}
          </Text>
          {/* The event's name doubles as the way back to it — a labelled "up"
              beside the unlabelled arrow, which is what tells you where the
              arrow goes before you press it. */}
          {title ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={title}
              haptic="tap"
              hitSlop={6}
              onPress={() => backToEvent(router, eventId)}
            >
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
                {title}
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
        {canEdit ? (
          <>
            <IconBtn name="mail" size={40} onPress={() => { setErrors({}); setInviteOpen(true); }} accessibilityLabel={t("org.speakers.invite")} />
            <IconBtn name="plus" size={40} active onPress={() => { setErrors({}); setSheet(emptyDraft()); }} accessibilityLabel={t("org.speakers.add")} />
          </>
        ) : null}
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="speakers" />
      </View>

      <Body
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={78} r={radii.card} />
            ))}
          </View>
        ) : query.isError ? (
          <View style={{ paddingVertical: 40 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => query.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ paddingVertical: 36 }}>
            <StateBlock
              icon="users"
              title={t("org.speakers.empty.title")}
              body={t("org.speakers.empty.body")}
              action={
                canEdit ? (
                  <Btn size="md" variant="primary" icon="plus" onPress={() => { setErrors({}); setSheet(emptyDraft()); }}>
                    {t("org.speakers.add")}
                  </Btn>
                ) : undefined
              }
            />
          </View>
        ) : (
          <View style={{ gap: 10, paddingTop: 4 }}>
            {rows.map((s, i) => (
              <SpeakerCard
                key={s.id}
                speaker={s}
                index={i}
                onEdit={canEdit ? () => { setErrors({}); setSheet(toDraft(s)); } : undefined}
                onDelete={canEdit ? () => onDelete(s) : undefined}
                onResend={() => resendM.mutate(s.id, { onSuccess: () => toast.show(t("org.speakers.invite.sent")) })}
                resending={resendM.isPending}
              />
            ))}
          </View>
        )}
      </Body>

      {/* Add / edit by hand */}
      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} maxHeightRatio={0.9} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
            {sheet?.id ? t("org.speakers.form.edit") : t("org.speakers.form.new")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("org.speakers.field.firstName")}
                required
                value={sheet?.firstName ?? ""}
                onChangeText={(v) => setSheet((s) => (s ? { ...s, firstName: v } : s))}
                error={errors.name}
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("org.speakers.field.lastName")}
                value={sheet?.lastName ?? ""}
                onChangeText={(v) => setSheet((s) => (s ? { ...s, lastName: v } : s))}
                autoCapitalize="words"
              />
            </View>
          </View>
          <Field
            label={t("org.speakers.field.position")}
            value={sheet?.position ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, position: v } : s))}
            autoCapitalize="sentences"
          />
          <Field
            label={t("org.speakers.field.company")}
            value={sheet?.company ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, company: v } : s))}
            autoCapitalize="sentences"
          />
          <Field
            label={t("org.speakers.field.bio")}
            value={sheet?.bio ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, bio: v } : s))}
            multiline
            numberOfLines={3}
            maxLength={1000}
            autoCapitalize="sentences"
          />
          <Btn full size="lg" variant="primary" loading={busy} onPress={onSave}>
            {t("common.save")}
          </Btn>
        </View>
      </BottomSheet>

      {/* Invite by email */}
      <BottomSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} maxHeightRatio={0.6} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
              {t("org.speakers.invite.title")}
            </Text>
            <Text style={type({ weight: 400, size: 13, leading: 1.5, color: p.fgMuted })}>
              {t("org.speakers.invite.body")}
            </Text>
          </View>
          <Field
            label="Email"
            required
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="speaker@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
          />
          <Btn full size="lg" variant="primary" loading={inviteM.isPending} onPress={onInvite}>
            {t("org.speakers.invite")}
          </Btn>
        </View>
      </BottomSheet>
    </Screen>
  );
}
