import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollToTop } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toCardEvent, useEventsQuery, useInfiniteEventsQuery } from "@entities/event";
import { useAccountUnreadCountQuery } from "@entities/account-notifications";
import { useCategoriesQuery } from "@entities/catalog";
import { resolveFeedOutcome, shouldProbeAllRegions } from "@features/discover-feed/model";
import { DiscoverFilters, filterCount, type DiscoverFilterValue } from "@features/discover-filters";
import { RegionPicker } from "@features/region-picker";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatNumber, hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, enterStagger, fadeIn } from "@shared/motion";
import { useAppBadgeSync } from "@shared/notifications";
import { useRegion } from "@shared/region";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import {
  Avatar,
  Body,
  Btn,
  Chip,
  EventCard,
  FeaturedCard,
  FEATURED_CARD,
  FEATURED_CARD_HEIGHT,
  Icon,
  IconBtn,
  Rail,
  Screen,
  Skeleton,
  StateBlock,
} from "@shared/ui";

function initialsOf(first?: string | null, last?: string | null): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "EF";
}

// Skeleton geometry mirrors the real cards — dimensions come from the card's
// own exported constants (FEATURED_CARD) so the loading state can never drift
// from the real FeaturedCard. EventCard ≈ 16/10 poster + text block.
const FEATURED_SKEL = { w: FEATURED_CARD.width, h: FEATURED_CARD_HEIGHT, r: FEATURED_CARD.radius } as const;
const CARD_SKEL_H = 284;
/** Featured rail snap: card width + rail gap. */
const FEATURED_SNAP = FEATURED_SKEL.w + 12;
/** Start fetching the next page within this distance of the feed end. */
const PAGE_TRIGGER_PX = 600;

/** 06 · Home / Discover — wired to the public events API with live states,
 *  a region filter, search, and a type/format filter sheet. */
export default function Discover(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, tn, lang, tx } = useI18n();
  const { user, status: authStatus } = useAuth();
  const { region, setRegion, ready, requestLocation, needsLocationPrompt } = useRegion();

  // Колокольчик участника (MOBILE_IMPACT §5) — по образцу org-дашборда:
  // счётчик `/me/notifications/unread-count`, refetch при фокусе + мягкий
  // 60-секундный опрос, пока экран на виду. Badge иконки приложения =
  // участнический unread (§6) — то же число через useAppBadgeSync.
  const authed = authStatus === "authenticated";
  const unreadQ = useAccountUnreadCountQuery(authed);
  useAppBadgeSync(unreadQ.data);
  const refetchUnread = unreadQ.refetch;
  useFocusEffect(
    useCallback(() => {
      if (!authed) return;
      void refetchUnread();
      const id = setInterval(() => void refetchUnread(), 60_000);
      return () => clearInterval(id);
    }, [authed, refetchUnread]),
  );

  // First run only: offer to use the device location so the feed opens on the
  // user's own city. A refusal settles on "all regions" — never an empty feed.
  useEffect(() => {
    if (ready && needsLocationPrompt) void requestLocation();
  }, [ready, needsLocationPrompt, requestLocation]);
  const scrollRef = useRef<ScrollView>(null);
  // Re-tapping the active Discover tab scrolls the feed back to the top.
  useScrollToTop(scrollRef);

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilterValue>({});
  const [refreshing, setRefreshing] = useState(false);
  const open = (id: string) => router.push(`/event/${id}`);
  const cityLabel = tx(region.label);
  const fCount = filterCount(filters);

  const categoriesQ = useCategoriesQuery({ locale: lang });
  // Both event queries wait for the persisted region to hydrate (`ready`) so a
  // cold start issues ONE fetch for the right city instead of default→swap.
  const featuredQ = useEventsQuery(
    { locale: lang, featured: true, limit: 6, city: region.city ?? undefined },
    { enabled: ready },
  );
  const upcomingQ = useInfiniteEventsQuery(
    {
      locale: lang,
      filter: "upcoming",
      limit: 10,
      city: region.city ?? undefined,
      ...(activeCat ? { category: activeCat } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.format ? { format: filters.format } : {}),
    },
    { enabled: ready },
  );

  const featured = (featuredQ.data?.items ?? []).map((e) => toCardEvent(e, lang));
  const upcomingItems = upcomingQ.data?.pages.flatMap((page) => page.items) ?? [];
  // "On tonight" is only allowed to say so when something starts today; the feed
  // used to print it over events a month out. Same for the subtitle, which
  // promised "this week" regardless — it now states the real count.
  const startsToday = upcomingItems.some((e) => {
    const d = new Date(e.startDate);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const featuredPending = !ready || featuredQ.isLoading;
  const upcomingPending = !ready || upcomingQ.isLoading;

  // Empty because of the CITY filter, or empty for real? An event with no city
  // in the database is invisible under any city filter, so a city-scoped zero
  // used to read as "nothing is happening" — it isn't. Probe the same feed
  // without the city (only once the scoped one has come back empty, never in
  // parallel) and offer the other regions instead of a silent empty state.
  const refined = Boolean(activeCat) || fCount > 0;
  const cityScoped = Boolean(region.city);
  const probeAllRegions = shouldProbeAllRegions({
    pending: upcomingPending,
    isError: upcomingQ.isError,
    count: upcomingItems.length,
    refined,
    cityScoped,
  });
  const elsewhereQ = useEventsQuery(
    { locale: lang, filter: "upcoming", limit: 10 },
    { enabled: probeAllRegions },
  );
  const elsewhereItems = elsewhereQ.data?.items ?? [];
  const outcome = resolveFeedOutcome({
    pending: upcomingPending,
    isError: upcomingQ.isError,
    count: upcomingItems.length,
    refined,
    cityScoped,
    // `isPending` (not `isLoading`) so the render BETWEEN "we decided to probe"
    // and "the request started" counts as pending too — otherwise the empty
    // state flashes for one frame before the fallback list arrives.
    fallbackPending: probeAllRegions && elsewhereQ.isPending,
    fallbackCount: elsewhereItems.length,
  });

  // Nothing upcoming anywhere and no refinements → the feed must not dead-end on
  // an empty state; fetch what already happened (freshest first) and show it.
  const showPast = outcome === "empty";
  const pastQ = useEventsQuery(
    { locale: lang, filter: "past", limit: 10, city: region.city ?? undefined },
    { enabled: showPast },
  );
  const pastItems = pastQ.data?.items ?? [];


  function clearAll(): void {
    setActiveCat(null);
    setFilters({});
  }

  /** The count line must describe what is actually on screen: while the feed
   *  shows other regions it may not claim "N events coming up" in this city. */
  function subtitle(): string {
    if (outcome === "pending" || outcome === "probing") return cityLabel;
    if (outcome === "fallback") return tn("home.subCountElsewhere", elsewhereItems.length, { city: cityLabel });
    return tn("home.subCount", upcomingItems.length, { city: cityLabel });
  }

  function renderUpcoming(): React.JSX.Element {
    if (outcome === "pending" || outcome === "probing") {
      return (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={CARD_SKEL_H} r={radii.card} />
          ))}
        </View>
      );
    }
    if (outcome === "error") {
      return (
        <StateBlock
          icon="alert"
          tone="error"
          title={t("state.error.title")}
          body={t("state.error.body")}
          action={<Btn size="md" variant="secondary" onPress={() => upcomingQ.refetch()}>{t("common.retry")}</Btn>}
        />
      );
    }
    if (outcome === "refinedEmpty") {
      return (
        <StateBlock
          icon="search"
          title={t("home.empty.title")}
          body={t("home.empty.body")}
          action={<Btn size="md" variant="secondary" onPress={clearAll}>{t("home.clearFilters")}</Btn>}
        />
      );
    }
    if (outcome === "empty") {
      return <StateBlock icon="cal" title={t("home.noUpcoming.title")} body={t("home.noUpcoming.body")} />;
    }
    if (outcome === "fallback") {
      // Nothing in this city — say so plainly, then show what the rest of the
      // country has. The button switches the persisted region to "all regions",
      // which re-keys the real feed (no separate mode to reason about).
      return (
        <Animated.View entering={fadeIn()} style={{ gap: 12 }}>
          <StateBlock
            icon="pin"
            title={t("home.otherRegions.title", { city: cityLabel })}
            body={t("home.otherRegions.body")}
            action={<Btn size="md" variant="secondary" onPress={() => setRegion("all")}>{t("home.otherRegions.action")}</Btn>}
          />
          {elsewhereItems.map((e) => (
            <EventCard key={e.id} event={toCardEvent(e, lang)} onPress={() => open(e.id)} />
          ))}
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={fadeIn()} style={{ gap: 12 }}>
        {upcomingItems.map((e) => (
          <EventCard key={e.id} event={toCardEvent(e, lang)} onPress={() => open(e.id)} />
        ))}
        {upcomingQ.isFetchingNextPage ? <Skeleton h={CARD_SKEL_H} r={radii.card} /> : null}
      </Animated.View>
    );
  }

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await Promise.allSettled([categoriesQ.refetch(), featuredQ.refetch(), upcomingQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - PAGE_TRIGGER_PX;
    if (nearEnd && upcomingQ.hasNextPage && !upcomingQ.isFetchingNextPage) {
      void upcomingQ.fetchNextPage();
    }
  }

  return (
    <Screen>
      {/* Location header */}
      <Animated.View entering={enterStagger(0)} style={{ paddingTop: insets.top + 4, paddingHorizontal: gutter, paddingBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AnimatedPressable
            accessibilityRole="button"
            haptic="tap"
            onPress={() => setPickerOpen(true)}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Icon name="pin" size={17} color={accent.ink} />
            <Text style={type({ weight: 700, size: 15, leading: 1, color: p.fg })}>{cityLabel}</Text>
            <Icon name="cdown" size={15} color={p.fgMuted} />
          </AnimatedPressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Колокольчик со счётчиком (образец — шапка org-дашборда). Гостю не
              показываем: инбокс — атрибут аккаунта. «0» в кружке — это шум. */}
          {authed ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t("notif.title")}
              haptic="tap"
              scaleTo={0.9}
              hitSlop={8}
              onPress={() => router.push("/notifications")}
            >
              <View>
                <Icon name="bell" size={22} sw={1.8} color={p.fg} />
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
          ) : null}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("tab.profile")}
            haptic="tap"
            rippleBorderless
            onPress={() => router.push("/profile")}
          >
            {/* Same seed as the Profile tab — one person must not change colour
                between screens (this was hard-coded to 142 and drifted). */}
            <Avatar
              initials={initialsOf(user?.firstName, user?.lastName)}
              size={40}
              hue={hueFromId(user?.id ?? "me")}
              src={resolveMediaUrl((user as { avatarUrl?: string | null } | null)?.avatarUrl)}
            />
          </AnimatedPressable>
          </View>
        </View>
      </Animated.View>

      <Body
        pad={false}
        tabBarClearance
        scrollRef={scrollRef}
        onScroll={onScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />
        }
      >
        {/* Title + search */}
        <Animated.View entering={enterStagger(1)} style={{ paddingHorizontal: gutter, paddingTop: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 30, leading: 1.02, track: -0.03, color: p.fg })}>
            {startsToday ? t("home.title") : t("home.titleAhead")}
            <Text style={{ color: accent.base }}>.</Text>
          </Text>
          <Text style={[type({ role: "mono", weight: 500, size: 12, leading: 1.3, color: p.fgMuted }), { marginTop: 7 }]}>
            {subtitle()}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <AnimatedPressable
              accessibilityRole="search"
              haptic="tap"
              scaleTo={0.98}
              onPress={() => router.push("/search")}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
            >
              <Icon name="search" size={18} color={p.fgSubtle} />
              <Text style={type({ weight: 400, size: 14, leading: 1, color: p.fgMuted })}>{t("home.searchPlaceholder")}</Text>
            </AnimatedPressable>
            <IconBtn name="map" size={48} onPress={() => router.push("/map")} accessibilityLabel={t("a11y.map")} />
            <View>
              <IconBtn name="sliders" size={48} active={fCount > 0} onPress={() => setFiltersOpen(true)} accessibilityLabel={t("a11y.filters")} />
              {fCount > 0 ? (
                <View style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: accent.base, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: p.canvas }}>
                  <Text style={type({ weight: 700, size: 10, leading: 1, color: "#fff" })}>{fCount}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Categories (live) */}
        <Animated.View entering={enterStagger(2)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: gutter, alignItems: "center" }}
            style={{ marginTop: 16 }}
          >
            <Chip active={activeCat === null} onPress={() => setActiveCat(null)}>
              {t("common.all")}
            </Chip>
            {(categoriesQ.data ?? []).map((c) => (
              <Chip key={c.id} active={activeCat === c.slug} onPress={() => setActiveCat(c.slug)}>
                {c.name}
              </Chip>
            ))}
            {categoriesQ.isError ? (
              // Quiet inline retry — a failed catalog must not silently vanish.
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("common.retry")}
                haptic="tap"
                onPress={() => void categoriesQ.refetch()}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: p.border }}
              >
                <Icon name="refresh" size={14} color={p.fgMuted} />
                <Text style={type({ weight: 600, size: 13, leading: 1, color: p.fgMuted })}>{t("home.categories.error")}</Text>
              </AnimatedPressable>
            ) : null}
          </ScrollView>
        </Animated.View>

        {/* Featured rail (live) */}
        <Animated.View entering={enterStagger(3)}>
          {featuredPending ? (
            <Rail title={t("home.featured")} pad>
              <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: gutter }}>
                {[0, 1].map((i) => (
                  <Skeleton key={i} w={FEATURED_SKEL.w} h={FEATURED_SKEL.h} r={FEATURED_SKEL.r} />
                ))}
              </View>
            </Rail>
          ) : featuredQ.isError ? (
            <Rail title={t("home.featured")} pad>
              {/* Quiet inline retry row — an API failure must not look like "no featured". */}
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("common.retry")}
                haptic="tap"
                scaleTo={0.98}
                onPress={() => void featuredQ.refetch()}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: gutter, paddingHorizontal: 14, paddingVertical: 14, borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface }}
              >
                <Icon name="alert" size={18} color={p.fgMuted} />
                <Text style={[type({ weight: 500, size: 13, leading: 1.3, color: p.fgMuted }), { flex: 1 }]}>{t("home.featured.error")}</Text>
                <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{t("common.retry")}</Text>
              </AnimatedPressable>
            </Rail>
          ) : featured.length > 0 ? (
            <Animated.View entering={fadeIn()}>
              <Rail title={t("home.featured")} pad>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={FEATURED_SNAP}
                  decelerationRate="fast"
                  contentContainerStyle={{ gap: 12, paddingHorizontal: gutter }}
                >
                  {featured.map((e) => (
                    <FeaturedCard key={e.id} event={e} onPress={() => open(e.id)} />
                  ))}
                </ScrollView>
              </Rail>
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Upcoming (live + states + pagination) */}
        <Animated.View entering={enterStagger(4)} style={{ paddingHorizontal: gutter, marginTop: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={type({ role: "display", weight: 700, size: 19, leading: 1.2, track: -0.025, color: p.fg })}>{t("home.upcoming")}</Text>
          </View>

          {renderUpcoming()}
        </Animated.View>

        {/* Past events — only when nothing is upcoming (see `showPast`). */}
        {showPast ? (
          pastQ.isLoading ? (
            <View style={{ paddingHorizontal: gutter, marginTop: 22, gap: 12 }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} h={CARD_SKEL_H} r={radii.card} />
              ))}
            </View>
          ) : pastItems.length > 0 ? (
            <Animated.View entering={fadeIn()} style={{ paddingHorizontal: gutter, marginTop: 22 }}>
              <Text style={[type({ role: "display", weight: 700, size: 19, leading: 1.2, track: -0.025, color: p.fg }), { marginBottom: 12 }]}>
                {t("home.past")}
              </Text>
              <View style={{ gap: 12 }}>
                {pastItems.map((e) => (
                  <EventCard key={e.id} event={toCardEvent(e, lang)} onPress={() => open(e.id)} />
                ))}
              </View>
            </Animated.View>
          ) : null
        ) : null}
      </Body>

      <RegionPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <DiscoverFilters visible={filtersOpen} value={filters} onClose={() => setFiltersOpen(false)} onApply={setFilters} />
    </Screen>
  );
}
