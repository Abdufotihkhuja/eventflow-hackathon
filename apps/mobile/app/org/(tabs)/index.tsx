import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useOrgActivityQuery, useOrgDashboardStatsQuery, type OrgActivityItem, type OrgActivityType } from "@entities/org-dashboard";
import { useOrgEventsListQuery, type OrgEventRow } from "@entities/org-events";
import { useAccountUnreadCountQuery } from "@entities/account-notifications";
import { useEntitlementsQuery, type Entitlements } from "@entities/billing";
import { useUnreadCountQuery } from "@entities/notifications";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatNumber, formatTime, formatWeekdayLong, hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, dur, enterStagger, fadeIn, useCountUp } from "@shared/motion";
import { useAppBadgeSync } from "@shared/notifications";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, Icon, Kpi, ModeSheet, OrgBadge, OrgHeader, PosterThumb, Screen, Skeleton, StateBlock } from "@shared/ui";

import type { Lang } from "@shared/data/events";
import type { StringKey } from "@shared/i18n/strings";

type TranslateFn = ReturnType<typeof useI18n>["t"];

const DAY_MS = 86_400_000;

/** Client-side relative time — activity `timeAgo` arrives pre-formatted in
 *  Russian, so uz/en users would see Russian; rebuild from `createdAt`. */
function relTime(iso: string, t: TranslateFn, lang: Lang): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return t("comments.time.now");
  const m = Math.floor(s / 60);
  if (m < 60) return t("comments.time.min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("comments.time.hour", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("comments.time.day", { n: d });
  return formatDateStamp(iso, lang);
}

/** Rebuilt activity copy — `description` is pre-formatted RU (never render). */
const ACTIVITY_META: Record<OrgActivityType, { label: StringKey; tone: "accent" | "success" | "info" | "mute" }> = {
  REGISTRATION: { label: "org.home.activity.registration", tone: "accent" },
  EVENT_CREATED: { label: "org.home.activity.eventCreated", tone: "mute" },
  EVENT_PUBLISHED: { label: "org.home.activity.eventPublished", tone: "success" },
  TASK_CREATED: { label: "org.home.activity.taskCreated", tone: "mute" },
  TASK_COMPLETED: { label: "org.home.activity.taskCompleted", tone: "mute" },
  MEMBER_JOINED: { label: "org.home.activity.memberJoined", tone: "info" },
};

function greetingKey(): StringKey {
  const h = new Date().getHours();
  if (h < 12) return "org.home.greeting.morning";
  if (h < 18) return "org.home.greeting.afternoon";
  return "org.home.greeting.evening";
}

/** Plan chip (design 4.3 §header): tier badge, then whatever the plan actually
 *  says about itself.
 *
 *  The design also prints «истекает через 9 дн.» — `GET /billing/entitlements`
 *  carries no expiry field for any tier, so that half is not rendered rather
 *  than invented. Credits appear only when the plan grants them. */
function PlanChip({ ent, onPress }: { ent: Entitlements; onPress: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={t("org.plan.current", { tier: ent.tierKey })}
      haptic="tap"
      scaleTo={0.99}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 9,
        paddingHorizontal: 11,
        borderRadius: radii.control,
        backgroundColor: p.sunken,
        borderWidth: 1,
        borderColor: p.borderSubtle,
      }}
    >
      <View style={{ paddingHorizontal: 6, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: p.inverse }}>
        <Text style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.08, color: p.fgInverse })}>
          {ent.tierKey}
        </Text>
      </View>
      {ent.eventCredits ? (
        <Text numberOfLines={1} style={[type({ weight: 500, size: 12, leading: 1.2, color: p.fgDefault }), { flexShrink: 1 }]}>
          {t("org.plan.credits", { n: formatNumber(ent.eventCredits.remaining, lang) })}
        </Text>
      ) : null}
      {ent.suspended ? (
        <Text numberOfLines={1} style={type({ weight: 500, size: 12, leading: 1.2, color: p.danger })}>
          {t("org.plan.suspended")}
        </Text>
      ) : null}
      <View style={{ flex: 1 }} />
      <Icon name="cright" size={15} color={p.fgSubtle} />
    </AnimatedPressable>
  );
}

/** Section heading + optional trailing link (design 4.3 §rail headers). */
function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <Text
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 12, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}
      >
        {title}
      </Text>
      {action ? (
        <AnimatedPressable accessibilityRole="button" haptic="tap" scaleTo={0.96} onPress={onAction} hitSlop={8}>
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 12, leading: 1, color: accent.base })}>
            {action}
          </Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

/** KPI tile with the §3.2 count-up recipe; delta direction derived from the
 *  SIGN of the API's changePercent (design bug fix — never guess). */
function StatKpi({
  label, target, unit, changePercent, foot, lang, onPress, a11y,
}: {
  label: string;
  target: number;
  unit?: string;
  changePercent?: number;
  foot?: string;
  lang: Lang;
  onPress?: () => void;
  a11y?: string;
}): React.JSX.Element {
  const value = useCountUp(target);
  const hasDelta = typeof changePercent === "number" && Number.isFinite(changePercent) && changePercent !== 0;
  const tile = (
    <Kpi
      label={label}
      value={formatNumber(value, lang)}
      unit={unit}
      delta={hasDelta ? `${formatNumber(Math.abs(changePercent), lang)}%` : undefined}
      deltaUp={hasDelta ? changePercent > 0 : undefined}
      foot={foot}
    />
  );
  if (!onPress) return tile;
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={a11y ?? label} haptic="tap" scaleTo={0.975} onPress={onPress}>
      {tile}
    </AnimatedPressable>
  );
}

/** Live-event row: countdown pill, title, when/where, fill meter.
 *  The meter is the point of the row — an organizer scanning the home screen
 *  wants "is this one filling up?" before anything else. */
function LiveEventRow({ row, first }: { row: OrgEventRow; first: boolean }): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const { t, lang } = useI18n();

  const startMs = row.startDate ? new Date(row.startDate).getTime() : NaN;
  const days = Number.isNaN(startMs) ? null : Math.ceil((startMs - Date.now()) / DAY_MS);
  // "Soon" = within 3 days: the pill and the meter both go ember so the row
  // reads as urgent at a glance, not just as another line of text.
  const urgent = days !== null && days <= 3;
  // «D-3», not «3 дн.»: the design's countdown reads as a marker on a calendar,
  // and it survives every locale without agreeing with a number.
  let countdown: string | null = null;
  if (days !== null) countdown = days <= 0 ? t("org.home.countdown.today") : `D-${formatNumber(days, lang)}`;

  const pct = row.capacity && row.capacity > 0 ? Math.min(1, row.registrations / row.capacity) : null;
  const where = [row.venue, row.city].filter(Boolean).join(", ");
  const meta = [
    row.startDate ? `${formatDateStamp(row.startDate, lang)}, ${formatTime(row.startDate, lang)}` : null,
    where || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View>
      {first ? null : <View style={{ height: 1, backgroundColor: p.borderSubtle }} />}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={row.title}
        haptic="tap"
        scaleTo={0.99}
        onPress={() => router.push({ pathname: "/org/event/[id]", params: { id: row.id } })}
        style={{ flexDirection: "row", gap: 12, padding: 12 }}
      >
        <PosterThumb hue={row.hue} pattern={row.pattern} coverImage={row.coverImage} size={56} />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {countdown ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: radii.pill,
                  backgroundColor: urgent ? accent.base : p.sunken,
                }}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: urgent ? accent.on : p.fgDefault })}
                >
                  {countdown}
                </Text>
              </View>
            ) : null}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 14, leading: 1.2, color: p.fg }), { flexShrink: 1 }]}>
              {row.title}
            </Text>
          </View>
          {meta ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.2, color: p.fgMuted })}>
              {meta}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            {pct !== null ? (
              <View style={{ flex: 1, height: 5, borderRadius: radii.pill, backgroundColor: p.sunken, overflow: "hidden" }}>
                <View style={{ width: `${Math.round(pct * 100)}%`, height: "100%", backgroundColor: urgent ? accent.base : p.fgDefault }} />
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Text
              maxFontSizeMultiplier={1.2}
              style={[type({ role: "mono", weight: 600, size: 11, leading: 1, color: p.fgDefault }), { fontVariant: ["tabular-nums"] }]}
            >
              {row.capacity ? `${formatNumber(row.registrations, lang)}/${formatNumber(row.capacity, lang)}` : formatNumber(row.registrations, lang)}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );
}

/** One "needs attention" card — an actionable finding, not a notification. */
function AttentionRow({
  icon, tone, title, body, onPress,
}: {
  icon: string;
  tone: "warning" | "info";
  title: string;
  body: string;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      haptic="tap"
      scaleTo={0.985}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: radii.card,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.border,
      }}
    >
      <Icon name={icon} size={18} sw={2} color={tone === "warning" ? p.warning : p.info} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.2, color: p.fg })}>
          {title}
        </Text>
        <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
          {body}
        </Text>
      </View>
      <Icon name="cright" size={16} color={p.fgSubtle} />
    </AnimatedPressable>
  );
}

/** Activity timeline row — a coloured dot instead of a boxed icon, so four
 *  entries read as one thread rather than four cards (design 4.3 §activity). */
function ActivityRow({ item, index }: { item: OrgActivityItem; index: number }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.REGISTRATION;
  const when = relTime(item.createdAt, t, lang);
  const DOT = { accent: accent.base, success: p.success, info: p.info, mute: p.fgSubtle };
  const dot = DOT[meta.tone];

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: dot,
          marginTop: 5,
          // Only the freshest entry gets the halo — it marks "this just
          // happened", so giving every row one would say nothing.
          ...(index === 0 ? { borderWidth: 3, borderColor: accent.ring } : null),
        }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.4, color: p.fgDefault })}>
          {t(meta.label)}
          {item.entityName ? (
            <Text style={type({ weight: 600, size: 13, leading: 1.4, color: p.fg })}>{` · ${item.entityName}`}</Text>
          ) : null}
        </Text>
        {when ? (
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
            {when}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** 15 · Organizer overview, rebuilt to design 4.3: a dateline + greeting, a
 *  2×2 KPI grid that TAPS THROUGH to the section behind each number, the live
 *  events rail with fill meters, "needs attention" findings, and the activity
 *  thread. Every figure comes from the dashboard DTO, the events list, or
 *  `GET /billing/entitlements` (the plan chip), plus the notification bell fed
 *  by `GET /notifications/unread-count`. */
export default function OrgOverview(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { user, workspace } = useAuth();
  const [modeOpen, setModeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const orgId = workspace?.organizationId;
  const statsQ = useOrgDashboardStatsQuery(orgId);
  const activityQ = useOrgActivityQuery(orgId);
  const eventsQ = useOrgEventsListQuery(orgId);
  const entQ = useEntitlementsQuery(orgId);
  const unreadQ = useUnreadCountQuery(orgId);
  // Badge иконки приложения = УЧАСТНИЧЕСКИЙ unread (MOBILE_IMPACT §6, OQ-28
  // закрыт): org-цифра на иконке личного телефона путает. Личный инбокс
  // доступен и под org-scoped токеном (accountId в JWT есть), поэтому
  // счётчик опрашивается прямо отсюда; колокольчик В шапке остаётся
  // организационным (unreadQ выше).
  const accountUnreadQ = useAccountUnreadCountQuery();
  useAppBadgeSync(accountUnreadQ.data);

  // Колокольчик не должен врать после возвращения на дашборд: refetch при
  // фокусе + мягкий 60-секундный опрос, пока экран на виду (BL-36). Blur
  // снимает интервал — с других вкладок и экранов счётчик не опрашивается.
  // Тем же тиком освежается участнический счётчик — источник badge иконки.
  const refetchUnread = unreadQ.refetch;
  const refetchAccountUnread = accountUnreadQ.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchUnread();
      void refetchAccountUnread();
      const id = setInterval(() => {
        void refetchUnread();
        void refetchAccountUnread();
      }, 60_000);
      return () => clearInterval(id);
    }, [refetchUnread, refetchAccountUnread]),
  );

  // Once this mount has hosted a workspace, a null `workspace` means a
  // ModeSheet commit is mid-flight (org → org / org → personal): hold on a
  // bare canvas instead of bouncing through /discover. The sheet stays mounted
  // at a STABLE child position below and performs the navigation itself after
  // its exit animation (W5 stable-mount rule).
  const held = useRef(false);
  if (workspace) held.current = true;

  // Safety net for the held canvas: a commit that ends with NO workspace and a
  // closed sheet but no navigation (org → org where the exit succeeded and the
  // enter failed) would otherwise strand a blank screen.
  useEffect(() => {
    if (workspace || modeOpen || !held.current) return;
    const id = setTimeout(() => router.replace("/discover"), dur.sheet);
    return () => clearTimeout(id);
  }, [workspace, modeOpen, router]);

  const rows = useMemo(() => eventsQ.data?.rows ?? [], [eventsQ.data]);

  /** Upcoming published/live events, soonest first — the home rail shows the
   *  two an organizer is actually working on right now. */
  const live = useMemo(
    () =>
      rows
        .filter((r) => (r.lifecycle === "live" || r.lifecycle === "published") && r.startDate)
        .sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime()),
    [rows],
  );

  /** Published events that have drawn nothing — the finding worth surfacing,
   *  since an organizer cannot see it from any count on this screen. */
  const silent = useMemo(
    () => rows.filter((r) => (r.lifecycle === "live" || r.lifecycle === "published") && r.registrations === 0),
    [rows],
  );

  if (!workspace && !held.current && !modeOpen) return <Redirect href="/discover" />;

  const stats = statsQ.data;
  const noEvents = !!stats && stats.events.total === 0;
  const drafts = stats?.events.drafts ?? 0;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([statsQ.refetch(), activityQ.refetch(), eventsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      {workspace ? (
        <Animated.View entering={fadeIn()} style={{ flex: 1 }}>
          {/* Design 4.3's masthead: the dateline and greeting live IN the fixed
              header, with the plan chip hanging under them, so what the screen
              is and whose it is stay put while the numbers scroll.

              The design puts a bell and the user's avatar on the right. The
              bell carries the org's unread count. The avatar is the ORG's mark
              here instead of a person's: this control opens the workspace
              switcher, and the design reaches that through a separate screen
              (4.1b) it does not have to fit into this corner. */}
          <OrgHeader
            lead={
              <View style={{ gap: 3 }}>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.12, color: p.fgSubtle, transform: "uppercase" })}
                >
                  {formatWeekdayLong(new Date().toISOString(), lang)}
                </Text>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={type({ role: "display", weight: 700, size: 23, leading: 1.15, track: -0.03, color: p.fg })}
                >
                  {t(greetingKey(), { name: user?.firstName ? `, ${user.firstName}` : "" })}
                </Text>
              </View>
            }
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {/* Колокольчик со счётчиком (макет 4.3). Значок появляется
                    только когда есть что считать: «0» в кружке — это шум. */}
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("notif.title")}
                  haptic="tap"
                  scaleTo={0.9}
                  hitSlop={8}
                  onPress={() => router.push("/org/notifications")}
                >
                  <View>
                    <Icon name="bell" size={22} sw={1.8} color={p.fgDefault} />
                    {unreadQ.data ? (
                      <View
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -6,
                          minWidth: 16,
                          height: 16,
                          paddingHorizontal: 3,
                          borderRadius: radii.pill,
                          backgroundColor: accent.base,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={type({ role: "mono", weight: 600, size: 9, leading: 1, color: accent.on })}>
                          {unreadQ.data > 99 ? "99+" : formatNumber(unreadQ.data, lang)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </AnimatedPressable>

                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("org.profile.switch")}
                  haptic="tap"
                  scaleTo={0.94}
                  onPress={() => setModeOpen(true)}
                  style={{ opacity: modeOpen ? 0.6 : 1 }}
                >
                  <OrgBadge
                    name={workspace.name}
                    hue={hueFromId(workspace.organizationId)}
                    size={34}
                    radius={10}
                    src={resolveMediaUrl(workspace.logoUrl)}
                  />
                </AnimatedPressable>
              </View>
            }
            below={entQ.data ? <PlanChip ent={entQ.data} onPress={() => router.push("/org/profile")} /> : null}
          />

          <Body
            tabBarClearance
            pad={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />
            }
          >
            <View style={{ paddingHorizontal: gutter, paddingTop: 16, gap: 22 }}>
              {statsQ.isPending ? (
                /* 15c skeleton — geometry mirrors the real blocks */
                <View style={{ gap: 22 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={{ flexBasis: "47%", flexGrow: 1 }}>
                        <Skeleton h={104} r={14} />
                      </View>
                    ))}
                  </View>
                  <View style={{ gap: 10 }}>
                    <Skeleton w="40%" h={14} r={radii.md} />
                    <Skeleton h={160} r={radii.card} />
                  </View>
                </View>
              ) : statsQ.isError ? (
                <View style={{ paddingVertical: 28 }}>
                  <StateBlock
                    icon="alert"
                    tone="error"
                    title={t("state.error.title")}
                    body={t("state.error.body")}
                    action={<Btn size="md" variant="secondary" onPress={() => statsQ.refetch()}>{t("common.retry")}</Btn>}
                  />
                </View>
              ) : noEvents ? (
                /* 15b — org set up, zero events. Create the first one (W7). */
                <View style={{ paddingVertical: 28 }}>
                  <StateBlock
                    icon="cal"
                    title={t("org.home.empty.title")}
                    body={t("org.home.empty.body")}
                    action={<Btn size="md" variant="primary" icon="plus" onPress={() => router.push("/org/event-form")}>{t("org.events.createFirst")}</Btn>}
                  />
                </View>
              ) : stats ? (
                <>
                  {/* KPI grid — every tile opens the screen that explains it,
                      so a number is never a dead end. */}
                  <Animated.View entering={enterStagger(1)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <View style={{ flexBasis: "47%", flexGrow: 1 }}>
                      <StatKpi
                        label={t("org.home.kpi.registrations")}
                        target={stats.conversion.totalRegistrations}
                        changePercent={stats.participants.momChangePercent}
                        foot={t("org.home.kpi.registrations.foot", { n: formatNumber(stats.participants.newCount, lang) })}
                        lang={lang}
                        onPress={() => router.push("/org/events")}
                      />
                    </View>
                    <View style={{ flexBasis: "47%", flexGrow: 1 }}>
                      <StatKpi
                        label={t("org.home.kpi.events")}
                        target={stats.events.active.value}
                        changePercent={stats.events.active.changePercent}
                        foot={t("org.home.kpi.events.footTotal", { n: formatNumber(stats.events.total, lang) })}
                        lang={lang}
                        onPress={() => router.push("/org/events")}
                      />
                    </View>
                    <View style={{ flexBasis: "47%", flexGrow: 1 }}>
                      <StatKpi
                        label={t("org.home.kpi.approved")}
                        target={stats.conversion.registrationRate}
                        unit="%"
                        foot={t("org.home.kpi.approved.foot", {
                          a: formatNumber(stats.conversion.approvedRegistrations, lang),
                          b: formatNumber(stats.conversion.totalRegistrations, lang),
                        })}
                        lang={lang}
                        onPress={() => router.push("/org/events")}
                      />
                    </View>
                    <View style={{ flexBasis: "47%", flexGrow: 1 }}>
                      <StatKpi
                        label={t("org.home.kpi.checkin")}
                        target={stats.conversion.attendanceRate}
                        unit="%"
                        foot={t("org.home.kpi.checkin.foot", { n: formatNumber(stats.conversion.approvedRegistrations, lang) })}
                        lang={lang}
                        onPress={() => router.push("/org/scan")}
                      />
                    </View>
                  </Animated.View>

                  {/* Live rail — what is running or about to run */}
                  {live.length > 0 ? (
                    <Animated.View entering={enterStagger(2)} style={{ gap: 10 }}>
                      <SectionHead
                        title={t("org.home.section.live")}
                        action={t("org.home.section.liveAll", { n: formatNumber(live.length, lang) })}
                        onAction={() => router.push("/org/events")}
                      />
                      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, overflow: "hidden" }}>
                        {live.slice(0, 3).map((row, i) => (
                          <LiveEventRow key={row.id} row={row} first={i === 0} />
                        ))}
                      </View>
                    </Animated.View>
                  ) : null}

                  {/* Needs attention — findings an organizer would otherwise
                      have to go looking for. Hidden entirely when clean. */}
                  {drafts > 0 || silent.length > 0 ? (
                    <Animated.View entering={enterStagger(3)} style={{ gap: 10 }}>
                      <SectionHead title={t("org.home.section.attention")} />
                      {drafts > 0 ? (
                        <AttentionRow
                          icon="alert"
                          tone="warning"
                          title={t("org.home.attention.drafts", { n: formatNumber(drafts, lang) })}
                          body={t("org.home.attention.drafts.body")}
                          onPress={() => router.push("/org/events")}
                        />
                      ) : null}
                      {silent.length > 0 ? (
                        <AttentionRow
                          icon="info"
                          tone="info"
                          title={t("org.home.attention.noRegs", { n: formatNumber(silent.length, lang) })}
                          body={t("org.home.attention.noRegs.body", { title: silent[0].title })}
                          onPress={() =>
                            silent.length === 1
                              ? router.push({ pathname: "/org/event/[id]", params: { id: silent[0].id } })
                              : router.push("/org/events")
                          }
                        />
                      ) : null}
                    </Animated.View>
                  ) : null}

                  {/* Activity thread (24h) */}
                  <Animated.View entering={enterStagger(4)} style={{ gap: 12 }}>
                    <SectionHead title={t("org.home.activity")} />
                    {activityQ.isPending ? (
                      <View style={{ gap: 10 }}>
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} h={36} r={radii.control} />
                        ))}
                      </View>
                    ) : activityQ.isError ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }}>
                        <Icon name="alert" size={16} color={p.danger} />
                        <Text style={[type({ weight: 500, size: 13, leading: 1.35, color: p.fgMuted }), { flex: 1 }]}>{t("org.home.activity.error")}</Text>
                        <Btn size="sm" variant="secondary" onPress={() => activityQ.refetch()}>{t("common.retry")}</Btn>
                      </View>
                    ) : (activityQ.data?.items.length ?? 0) === 0 ? (
                      <Text style={type({ role: "mono", weight: 500, size: 12, leading: 1.4, color: p.fgSubtle })}>
                        {t("org.home.activity.empty")}
                      </Text>
                    ) : (
                      <View style={{ gap: 14, paddingLeft: 2 }}>
                        {activityQ.data?.items.map((item, i) => (
                          <ActivityRow key={item.id} item={item} index={i} />
                        ))}
                      </View>
                    )}
                  </Animated.View>
                </>
              ) : null}
            </View>
          </Body>
        </Animated.View>
      ) : null}

      <ModeSheet visible={modeOpen} onClose={() => setModeOpen(false)} />
    </Screen>
  );
}
