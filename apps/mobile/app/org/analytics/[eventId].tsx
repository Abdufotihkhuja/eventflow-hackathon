/**
 * 4.x · Event analytics — «Аналитика» from the web cabinet, at phone scale.
 *
 * The web tab draws a donut, a bar list and a trend chart. On a phone those
 * become one shape — a labelled horizontal bar — because at this width a donut
 * is a decoration you cannot read values off, and a bar list is the one chart
 * that stays legible next to its own numbers.
 *
 * Blocks the data cannot support are said out loud rather than drawn as zeroes:
 * `meta.unavailable` and the `hasXData` flags are the server telling us it does
 * not know, and an all-zero chart would read as "nobody came" instead.
 */
import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  peak,
  useEventAnalyticsQuery,
  type AnalyticsBucket,
  type AnalyticsFilter,
} from "@entities/event-analytics";
import { useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatNumber } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, Btn, EventSectionRail, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const STATUS_FILTERS: { key: AnalyticsFilter["status"] | undefined; label: StringKey }[] = [
  { key: undefined, label: "common.all" },
  { key: "APPROVED", label: "attendees.tab.approved" },
  { key: "PENDING", label: "attendees.tab.pending" },
  { key: "REJECTED", label: "attendees.tab.rejected" },
];

function SectionTitle({ children }: { children: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}
    >
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
  const p = usePalette();
  return (
    <View
      style={{
        padding: 14,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: p.surface,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

/** One metric. `suffix` carries the % sign so the number stays the big thing. */
function Stat({ label, value, suffix, foot }: { label: string; value: string; suffix?: string; foot?: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.08, color: p.fgMuted, transform: "uppercase" })}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text maxFontSizeMultiplier={1.2} style={[type({ role: "display", weight: 700, size: 26, leading: 1, track: -0.03, color: p.fg }), { fontVariant: ["tabular-nums"] }]}>
          {value}
        </Text>
        {suffix ? (
          <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 13, leading: 1, color: p.fgMuted })}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {foot ? (
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgSubtle })}>
          {foot}
        </Text>
      ) : null}
    </View>
  );
}

/** Server labels are English (`Male`, `Unknown`) — the ones with stable keys
 *  get our own copy so the screen does not switch language mid-sentence. */
function useBucketLabel(): (b: AnalyticsBucket) => string {
  const { t } = useI18n();
  return (b) => {
    if (b.key === "MALE") return t("org.analytics.gender.MALE");
    if (b.key === "FEMALE") return t("org.analytics.gender.FEMALE");
    if (b.key === "UNKNOWN" || b.key === "__unknown__") return t("org.analytics.unknown");
    return b.label;
  };
}

/** The one chart shape this screen uses — legible next to its own numbers. */
function BarList({ buckets, empty }: { buckets: AnalyticsBucket[]; empty: string }): React.JSX.Element {
  const p = usePalette();
  const labelOf = useBucketLabel();
  const max = peak(buckets);
  const shown = buckets.filter((b) => b.count > 0);

  if (max === 0 || shown.length === 0) {
    return (
      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.4, color: p.fgSubtle })}>
        {empty}
      </Text>
    );
  }

  return (
    <View style={{ gap: 9 }}>
      {shown.map((b) => (
        <View key={b.key} style={{ gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 500, size: 13, leading: 1.2, color: p.fgDefault }), { flex: 1 }]}>
              {labelOf(b)}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={[type({ role: "mono", weight: 600, size: 12, leading: 1, color: p.fg }), { fontVariant: ["tabular-nums"] }]}>
              {b.count}
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: radii.pill, backgroundColor: p.sunken, overflow: "hidden" }}>
            <View style={{ width: `${Math.round((b.count / max) * 100)}%`, height: "100%", backgroundColor: accent.base }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function OrgAnalytics(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [status, setStatus] = useState<AnalyticsFilter["status"] | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const query = useEventAnalyticsQuery(eventId, { status });
  const a = query.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

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
            {t("org.section.analytics")}
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
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="analytics" />
      </View>

      <Body
        contentStyle={{ gap: 18, paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={120} r={radii.card} />
            ))}
          </View>
        ) : query.isError || !a ? (
          <View style={{ paddingVertical: 40 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => query.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : a.meta.isEmpty ? (
          <View style={{ paddingVertical: 36 }}>
            <StateBlock icon="zap" title={t("org.analytics.empty.title")} body={t("org.analytics.empty.body")} />
          </View>
        ) : (
          <>
            {/* Status filter — the one an organizer actually flips on the move. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {STATUS_FILTERS.map(({ key, label }) => {
                const on = status === key;
                return (
                  <AnimatedPressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    haptic="select"
                    scaleTo={0.96}
                    onPress={() => setStatus(key)}
                    style={{
                      paddingHorizontal: 12,
                      height: 32,
                      justifyContent: "center",
                      borderRadius: radii.pill,
                      backgroundColor: on ? p.inverse : p.surface,
                      borderWidth: on ? 0 : 1,
                      borderColor: p.border,
                    }}
                  >
                    <Text maxFontSizeMultiplier={1.2} style={type({ weight: on ? 600 : 500, size: 12.5, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                      {t(label)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <Animated.View entering={enterStagger(0)} style={{ gap: 10 }}>
              <Card>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Stat
                    label={t("org.analytics.registrations")}
                    value={formatNumber(a.overview.totalRegistrations, lang)}
                    foot={t("org.analytics.approvedOf", { n: formatNumber(a.overview.approved, lang) })}
                  />
                  <Stat label={t("org.analytics.attendance")} value={String(a.overview.attendanceRate)} suffix="%" foot={t("org.analytics.attendedOf", { n: formatNumber(a.overview.attended, lang) })} />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Stat label={t("org.analytics.approvalRate")} value={String(a.overview.approvalRate)} suffix="%" />
                  <Stat label={t("org.analytics.conversion")} value={String(a.overview.endToEndConversion)} suffix="%" foot={t("org.analytics.conversionFoot")} />
                </View>
              </Card>
            </Animated.View>

            {/* Funnel — four steps, each a share of the one before it. */}
            <Animated.View entering={enterStagger(1)} style={{ gap: 8 }}>
              <SectionTitle>{t("org.analytics.funnel")}</SectionTitle>
              <Card>
                <BarList
                  empty={t("org.analytics.noData")}
                  buckets={[
                    { key: "registered", label: t("org.analytics.step.registered"), count: a.funnel.registered },
                    { key: "approved", label: t("org.analytics.step.approved"), count: a.funnel.approved },
                    ...(a.funnel.testCompleted != null
                      ? [{ key: "test", label: t("org.analytics.step.test"), count: a.funnel.testCompleted }]
                      : []),
                    { key: "checkedIn", label: t("org.analytics.step.checkedIn"), count: a.funnel.checkedIn },
                  ]}
                />
              </Card>
            </Animated.View>

            {/* Registrations by day. */}
            <Animated.View entering={enterStagger(2)} style={{ gap: 8 }}>
              <SectionTitle>{t("org.analytics.trend")}</SectionTitle>
              <Card>
                <BarList
                  empty={t("org.analytics.noData")}
                  buckets={a.registrationTrend.map((d) => ({
                    key: d.date,
                    label: formatDateStamp(d.date, lang),
                    count: d.total,
                  }))}
                />
              </Card>
            </Animated.View>

            {/* Demographics — each block says plainly when it has no data. */}
            <Animated.View entering={enterStagger(3)} style={{ gap: 8 }}>
              <SectionTitle>{t("org.analytics.demographics")}</SectionTitle>
              <Card>
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.2, color: p.fg })}>
                  {t("org.analytics.gender")}
                </Text>
                <BarList buckets={a.demographics.hasGenderData ? a.demographics.gender : []} empty={t("org.analytics.noData")} />
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.2, color: p.fg })}>
                  {t("org.analytics.age")}
                </Text>
                <BarList buckets={a.demographics.hasAgeData ? a.demographics.ageGroups : []} empty={t("org.analytics.noData")} />
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.2, color: p.fg })}>
                  {t("org.analytics.regions")}
                </Text>
                <BarList buckets={a.demographics.hasRegionData ? a.demographics.regions : []} empty={t("org.analytics.noData")} />
              </Card>
            </Animated.View>

            {/* Tests — only for events that actually run one. */}
            {a.tests.available ? (
              <Animated.View entering={enterStagger(4)} style={{ gap: 8 }}>
                <SectionTitle>{t("org.analytics.tests")}</SectionTitle>
                <Card>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Stat label={t("org.analytics.testCompleted")} value={formatNumber(a.tests.completed, lang)} foot={t("org.analytics.testStarted", { n: formatNumber(a.tests.started, lang) })} />
                    <Stat
                      label={t("org.analytics.testAverage")}
                      value={a.tests.averageScore != null ? String(Math.round(a.tests.averageScore)) : "—"}
                      foot={a.tests.passRate != null ? t("org.analytics.testPassRate", { n: String(a.tests.passRate) }) : undefined}
                    />
                  </View>
                  <BarList buckets={a.tests.scoreDistribution} empty={t("org.analytics.noData")} />
                </Card>
              </Animated.View>
            ) : null}

            {/* Per-question answer distribution. */}
            {a.questions.available && a.questions.questions.length > 0 ? (
              <Animated.View entering={enterStagger(5)} style={{ gap: 8 }}>
                <SectionTitle>{t("org.analytics.questions")}</SectionTitle>
                {a.questions.questions.map((q) => (
                  <Card key={q.questionId}>
                    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13.5, leading: 1.3, color: p.fg })}>
                      {q.question}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgSubtle })}>
                      {t("org.analytics.answers", { n: formatNumber(q.answersCount, lang) })}
                    </Text>
                    {q.options && q.options.length > 0 ? (
                      <BarList buckets={q.options} empty={t("org.analytics.noData")} />
                    ) : q.average != null ? (
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <Stat label={t("org.analytics.avg")} value={String(Math.round(q.average))} />
                        <Stat label={t("org.analytics.min")} value={q.min != null ? String(q.min) : "—"} />
                        <Stat label={t("org.analytics.max")} value={q.max != null ? String(q.max) : "—"} />
                      </View>
                    ) : null}
                  </Card>
                ))}
              </Animated.View>
            ) : null}

            <View style={{ paddingBottom: 8, paddingHorizontal: gutter - 16 }}>
              <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 400, size: 11, leading: 1.4, color: p.fgSubtle })}>
                {t("org.analytics.generated", { time: formatDateStamp(a.meta.generatedAt, lang) })}
              </Text>
            </View>
          </>
        )}
      </Body>
    </Screen>
  );
}
