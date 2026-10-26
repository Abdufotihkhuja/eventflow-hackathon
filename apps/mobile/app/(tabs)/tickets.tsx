import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { toCardEvent } from "@entities/event";
import { useMyRegistrationsQuery } from "@entities/registration";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import type { StringKey } from "@shared/i18n/strings";
import { AnimatedPressable, fadeIn, spring } from "@shared/motion";
import { accent, radii, shadow, type, usePalette } from "@shared/theme";
import { Body, Btn, EventPoster, Icon, Screen, Skeleton, StateBlock, Tag, TopBar } from "@shared/ui";

type Tone = "neutral" | "accent" | "forest" | "success" | "danger";

interface Reg {
  id: string;
  status?: string;
  attendances?: { id?: string }[];
  event: {
    id: string;
    slug?: string;
    title: string;
    coverImage?: string | null;
    startDate: string;
    endDate?: string | null;
    venue?: string | null;
    city?: string | null;
    format?: string;
    status?: string;
    organization?: { name?: string; companyName?: string } | null;
  };
}

/** A registration is "upcoming" while it's active and its event hasn't ended. */
function isUpcoming(r: Reg, now: number): boolean {
  if (r.status === "CANCELLED" || r.status === "REJECTED") return false;
  if (r.event.status === "COMPLETED") return false;
  const ends = new Date(r.event.endDate ?? r.event.startDate).getTime();
  return Number.isNaN(ends) ? true : ends >= now;
}

function statusFor(r: Reg): { key: string; tone: Tone } {
  if (r.status === "CANCELLED") return { key: "CANCELLED", tone: "danger" };
  if (r.status === "REJECTED") return { key: "REJECTED", tone: "danger" };
  if ((r.attendances?.length ?? 0) > 0) return { key: "ATTENDED", tone: "forest" };
  if (r.status === "PENDING") return { key: "PENDING", tone: "accent" };
  return { key: "APPROVED", tone: "success" };
}

/** Segmented-control geometry (design: track padding 4, gap 4, segment h38). */
const SEG_PAD = 4;
const SEG_GAP = 4;

/** 11a · My tickets — live registrations, Upcoming/Past split, scannable rows. */
export default function Tickets(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  // A floating (blurred) header overlays the scroller, so the body pads by
  // its measured height instead of stopping at an opaque edge.
  const [headerH, setHeaderH] = useState(128);
  const { t, tn, tx, lang } = useI18n();
  const { status: authStatus } = useAuth();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  const q = useMyRegistrationsQuery({ limit: 100 }, { enabled: authStatus === "authenticated" });
  const all = ((q.data as unknown as { data?: Reg[] } | undefined)?.data ?? []).filter((r) => r?.event);

  const now = Date.now();
  const upcoming: Reg[] = [];
  const past: Reg[] = [];
  for (const r of all) (isUpcoming(r, now) ? upcoming : past).push(r);
  const rows = tab === "upcoming" ? upcoming : past;

  // Animated thumb: one white pill sliding under the segment labels.
  const [trackW, setTrackW] = useState(0);
  const segW = trackW > 0 ? (trackW - SEG_PAD * 2 - SEG_GAP) / 2 : 0;
  const thumbX = useSharedValue(0);
  useEffect(() => {
    thumbX.value = withSpring(tab === "past" ? segW + SEG_GAP : 0, {
      ...spring.press,
      reduceMotion: ReduceMotion.System,
    });
  }, [tab, segW, thumbX]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function renderBody(): React.JSX.Element {
    if (authStatus === "guest") {
      return (
        <StateBlock
          icon="ticket"
          title={t("profile.guest.title")}
          body={t("profile.guest.body")}
          action={<Btn size="md" variant="primary" onPress={() => router.push("/login")}>{t("common.signIn")}</Btn>}
        />
      );
    }
    if (q.isPending) {
      return (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={88} r={radii.card} />)}
        </View>
      );
    }
    if (q.isError) {
      return (
        <StateBlock
          icon="alert"
          tone="error"
          title={t("state.error.title")}
          body={t("state.error.body")}
          action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
        />
      );
    }
    if (rows.length === 0) {
      return tab === "upcoming" ? (
        <StateBlock
          icon="ticket"
          title={t("tickets.empty.title")}
          body={t("tickets.empty.body")}
          action={<Btn size="md" variant="primary" onPress={() => router.push("/discover")}>{t("tickets.explore")}</Btn>}
        />
      ) : (
        <StateBlock icon="cal" title={t("tickets.empty.past")} />
      );
    }
    return (
      <Animated.View entering={fadeIn()} style={{ gap: 12 }}>
        {rows.map((r) => {
          const card = toCardEvent(r.event as never, lang);
          const st = statusFor(r);
          const dateLine = `${card.date} · ${card.time}`;
          return (
            <AnimatedPressable
              key={r.id}
              accessibilityRole="button"
              accessibilityHint={t("common.viewTicket")}
              haptic="tap"
              scaleTo={0.98}
              onPress={() => router.push(`/ticket/${r.id}`)}
              style={[
                { flexDirection: "row", gap: 12, padding: 12, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border },
                shadow.sm,
              ]}
            >
              <View style={{ width: 64, height: 64, borderRadius: radii.control, overflow: "hidden" }}>
                <EventPoster event={card} dense bare />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 14, leading: 1.2, color: p.fg })}>{tx(card.title)}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[type({ role: "mono", weight: 500, size: 11, leading: 1.3, color: p.fgMuted }), { marginTop: 5 }]}>{dateLine}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }}>
                  <Tag tone={st.tone}>{t(`tickets.status.${st.key}` as StringKey)}</Tag>
                </View>
              </View>
              {st.key === "APPROVED" || st.key === "ATTENDED" ? (
                <View style={{ alignItems: "center", justifyContent: "center", gap: 5, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: p.border, borderStyle: "dashed" }}>
                  <Icon name="qr" size={26} color={p.fg} />
                  <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 600, size: 9, leading: 1, color: p.fgSubtle })}>{t("tickets.scan")}</Text>
                </View>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </Animated.View>
    );
  }

  const sub =
    authStatus === "guest" || q.isPending
      ? undefined
      : `${tn("tickets.upcomingCount", upcoming.length)} · ${tn("tickets.pastCount", past.length)}`;

  return (
    <Screen>
      <Body
        tabBarClearance
        contentStyle={{ paddingTop: headerH + 18, flexGrow: 1 }}
        refreshControl={
          authStatus === "authenticated" ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />
          ) : undefined
        }
      >
        {/* Segmented control — animated thumb slides between the two tabs. */}
        <View
          onLayout={(e) => setTrackW(Math.round(e.nativeEvent.layout.width))}
          style={{ flexDirection: "row", gap: SEG_GAP, padding: SEG_PAD, marginBottom: 16, backgroundColor: p.sunken, borderRadius: radii.lg }}
        >
          {segW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                { position: "absolute", top: SEG_PAD, bottom: SEG_PAD, left: SEG_PAD, width: segW, borderRadius: radii.md, backgroundColor: p.surface },
                shadow.xs,
                thumbStyle,
              ]}
            />
          ) : null}
          {(["upcoming", "past"] as const).map((key) => {
            const on = tab === key;
            return (
              <AnimatedPressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                haptic="select"
                scaleTo={0.98}
                onPress={() => setTab(key)}
                style={{ flex: 1, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radii.lg }}
              >
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, color: on ? p.fg : p.fgMuted })}>
                  {t(key === "upcoming" ? "tickets.upcoming" : "tickets.past")}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {renderBody()}
      </Body>
      <TopBar large floating onHeight={setHeaderH} title={t("tickets.title")} sub={sub} />
    </Screen>
  );
}
