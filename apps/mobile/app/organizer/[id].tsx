import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, RefreshControl, Share, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { toCardEvent, type ApiEventListItem } from "@entities/event";
import {
  toOrgVM,
  useFollowOrgMutation,
  useOrgEventsQuery,
  useOrgProfileQuery,
  type OrgEventStatus,
} from "@entities/organization";
import { useAuth } from "@shared/auth";
import { env } from "@shared/config/env";
import { goBack } from "@shared/lib/go-back";
import { formatMonthYear, formatNumber } from "@shared/lib/format";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable, enterStagger, fadeIn, spring } from "@shared/motion";
import { accent, gutter, radii, shadow, type, usePalette } from "@shared/theme";
import {
  Avatar, Body, Btn, EventCard, Icon, IconBtn, orgTone, Screen, Skeleton, StateBlock, Tag,
} from "@shared/ui";

/** Dark hero band height (organizer cover). */
const COVER_H = 160;

const TAB_KEYS: OrgEventStatus[] = ["upcoming", "past"];

/** 11 · Organizer public profile — hue-tinted hero, stats, optimistic follow,
 *  and the org's events (upcoming / past). */
export default function OrganizerScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<OrgEventStatus>("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  // Status-bar content is light over the dark cover, dark once scrolled past.
  const [pastCover, setPastCover] = useState(false);

  const { data, isPending, isError, refetch } = useOrgProfileQuery(id);
  const follow = useFollowOrgMutation(id);
  const eventsQ = useOrgEventsQuery(id, tab);

  // Sliding ember underline between the two event tabs.
  const tabMarks = useRef<Partial<Record<OrgEventStatus, { x: number; w: number }>>>({});
  const underlineX = useSharedValue(0);
  const underlineW = useSharedValue(0);
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineW.value,
  }));
  useEffect(() => {
    const m = tabMarks.current[tab];
    if (!m) return;
    if (underlineW.value === 0) {
      // First measurement: place without animating.
      underlineX.value = m.x;
      underlineW.value = m.w;
      return;
    }
    underlineX.value = withSpring(m.x, spring.press);
    underlineW.value = withSpring(m.w, spring.press);
  }, [tab, underlineX, underlineW]);

  function onBodyScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const past = e.nativeEvent.contentOffset.y > COVER_H - insets.top - 10;
    setPastCover((cur) => (cur === past ? cur : past));
  }

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), eventsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  if (isPending) {
    return (
      <Screen>
        <Body pad={false}>
          <Skeleton w="100%" h={COVER_H} r={0} />
          <View style={{ paddingHorizontal: gutter, marginTop: -38, gap: 12 }}>
            <Skeleton w={84} h={84} r={radii.xl} />
            <Skeleton w="55%" h={24} />
            <Skeleton w="100%" h={64} r={radii.card} />
            <Skeleton w="100%" h={48} r={radii.control} />
            {[0, 1].map((i) => <Skeleton key={i} w="100%" h={130} r={radii.card} />)}
          </View>
        </Body>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
          <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
        </View>
        <StateBlock
          icon="alert"
          tone="error"
          title={t("org.notFound.title")}
          body={t("org.notFound.body")}
          action={<Btn size="md" variant="secondary" onPress={() => router.replace("/discover")}>{t("detail.backToDiscover")}</Btn>}
        />
      </Screen>
    );
  }

  const vm = toOrgVM(data);
  const tone = orgTone(vm.hue);
  const events = (eventsQ.data as unknown as { data?: ApiEventListItem[] } | undefined)?.data ?? [];
  // The registered legal entity, when it is not simply the brand name again —
  // for a UZ audience deciding whether to hand over money, that is the line
  // that settles it. It rides on the DTO already and was never rendered.
  const legalName = (data as { companyName?: string } | undefined)?.companyName?.trim();
  const showLegal = !!legalName && legalName !== vm.name;
  const verifiedAt = (data as { verifiedAt?: string } | undefined)?.verifiedAt;

  function onFollow() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // Optimistic morph — the cache patch flips the button instantly; no spinner.
    follow.mutate(!vm.isFollowing);
  }
  function onShare() {
    void Share.share({ message: `${vm.name} — ${env.webUrl}/organizers/${vm.id}` });
  }

  return (
    <Screen>
      {/* Status-bar contrast follows whatever is actually behind it: the cover
          band's tone while it is on screen, the app canvas once it is not.
          The old version hardcoded "dark" past the cover, which painted dark
          glyphs on the dark canvas in the app's dark theme. */}
      <StatusBar style={pastCover ? (p.isDark ? "light" : "dark") : tone.onDark ? "light" : "dark"} animated />
      <Body
        pad={false}
        contentStyle={{ paddingBottom: insets.bottom + 24 }}
        onScroll={onBodyScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />
        }
      >
        {/* Cover. The organization DTO carries no cover image, so the band is
            the org's OWN brand tone — the same one `OrgBadge` paints its mark
            with, so the page reads as one identity rather than a badge in one
            colour under a header in another.

            It used to be `hsl(hue, 60%, 46%)`: a hue walked off the id hash,
            which put indigo and violet headers on a bone-and-ink product. That
            was the last raw HSL left in the app after the de-slop pass. */}
        <View style={{ height: COVER_H, position: "relative", backgroundColor: tone.bg }}>
          {/* A single soft vignette, dark or light to match the tone — enough
              to seat the controls without turning the band into a gradient. */}
          <LinearGradient
            colors={
              tone.onDark
                ? ["rgba(14,14,13,0.28)", "rgba(14,14,13,0)", "rgba(14,14,13,0.14)"]
                : ["rgba(14,14,13,0.10)", "rgba(14,14,13,0)", "rgba(14,14,13,0.06)"]
            }
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", inset: 0 }}
          />
          <View style={{ position: "absolute", top: insets.top + 4, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
            <IconBtn name="cleft" glass dark={tone.onDark} size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
            <IconBtn name="share" glass dark={tone.onDark} size={40} onPress={onShare} accessibilityLabel={t("a11y.share")} />
          </View>
        </View>

        <View style={{ paddingHorizontal: gutter }}>
          {/* Logo + verified */}
          <Animated.View entering={enterStagger(0)} style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: -38 }}>
            <View style={[{ width: 84, height: 84, borderRadius: radii.xl + 2, backgroundColor: p.canvas, padding: 4 }, shadow.md]}>
              {vm.logoUrl ? (
                <Image source={{ uri: vm.logoUrl }} style={{ width: 76, height: 76, borderRadius: radii.card + 2 }} resizeMode="cover" />
              ) : (
                <Avatar initials={vm.initials} size={76} hue={vm.hue} />
              )}
            </View>
            {/* The chip only when the dated line below cannot be drawn: a chip
                that asserts "Verified" plus a line that says since when is the
                same claim twice, and the chip's Russian wording is masculine
                against a feminine noun ("организация … подтверждён"). */}
            {vm.verified && !verifiedAt ? <View style={{ marginBottom: 6 }}><Tag tone="forest">{t("org.verified")}</Tag></View> : null}
          </Animated.View>

          {/* Name + meta */}
          <Animated.View entering={enterStagger(1)}>
            <Text style={[type({ role: "display", weight: 700, size: 24, leading: 1.1, track: -0.03, color: p.fg }), { marginTop: 14 }]} numberOfLines={2}>{vm.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <Text style={type({ role: "mono", weight: 500, size: 12, leading: 1, color: p.fgMuted })}>{vm.handle}</Text>
              {vm.address ? (
                <>
                  <Text style={type({ weight: 500, size: 12, leading: 1, color: p.fgSubtle })}>·</Text>
                  <Icon name="pin" size={12} color={p.fgMuted} />
                  <Text style={type({ weight: 500, size: 12, leading: 1, color: p.fgMuted })} numberOfLines={1}>{vm.address}</Text>
                </>
              ) : null}
            </View>

            {/* Trust, in two facts the DTO already carried and the page never
                printed: how long the badge has been earned, and who the
                organizer legally is. A "Verified" chip on its own asserts;
                these two let the reader check. */}
            {vm.verified && verifiedAt ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                <Icon name="verified" size={13} color={p.forest} />
                <Text style={type({ weight: 500, size: 12, leading: 1.3, color: p.forest })} numberOfLines={1}>
                  {t("org.public.verifiedSince", { date: formatMonthYear(verifiedAt, lang) })}
                </Text>
              </View>
            ) : null}
            {showLegal ? (
              <Text style={[type({ weight: 400, size: 12, leading: 1.3, color: p.fgSubtle }), { marginTop: 6 }]} numberOfLines={2}>
                {t("org.public.legalName")} · {legalName}
              </Text>
            ) : null}

            {/* Description */}
            {vm.description ? (
              <Text style={[type({ weight: 400, size: 14, leading: 1.55, color: p.fgDefault }), { marginTop: 12 }]}>{vm.description}</Text>
            ) : null}

            {/* Website */}
            {vm.website ? (
              <AnimatedPressable
                accessibilityRole="link"
                haptic="tap"
                onPress={() => vm.website && Linking.openURL(vm.website)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start" }}
              >
                <Icon name="globe" size={14} color={accent.ink} />
                <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{vm.websiteLabel}</Text>
              </AnimatedPressable>
            ) : null}
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={enterStagger(2)} style={{ flexDirection: "row", marginTop: 16, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, backgroundColor: p.surface, overflow: "hidden" }}>
            {[
              { n: vm.eventsCount, label: t("org.eventsCount.label") },
              { n: vm.followersCount, label: t("org.followers.label") },
            ].map((s, i) => (
              <View key={s.label} style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderLeftWidth: i ? 1 : 0, borderLeftColor: p.border }}>
                <Text style={[type({ role: "display", weight: 700, size: 18, leading: 1.2, color: p.fg }), { fontVariant: ["tabular-nums"] }]}>{formatNumber(s.n, lang)}</Text>
                <Text style={[type({ weight: 500, size: 11, leading: 1, track: 0.02, color: p.fgMuted, transform: "uppercase" }), { marginTop: 4 }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Follow — optimistic morph (cache patch flips it instantly). */}
          <Animated.View entering={enterStagger(3)} style={{ marginTop: 14 }}>
            <Btn full variant={vm.isFollowing ? "soft" : "primary"} icon={vm.isFollowing ? "check" : "plus"} onPress={onFollow}>
              {vm.isFollowing ? t("common.following") : t("common.follow")}
            </Btn>
          </Animated.View>

          {/* Events */}
          <Animated.View entering={enterStagger(4)}>
            <Text style={[type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg }), { marginTop: 24, marginBottom: 12 }]}>{t("org.events.title")}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: p.border, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 22 }}>
                {TAB_KEYS.map((s) => {
                  const on = tab === s;
                  return (
                    <AnimatedPressable
                      key={s}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      haptic="select"
                      hitSlop={{ top: 6, bottom: 6 }}
                      onLayout={(e) => {
                        tabMarks.current[s] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
                        if (s === tab && underlineW.value === 0) {
                          underlineX.value = e.nativeEvent.layout.x;
                          underlineW.value = e.nativeEvent.layout.width;
                        }
                      }}
                      onPress={() => setTab(s)}
                      style={{ paddingVertical: 10 }}
                    >
                      <Text style={type({ weight: 600, size: 14, leading: 1, color: on ? p.fg : p.fgSubtle })}>{t(s === "upcoming" ? "org.tab.upcoming" : "org.tab.past")}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
              {/* Sliding 2px ember underline (overlaps the hairline). */}
              <Animated.View style={[{ position: "absolute", bottom: -1, left: 0, height: 2, backgroundColor: accent.base }, underlineStyle]} />
            </View>

            {eventsQ.isPending ? (
              <View style={{ gap: 12 }}>{[0, 1].map((i) => <Skeleton key={i} h={290} r={radii.card} />)}</View>
            ) : eventsQ.isError ? (
              <StateBlock icon="alert" tone="error" title={t("state.error.title")} body={t("state.error.body")} action={<Btn size="md" variant="secondary" onPress={() => eventsQ.refetch()}>{t("common.retry")}</Btn>} />
            ) : events.length === 0 ? (
              <StateBlock icon="cal" title={t(tab === "upcoming" ? "org.empty.upcoming" : "org.empty.past")} body={t("org.empty.body")} />
            ) : (
              // keyed by tab → cross-fade on switch; placeholderData keeps the
              // previous list rendered (dimmed) instead of re-skeletoning.
              <Animated.View key={tab} entering={fadeIn()} style={{ gap: 12, opacity: eventsQ.isPlaceholderData ? 0.55 : 1 }}>
                {events.map((e) => (
                  <EventCard key={e.id} event={toCardEvent(e, lang)} onPress={() => router.push(`/event/${e.id}`)} />
                ))}
              </Animated.View>
            )}
          </Animated.View>

          <View style={{ height: 24 }} />
        </View>
      </Body>
    </Screen>
  );
}
