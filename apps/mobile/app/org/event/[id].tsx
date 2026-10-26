/**
 * 4.6 / 4.7 · Event command centre (org session).
 *
 * The design's move is the DARK STAGE HEADER: status, countdown, the public
 * link and the event's own identity sit on ink, so the bone body below reads
 * purely as working surface. The old screen put the event in a light identity
 * row that looked like any other list item on the org side.
 *
 * Status-GATED actions are kept exactly as they were — there is no publish
 * endpoint, so publishing is only ever the moderated submit-review flow:
 *
 *   DRAFT           → Edit + "Submit for review"
 *   PENDING_REVIEW  → waiting info state, no actions
 *   PUBLISHED/live  → registration toggle, attendees, check-in, public page;
 *                     Cancel / Complete
 *   CANCELLED       → read-only cancelled band
 *   COMPLETED       → read-only completed band (+ view public)
 *
 * Not built from the design: the header's 4-tab rail (Обзор · Участники ·
 * Программа · Ещё 6). Only two of those exist on mobile — Участники is a pushed
 * route, and there is no programme/speakers surface here at all — so a rail
 * where half the tabs go nowhere would be chrome pretending to be navigation.
 */
import { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  blocksToPlainText,
  useCancelEventMutation,
  useCompleteEventMutation,
  useOrgEventDetailQuery,
  useSubmitReviewMutation,
  useUpdateEventMutation,
} from "@entities/org-events";
import { useCategoriesQuery } from "@entities/catalog";
import { useAuth, useCanEditEvent, useWorkspaceGate } from "@shared/auth";
import { ApiError } from "@shared/api";
import { useI18n } from "@shared/i18n";
import { env } from "@shared/config/env";
import { formatDateStamp, formatNumber, formatTime } from "@shared/lib/format";
import { confirm } from "@shared/lib/confirm";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, dark, gutter, radii, type, usePalette } from "@shared/theme";
import { ActionBar, Body, BottomSheet, Btn, type EventLifecycleStatus, EventSectionRail, Icon, IconBtn, ReviewLockedSheet, Screen, Skeleton, StateBlock, Tag, useToast } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const DAY_MS = 86_400_000;

/** Which lifecycle states show a full-width info band, and its tone/copy. */
const INFO_BANDS: Partial<
  Record<EventLifecycleStatus, { tone: "info" | "pending" | "danger" | "muted"; icon: string; title: StringKey; body: StringKey }>
> = {
  draft: { tone: "info", icon: "doc", title: "org.manage.draft.title", body: "org.manage.draft.body" },
  pending: { tone: "pending", icon: "clock", title: "org.manage.pending.title", body: "org.manage.pending.body" },
  cancelled: { tone: "danger", icon: "alert", title: "org.manage.cancelled.title", body: "org.manage.cancelled.body" },
  past: { tone: "muted", icon: "check", title: "org.manage.completed.title", body: "org.manage.completed.body" },
};

/** Status pill for the DARK header — the light-surface StatusDot would print
 *  its own bone fills on ink, so the stage gets its own tone map. */
function StagePill({ status }: { status: EventLifecycleStatus }): React.JSX.Element {
  const { t } = useI18n();
  const tones: Record<EventLifecycleStatus, { bg: string; fg: string }> = {
    draft: { bg: "rgba(255,255,255,0.12)", fg: "rgba(255,255,255,0.82)" },
    pending: { bg: "rgba(214,155,26,0.22)", fg: "#e8b93f" },
    published: { bg: "rgba(78,161,106,0.22)", fg: "#7fce9a" },
    live: { bg: "rgba(223,74,46,0.22)", fg: "#f08a70" },
    past: { bg: "rgba(255,255,255,0.10)", fg: "rgba(255,255,255,0.6)" },
    cancelled: { bg: "rgba(223,74,46,0.20)", fg: "#f08a70" },
  };
  const c = tones[status];
  const LABELS: Record<EventLifecycleStatus, StringKey> = {
    draft: "org.status.draft",
    published: "org.status.published",
    live: "org.status.live",
    past: "org.status.past",
    pending: "org.status.pending",
    cancelled: "org.status.cancelled",
  };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: c.bg }}>
      <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.08, color: c.fg, transform: "uppercase" })}>
        {t(LABELS[status])}
      </Text>
    </View>
  );
}

/** One meta line on the dark stage (calendar / pin / link). */
function StageMeta({ icon, text, accent: isAccent, onPress }: { icon: string; text: string; accent?: boolean; onPress?: () => void }): React.JSX.Element {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={14} sw={2} color="rgba(255,255,255,0.5)" />
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          type(isAccent
            ? { role: "mono", weight: 400, size: 13, leading: 1.2, color: accent.bright }
            : { weight: 400, size: 13, leading: 1.2, color: "rgba(255,255,255,0.72)" }),
          { flexShrink: 1 },
        ]}
      >
        {text}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <AnimatedPressable accessibilityRole="link" accessibilityLabel={text} haptic="tap" scaleTo={0.98} onPress={onPress}>
      {body}
    </AnimatedPressable>
  );
}

function InfoBand({ tone, icon, title, body }: { tone: "info" | "pending" | "danger" | "muted"; icon: string; title: string; body: string }): React.JSX.Element {
  const p = usePalette();
  const palette: Record<typeof tone, { bg: string; fg: string; icon: string }> = {
    info: { bg: p.sunken, fg: p.fg, icon: p.fgMuted },
    pending: { bg: p.warningSoft, fg: p.warning, icon: p.warning },
    danger: { bg: p.dangerSoft, fg: p.dangerSoftFg, icon: p.danger },
    muted: { bg: p.sunken, fg: p.fgMuted, icon: p.fgSubtle },
  };
  const c = palette[tone];
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: radii.card, backgroundColor: c.bg }}>
      <Icon name={icon} size={20} color={c.icon} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={type({ weight: 700, size: 14, leading: 1.25, color: c.fg })}>{title}</Text>
        <Text style={[type({ weight: 500, size: 13, leading: 1.45, color: p.fgMuted }), { marginTop: 4 }]}>{body}</Text>
      </View>
    </View>
  );
}

/** One row in the actions sheet. `hint` carries the consequence of a
 *  destructive action (e.g. how many people get a cancellation notice). */
function ActionRow({
  icon, label, hint, destructive, onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
  destructive?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const fg = destructive ? p.danger : p.fg;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      haptic="tap"
      scaleTo={0.985}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}
    >
      <Icon name={icon} size={19} sw={2} color={fg} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.2, color: fg })}>{label}</Text>
        {hint ? (
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>{hint}</Text>
        ) : null}
      </View>
      <Icon name="cright" size={16} color={p.fgSubtle} />
    </AnimatedPressable>
  );
}

/** Overview KPI tile — label, number, and the line that gives it meaning. */
function Tile({ label, value, foot }: { label: string; value: string; foot?: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flex: 1, padding: 13, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, gap: 5 }}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.1, color: p.fgSubtle, transform: "uppercase" })}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[type({ role: "display", weight: 700, size: 26, leading: 1, track: -0.03, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
      >
        {value}
      </Text>
      {foot ? (
        <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 11, leading: 1.3, color: p.fgMuted })}>
          {foot}
        </Text>
      ) : null}
    </View>
  );
}

export default function OrgEventManage(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useOrgEventDetailQuery(id);
  const categoriesQ = useCategoriesQuery({ locale: lang });
  const submitM = useSubmitReviewMutation();
  const cancelM = useCancelEventMutation();
  const completeM = useCompleteEventMutation();
  const updateM = useUpdateEventMutation();
  const [lockedOpen, setLockedOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const ev = q.data;

  const categoryNames = useMemo(() => {
    const byId = new Map((categoriesQ.data ?? []).map((c) => [c.id, c.name]));
    return (ev?.categoryIds ?? []).map((cid) => byId.get(cid)).filter(Boolean) as string[];
  }, [categoriesQ.data, ev?.categoryIds]);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  // Two different questions that used to share one name: is this event still a
  // draft, and may THIS member change it at all. The hook sits above the gate's
  // early return so the hook order never varies between renders.
  const mayEdit = useCanEditEvent();

  const gate = useWorkspaceGate();
  if (gate) return gate;

  const busy = submitM.isPending || cancelM.isPending || completeM.isPending;

  const back = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/org/(tabs)/events");
  };

  const publicUrl = ev?.slug ? `${env.webUrl}/events/${ev.slug}` : null;
  const openPublic = (): void => {
    if (publicUrl) void Linking.openURL(publicUrl).catch(() => undefined);
  };

  const openMaps = (): void => {
    if (!ev) return;
    const query = [ev.venue, ev.address, ev.city].filter(Boolean).join(", ");
    if (!query) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`).catch(() => undefined);
  };

  const onSubmitReview = (): void => {
    if (!ev) return;
    confirm({
      title: t("org.review.confirmTitle"),
      message: t("org.review.confirmBody"),
      confirmText: t("org.review.confirm"),
      cancelText: t("org.review.dismiss"),
      onConfirm: () => {
        submitM.mutate(ev.id, {
          onSuccess: () => {
            haptics.success();
            router.replace({ pathname: "/org/event/submitted", params: { name: ev.title } });
          },
          onError: (err) => {
            // 403 = organization not verified → first-class explainer, not a toast.
            if (err instanceof ApiError && err.status === 403) {
              haptics.warn();
              setLockedOpen(true);
              return;
            }
            haptics.error();
            toast.show(t("org.review.toast.error"));
          },
        });
      },
    });
  };

  const onCancel = (): void => {
    if (!ev) return;
    confirm({
      title: t("org.manage.cancel.confirmTitle"),
      message: t("org.manage.cancel.confirmBody"),
      confirmText: t("org.manage.cancel.confirm"),
      cancelText: t("org.manage.cancel.dismiss"),
      destructive: true,
      onConfirm: () => {
        cancelM.mutate(ev.id, {
          onSuccess: () => {
            haptics.success();
            toast.show(t("org.manage.toast.cancelled"));
          },
          onError: () => {
            haptics.error();
            toast.show(t("org.manage.toast.actionError"));
          },
        });
      },
    });
  };

  const onComplete = (): void => {
    if (!ev) return;
    confirm({
      title: t("org.manage.complete.confirmTitle"),
      message: t("org.manage.complete.confirmBody"),
      confirmText: t("org.manage.complete.confirm"),
      cancelText: t("org.manage.complete.dismiss"),
      onConfirm: () => {
        completeM.mutate(ev.id, {
          onSuccess: () => {
            haptics.success();
            toast.show(t("org.manage.toast.completed"));
          },
          onError: () => {
            haptics.error();
            toast.show(t("org.manage.toast.actionError"));
          },
        });
      },
    });
  };

  /** Registration open/closed — a PARTIAL update, the only field sent. */
  const onToggleRegistration = (): void => {
    if (!ev || updateM.isPending) return;
    const next = !ev.registrationOpen;
    haptics.select();
    updateM.mutate(
      { id: ev.id, payload: { registrationOpen: next } },
      {
        onSuccess: () => toast.show(t(next ? "org.manage.reg.opened" : "org.manage.reg.closed")),
        onError: () => {
          haptics.error();
          toast.show(t("org.manage.toast.actionError"));
        },
      },
    );
  };

  const band = ev ? INFO_BANDS[ev.lifecycle] : undefined;
  const isPublished = ev?.lifecycle === "published" || ev?.lifecycle === "live";
  const isDraft = ev?.lifecycle === "draft";
  const canEdit = isDraft && mayEdit;
  const hasEnded = ev?.endDate ? new Date(ev.endDate).getTime() < Date.now() : false;
  // Moderation only takes events that have not started yet — the API rejects
  // the rest, so the button must not promise what it cannot do.
  const canSubmit =
    ev?.status === "DRAFT" && mayEdit && (ev?.startDate ? new Date(ev.startDate).getTime() > Date.now() : false);
  // A finished event that was once live can be completed even from DRAFT:
  // re-moderation strips PUBLISHED, and without this it stays stuck forever.
  const canComplete =
    mayEdit && (ev?.status === "PUBLISHED" || (ev?.status === "DRAFT" && Boolean(ev?.publishedAt) && hasEnded));
  const canCancelEvent = mayEdit && (ev?.status === "PUBLISHED" || ev?.status === "DRAFT") && !hasEnded;
  const canOpenActions = Boolean(canComplete || canCancelEvent || (isPublished && mayEdit));

  // Countdown chip — only meaningful while the event is still ahead.
  let countdown: string | null = null;
  if (ev?.startDate && isPublished) {
    const days = Math.ceil((new Date(ev.startDate).getTime() - Date.now()) / DAY_MS);
    if (days === 0) countdown = t("org.home.countdown.today");
    else if (days > 0) countdown = t("org.manage.countdown", { n: days });
  }

  const when = ev?.startDate
    ? `${formatDateStamp(ev.startDate, lang)} · ${formatTime(ev.startDate, lang)}`
    : null;
  const where = ev ? [ev.venue, ev.city].filter(Boolean).join(", ") : "";
  const seatsLeft = ev?.capacity && ev.capacity > 0 ? Math.max(0, ev.capacity - ev.registrations) : null;
  const conversion = ev && ev.views > 0 ? ((ev.registrations / ev.views) * 100).toFixed(1) : null;
  const descriptionText = ev ? blocksToPlainText(ev.description).trim() : "";

  return (
    <Screen>
      {/* ── dark stage ─────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: dark.canvasDeep ?? "#0e0e0d", paddingTop: insets.top + 6, paddingHorizontal: gutter, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconBtn name="cleft" dark glass size={40} onPress={back} accessibilityLabel={t("org.manage.a11yBack")} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isPublished ? (
              <IconBtn
                name="qr"
                dark
                glass
                size={40}
                onPress={() => router.push({ pathname: "/org/event/qr", params: { id: ev?.id ?? "", title: ev?.title ?? "" } })}
                accessibilityLabel={t("org.eventQr.title")}
              />
            ) : null}
            {publicUrl ? (
              <IconBtn
                name="eye"
                dark
                glass
                size={40}
                onPress={() => router.push({ pathname: "/org/event/preview", params: { id: ev?.id ?? "" } })}
                accessibilityLabel={t("org.preview.title")}
              />
            ) : null}
            {/* The kebab holds Edit / Complete / Cancel — all `events:update`,
                so a member without it gets no menu rather than a dead one. */}
            {canOpenActions ? (
              <IconBtn name="more" dark glass size={40} onPress={() => setActionsOpen(true)} accessibilityLabel={t("org.manage.actions")} />
            ) : null}
          </View>
        </View>

        {ev ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
              <StagePill status={ev.lifecycle} />
              {countdown ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: "rgba(234,88,12,0.16)" }}>
                  <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.08, color: accent.bright })}>
                    {countdown}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={3}
              maxFontSizeMultiplier={1.3}
              style={[type({ role: "display", weight: 700, size: 25, leading: 1.15, track: -0.035, color: dark.fg }), { marginTop: 10 }]}
            >
              {ev.title}
            </Text>

            <View style={{ marginTop: 10, gap: 6 }}>
              {when ? <StageMeta icon="cal" text={when} /> : null}
              {where ? <StageMeta icon="pin" text={where} /> : null}
              {publicUrl ? (
                <StageMeta icon="globe" accent text={publicUrl.replace(/^https?:\/\//, "")} onPress={openPublic} />
              ) : null}
            </View>

            {/* Every section of this event, one tap away — the rail the web
                cabinet renders as a tab row. Sections that cannot exist yet are
                hidden rather than shown dead: a draft has no attendance to
                report and no certificates to issue. */}
            <View style={{ marginHorizontal: -16, marginTop: 14, marginBottom: -10 }}>
              <EventSectionRail
                dark
                eventId={ev.id}
                title={ev.title}
                active="overview"
                hidden={isPublished ? [] : ["attendance", "certificates", "badges"]}
              />
            </View>
          </>
        ) : (
          <View style={{ marginTop: 16, gap: 10 }}>
            <Skeleton w="45%" h={18} r={radii.pill} />
            <Skeleton w="80%" h={26} r={radii.md} />
          </View>
        )}
      </View>

      {q.isPending ? (
        <Body contentStyle={{ paddingTop: 16 }}>
          <Skeleton h={96} r={radii.card} />
          <Skeleton h={72} r={radii.card} style={{ marginTop: 12 }} />
          <Skeleton h={110} r={radii.card} style={{ marginTop: 12 }} />
        </Body>
      ) : q.isError || !ev ? (
        <View style={{ flex: 1, paddingVertical: 28 }}>
          <StateBlock
            icon="alert"
            tone="error"
            title={t("org.manage.notFound")}
            body={t("org.manage.notFoundBody")}
            action={<Btn size="md" variant="secondary" onPress={back}>{t("org.manage.a11yBack")}</Btn>}
          />
        </View>
      ) : (
        <>
          <Body contentStyle={{ paddingTop: 16, gap: 16 }}>
            {/* Overview tiles */}
            <Animated.View entering={enterStagger(0)} style={{ flexDirection: "row", gap: 10 }}>
              <Tile
                label={t("org.manage.stat.registered")}
                value={formatNumber(ev.registrations, lang)}
                foot={seatsLeft !== null ? t("org.manage.seatsLeft", { n: formatNumber(seatsLeft, lang) }) : undefined}
              />
              <Tile
                label={t("org.manage.stat.views")}
                value={formatNumber(ev.views, lang)}
                foot={conversion ? t("org.manage.conversion", { n: conversion }) : undefined}
              />
            </Animated.View>

            {/* Status info band */}
            {band ? (
              <Animated.View entering={enterStagger(1)}>
                <InfoBand tone={band.tone} icon={band.icon} title={t(band.title)} body={t(band.body)} />
              </Animated.View>
            ) : null}

            {/* Registration switch — a real partial update on the event */}
            {isPublished ? (
              <Animated.View
                entering={enterStagger(2)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: radii.card,
                  backgroundColor: p.surface,
                  borderWidth: 1,
                  borderColor: p.border,
                }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.2, color: p.fg })}>
                    {t(ev.registrationOpen ? "org.manage.reg.open" : "org.manage.reg.closedLabel")}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
                    {ev.registrationDeadline
                      ? t("org.manage.reg.deadline", {
                          date: formatDateStamp(ev.registrationDeadline, lang),
                          time: formatTime(ev.registrationDeadline, lang),
                        })
                      : t("org.manage.reg.noDeadline")}
                  </Text>
                </View>
                <AnimatedPressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: ev.registrationOpen }}
                  accessibilityLabel={t("org.manage.reg.open")}
                  haptic="select"
                  scaleTo={0.94}
                  onPress={onToggleRegistration}
                  style={{
                    width: 51,
                    height: 31,
                    borderRadius: radii.pill,
                    padding: 2,
                    backgroundColor: ev.registrationOpen ? p.success : p.borderStrong,
                    alignItems: ev.registrationOpen ? "flex-end" : "flex-start",
                    justifyContent: "center",
                    opacity: updateM.isPending ? 0.6 : 1,
                  }}
                >
                  <View style={{ width: 27, height: 27, borderRadius: radii.pill, backgroundColor: "#fff" }} />
                </AnimatedPressable>
              </Animated.View>
            ) : null}

            {/* Venue card with directions */}
            {where ? (
              <Animated.View
                entering={enterStagger(3)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: radii.card,
                  backgroundColor: p.surface,
                  borderWidth: 1,
                  borderColor: p.border,
                }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.2, color: p.fg })}>
                    {ev.venue || ev.city}
                  </Text>
                  {ev.address || ev.city ? (
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
                      {[ev.address, ev.city].filter(Boolean).join(", ")}
                    </Text>
                  ) : null}
                </View>
                <Btn size="sm" variant="secondary" icon="map" onPress={openMaps}>{t("common.directions")}</Btn>
              </Animated.View>
            ) : null}

            {/* Description + topics */}
            {descriptionText || categoryNames.length > 0 ? (
              <Animated.View
                entering={enterStagger(4)}
                style={{ padding: 14, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, gap: 8 }}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgSubtle, transform: "uppercase" })}
                >
                  {t("org.form.description")}
                </Text>
                {descriptionText ? (
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.55, color: p.fgDefault })}>
                    {descriptionText}
                  </Text>
                ) : null}
                {categoryNames.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                    {categoryNames.map((n) => (
                      <Tag key={n}>{n}</Tag>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            ) : null}


          </Body>

          {/* Primary action bar — DRAFT only (Edit + Submit for review). */}
          {canEdit ? (
            <ActionBar>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Btn full variant="secondary" icon="doc" onPress={() => router.push({ pathname: "/org/event-form", params: { id: ev.id } })}>
                    {t("org.manage.edit")}
                  </Btn>
                </View>
                <View style={{ flex: 1.3 }}>
                  <Btn full variant="primary" loading={submitM.isPending} disabled={busy || !canSubmit} onPress={onSubmitReview}>
                    {t("org.manage.submitReview")}
                  </Btn>
                </View>
              </View>
            </ActionBar>
          ) : null}
        </>
      )}

      {/* Actions sheet (design 4.6b, reduced to what the API actually offers —
          the design's six extra tabs have no mobile endpoint behind them). */}
      <BottomSheet visible={actionsOpen} onClose={() => setActionsOpen(false)} maxHeightRatio={0.6} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 4 }}>
          <Text style={[type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg }), { marginBottom: 8 }]}>
            {t("org.manage.actions")}
          </Text>

          {isPublished && mayEdit ? (
            <ActionRow
              icon="doc"
              label={t("org.manage.edit")}
              onPress={() => {
                setActionsOpen(false);
                if (ev) router.push({ pathname: "/org/event-form", params: { id: ev.id } });
              }}
            />
          ) : null}
          {canComplete ? (
            <ActionRow
              icon="check"
              label={t("org.manage.complete")}
              onPress={() => {
                setActionsOpen(false);
                onComplete();
              }}
            />
          ) : null}
          {canCancelEvent ? (
            <ActionRow
              icon="x"
              destructive
              label={t("org.manage.cancel")}
              hint={ev && ev.registrations > 0 ? t("org.manage.cancel.notice", { n: formatNumber(ev.registrations, lang) }) : undefined}
              onPress={() => {
                setActionsOpen(false);
                onCancel();
              }}
            />
          ) : null}
        </View>
      </BottomSheet>

      {/* Unverified-org 403 explainer (first-class, not a toast) */}
      <ReviewLockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
    </Screen>
  );
}
