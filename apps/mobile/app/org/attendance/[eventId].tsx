/**
 * 4.10 · Attendance — who actually turned up, day by day.
 *
 * The design opens by saying a participant × day MATRIX does not work on a
 * phone, and replaces it with a day picker over a list of people. That holds
 * here too, so this screen is: three summary figures, a day rail built from the
 * dates the API reports, and the people who checked in on the chosen day.
 *
 * NOT built from the design: its present / late / excused / absent states and
 * the "2 из 3 дней" per-person roll-up. An attendance row in this API is a
 * check-in and nothing else — there is no state field to colour, and no
 * endpoint that records "excused". Showing four states over a two-state truth
 * would be the worst kind of fiction: it looks like data.
 *
 * "Отметить вручную" routes to the scanner's manual-code entry, which is the
 * only real way to record attendance without a camera — there is no
 * organizer-side "mark this person present" endpoint.
 */
import { useMemo, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAttendanceReportQuery, useAttendanceStatsQuery, type AttendanceAttendee } from "@entities/attendance";
import { PERM, useAuth, useHasPermission, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatNumber, formatTime } from "@shared/lib/format";
import { AnimatedPressable, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Avatar, backToEvent, Body, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

const ALL = "all";

function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || email[0]?.toUpperCase() || "?";
}

/** One summary figure. Three of them carry the whole answer to "how did the
 *  door go", so they are set as display numerals rather than a stat table. */
function Figure({ value, label, accented }: { value: string; label: string; accented?: boolean }): React.JSX.Element {
  const p = usePalette();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          type({ role: "display", weight: 700, size: 26, leading: 1, track: -0.035, color: accented ? accent.base : p.fg }),
          { fontVariant: ["tabular-nums"] },
        ]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 10, leading: 1.2, track: 0.08, color: p.fgSubtle, transform: "uppercase" })}
      >
        {label}
      </Text>
    </View>
  );
}

function AttendeeRow({ item, index, showDate }: { item: AttendanceAttendee & { date?: string }; index: number; showDate?: boolean }): React.JSX.Element {
  const p = usePalette();
  const { lang } = useI18n();
  return (
    <Animated.View
      entering={index < 10 ? enterStagger(Math.min(index, 5)) : undefined}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 }}
    >
      <Avatar initials={initialsOf(item.userName, item.userEmail)} size={38} hue={(item.userName.charCodeAt(0) * 13) % 360} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.2, color: p.fg })}>
          {item.userName}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.2, color: p.fgMuted })}>
          {item.userEmail}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={[type({ role: "mono", weight: 600, size: 12, leading: 1, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
        >
          {formatTime(item.checkInAt, lang)}
        </Text>
        {showDate && item.date ? (
          <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 400, size: 10, leading: 1, color: p.fgSubtle })}>
            {formatDateStamp(item.date, lang)}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function Attendance(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : t("org.attendance.title");

  const [day, setDay] = useState<string>(ALL);
  const [refreshing, setRefreshing] = useState(false);

  const reportQ = useAttendanceReportQuery(eventId || undefined);
  const statsQ = useAttendanceStatsQuery(eventId || undefined);

  const days = useMemo(() => reportQ.data ?? [], [reportQ.data]);

  /** Flattened people for the selected day (or every day, newest first). */
  const people = useMemo(() => {
    if (day !== ALL) return (days.find((d) => d.date === day)?.attendees ?? []).map((a) => ({ ...a }));
    return days
      .flatMap((d) => d.attendees.map((a) => ({ ...a, date: d.date })))
      .sort((a, b) => new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime());
  }, [days, day]);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const canCheckIn = useHasPermission()(PERM.attendanceCheckin);
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const stats = statsQ.data;
  const rate =
    stats && stats.totalRegistrations > 0 ? Math.round((stats.totalAttended / stats.totalRegistrations) * 100) : null;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([reportQ.refetch(), statsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => backToEvent(router, eventId)} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {t("org.attendance.title")}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
            {title}
          </Text>
        </View>
        {/* Reading the report is one right; marking someone in is another. */}
        {canCheckIn ? (
          <IconBtn
            name="qr"
            size={40}
            onPress={() => router.push({ pathname: "/org/scan", params: { title } })}
            accessibilityLabel={t("org.attendance.markManually")}
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Summary — registered / checked in / rate */}
      {statsQ.isPending ? (
        <View style={{ paddingHorizontal: gutter, paddingTop: 16 }}>
          <Skeleton h={64} r={radii.card} />
        </View>
      ) : stats ? (
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: gutter, paddingTop: 16 }}>
          <Figure value={formatNumber(stats.totalRegistrations, lang)} label={t("org.attendance.registered")} />
          <Figure value={formatNumber(stats.totalAttended, lang)} label={t("org.attendance.checkedIn")} />
          {rate !== null ? <Figure accented value={`${formatNumber(rate, lang)}%`} label={t("org.attendance.rate")} /> : null}
        </View>
      ) : null}

      {/* Day rail — built from the dates the report actually contains */}
      {days.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 16, paddingBottom: 4, gap: 8 }}
        >
          {[{ date: ALL, total: people.length }, ...days].map((d) => {
            const on = day === d.date;
            return (
              <AnimatedPressable
                key={d.date}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                haptic="select"
                scaleTo={0.97}
                onPress={() => setDay(d.date)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: 34,
                  paddingHorizontal: 13,
                  borderRadius: radii.pill,
                  backgroundColor: on ? p.inverse : p.sunken,
                }}
              >
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: on ? 600 : 500, size: 13, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                  {d.date === ALL ? t("org.attendance.allDays") : formatDateStamp(d.date, lang)}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    type({ role: "mono", weight: 600, size: 11, leading: 1, color: on ? p.fgInverseMuted : p.fgSubtle }),
                    { fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {formatNumber(d.date === ALL ? days.reduce((n, x) => n + x.total, 0) : d.total, lang)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Body
        contentStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {reportQ.isPending ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} h={54} r={radii.control} />
            ))}
          </View>
        ) : reportQ.isError ? (
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => reportQ.refetch()}>{t("common.retry")}</Btn>}
          />
        ) : people.length === 0 ? (
          <StateBlock
            icon="users"
            title={t("org.attendance.empty.title")}
            body={t("org.attendance.empty.body")}
            action={
              canCheckIn ? (
                <Btn size="md" variant="primary" icon="qr" onPress={() => router.push({ pathname: "/org/scan", params: { title } })}>
                  {t("org.attendance.markManually")}
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <View>
            {people.map((item, i) => (
              <View key={`${item.userId}-${item.checkInAt}`}>
                {i === 0 ? null : <View style={{ height: 1, backgroundColor: p.borderSubtle }} />}
                <AttendeeRow item={item} index={i} showDate={day === ALL && days.length > 1} />
              </View>
            ))}
            {/* The API records a check-in, not a status. Say so once, plainly,
                instead of implying the list is a full attendance verdict. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 16 }}>
              <Icon name="info" size={14} sw={2} color={p.fgSubtle} />
              <Text style={[type({ weight: 400, size: 12, leading: 1.4, color: p.fgSubtle }), { flex: 1 }]}>
                {t("org.attendance.note")}
              </Text>
            </View>
          </View>
        )}
      </Body>
    </Screen>
  );
}
