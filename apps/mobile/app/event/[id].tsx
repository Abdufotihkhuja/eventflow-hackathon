import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Linking, type LayoutChangeEvent, Platform, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import {
  toDetailEvent,
  useCanRegisterQuery,
  useEventQuery,
  useIsSavedQuery,
  useToggleSaveMutation,
} from "@entities/event";
import { useRegisterMutation, useTicketQrQuery } from "@entities/registration";
import { EventComments } from "@features/event-comments";
import { RegisterMoment, type RegisterMomentResult } from "@features/register-success";
import { ApiError } from "@shared/api";
import { useAuth } from "@shared/auth";
import { env } from "@shared/config/env";
import { useI18n } from "@shared/i18n";
import { formatDateRange, formatTime, formatTimeRange, resolveMediaUrl } from "@shared/lib/format";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, dur, ease, spring, useReducedMotion, useScreenFocused } from "@shared/motion";
import { accent, dark as darkTheme, fade, gutter, radii, shadow, type, usePalette } from "@shared/theme";
import {
  ActionBar, Avatar, Banner, BlockText, Body, Btn, EventPoster, Icon, IconBtn,
  MetaRow, Meter, posterMood, Screen, Skeleton, StateBlock, Tag,
} from "@shared/ui";

type TabKey = "about" | "speakers" | "programme" | "venue" | "materials" | "comments";

/** Section order = scroll-spy order = tab order. Module-scope so the reanimated
 *  worklet captures it without rebuilding it each render. */
const SECTION_ORDER: readonly TabKey[] = ["about", "speakers", "programme", "venue", "materials", "comments"];

// CONTRACT-GAP: the detail DTO types several nested fields loosely; we read
// through one permissive runtime shape (the agreed contract from the spec).
interface Detail {
  id: string;
  slug?: string;
  title: string;
  shortDescription?: string | null;
  description?: unknown;
  type?: string;
  accessType?: string;
  price?: string | number | null;
  currency?: string | null;
  coverImage?: string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  onlineUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  registrationDeadline?: string | null;
  format?: string;
  status?: string;
  maxParticipants?: number | null;
  registrationsCount?: number | null;
  organization?: { id?: string; name?: string; companyName?: string; description?: string | null; logoUrl?: string | null };
  speakers?: { id?: string; name?: string; firstName?: string; lastName?: string; role?: string; company?: string; avatarUrl?: string | null }[];
  agendaItems?: {
    id?: string; title?: string; startTime?: string; endTime?: string; location?: string; description?: string;
    materials?: { id?: string; label?: string; fileUrl?: string }[];
  }[];
  categories?: { slug?: string; name?: string }[];
  myRegistration?: { id?: string; status?: string; ticketNumber?: string | null } | null;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "EF";
}

/**
 * Keyboard height as a shared value, web-safe: reanimated's
 * `useAnimatedKeyboard` has no web implementation (it only warns), so on web
 * we return a static 0 — the browser manages its own visual viewport.
 * `Platform.OS` is constant for the app's lifetime, so the picked hook never
 * changes between renders.
 */
const useKeyboardHeight: () => SharedValue<number> =
  Platform.OS === "web"
    ? function useKeyboardHeightWeb() {
        return useSharedValue(0);
      }
    : function useKeyboardHeightNative() {
        return useAnimatedKeyboard().height;
      };

/**
 * Is agenda item `i` live right now? Honest signal only: needs a started slot
 * with a real end — its own `endTime`, else the next slot's start. A final
 * slot with no end never claims "Now".
 */
function isLiveSlot(agenda: NonNullable<Detail["agendaItems"]>, i: number, now: number): boolean {
  const a = agenda[i];
  if (!a?.startTime) return false;
  const start = new Date(a.startTime).getTime();
  if (Number.isNaN(start) || now < start) return false;
  const nextStart = agenda[i + 1]?.startTime;
  const endIso = a.endTime ?? nextStart;
  if (!endIso) return false;
  const end = new Date(endIso).getTime();
  return !Number.isNaN(end) && now < end;
}

/** Springy heart/bookmark pop when a toggle turns on (heart/save recipe).
 *  `active === undefined` means "not known yet" — the first KNOWN value is
 *  async hydration (saved-state query resolving), not a user action, so it
 *  syncs silently instead of popping. */
function PopOnChange({ active, children }: { active?: boolean; children: React.ReactNode }): React.JSX.Element {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const prev = useRef(active);
  useEffect(() => {
    if (active === undefined || prev.current === active) return;
    const hydrating = prev.current === undefined;
    prev.current = active;
    if (active && !hydrating && !reduced) {
      scale.value = withSequence(withSpring(1.25, spring.pop), withSpring(1, spring.pop));
    }
  }, [active, reduced, scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** Live "Now" dot — ember core + pulsing halo; pauses off-focus / reduced motion. */
function LivePulse(): React.JSX.Element {
  const focused = useScreenFocused();
  const reduced = useReducedMotion();
  const prog = useSharedValue(0);
  useEffect(() => {
    if (focused && !reduced) {
      prog.value = 0;
      prog.value = withRepeat(withTiming(1, { duration: dur.pulse, easing: ease.decel }), -1, false);
    } else {
      cancelAnimation(prog);
      prog.value = 0;
    }
    return () => cancelAnimation(prog);
  }, [focused, reduced, prog]);
  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + prog.value * 0.9 }],
    opacity: 0.4 * (1 - prog.value),
  }));
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 12, height: 12, borderRadius: radii.pill, backgroundColor: accent.base }, halo]} />
      <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: accent.base }} />
    </View>
  );
}

/**
 * Scroll-spy tab strip. Each instance (in-flow + sticky header) auto-scrolls
 * its own scroller so the active tab is always visible on narrow screens.
 */
function TabStrip({
  tabs, active, onPress,
}: {
  tabs: { key: TabKey; label: string }[];
  active: TabKey;
  onPress: (k: TabKey) => void;
}): React.JSX.Element {
  const p = usePalette();
  const ref = useRef<ScrollView>(null);
  const marks = useRef<Record<string, { x: number; w: number }>>({});
  useEffect(() => {
    const m = marks.current[active];
    // Land the active tab comfortably inside the viewport (not flush-left).
    if (m) ref.current?.scrollTo({ x: Math.max(0, m.x - 90), animated: true });
  }, [active]);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 22, paddingHorizontal: gutter }}
      keyboardShouldPersistTaps="always"
    >
      {tabs.map((tb) => {
        const on = active === tb.key;
        return (
          <AnimatedPressable
            key={tb.key}
            haptic="select"
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onPress(tb.key)}
            onLayout={(e) => { marks.current[tb.key] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }; }}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{ paddingVertical: 13, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: on ? accent.base : "transparent" }}
          >
            <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1, color: on ? p.fg : p.fgSubtle })}>{tb.label}</Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

/** 08 · Event detail — wired to the public API. One long page: an immersive
 *  parallax hero, then every section stacked, with a sticky sub-nav that
 *  scroll-spies the active section (and scrolls to it on tap). */
export default function EventDetail(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, tn, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const { data, isPending, isError, refetch } = useEventQuery(id);
  const { data: gate } = useCanRegisterQuery(id);
  const register = useRegisterMutation();

  const evMaybe = data as unknown as Detail | undefined;
  const reg = evMaybe?.myRegistration ?? undefined;
  const regStatus = reg?.status;
  // A live registration (not cancelled/rejected) → the participant holds a ticket.
  const isActiveReg = Boolean(reg?.id) && regStatus !== "CANCELLED" && regStatus !== "REJECTED";
  const isApprovedReg = isActiveReg && (regStatus === "APPROVED" || regStatus === "ATTENDED");
  const isPendingReg = isActiveReg && regStatus === "PENDING";
  const [regError, setRegError] = useState<string | null>(null);
  const [regNotice, setRegNotice] = useState<string | null>(null);
  // Register moment: blocking "processing" during the mutation, then the
  // staged success confirmation (design board 10 / states RegSuccess).
  const [moment, setMoment] = useState<"processing" | RegisterMomentResult | null>(null);

  // The QR is only minted for an approved registration (never for pending).
  const qrQ = useTicketQrQuery(isApprovedReg ? reg?.id : undefined);

  // Save / "like" — guests are sent to sign-in; the heart flips optimistically.
  const savedQ = useIsSavedQuery(id, { enabled: isAuthenticated });
  const isSaved = Boolean((savedQ.data as { isSaved?: boolean } | undefined)?.isSaved);
  // Undefined while the saved-state is still loading so PopOnChange treats the
  // async arrival as hydration (no spurious heart pop on already-saved events).
  const savedPop = isAuthenticated && savedQ.data === undefined ? undefined : isSaved;
  const toggleSave = useToggleSaveMutation(id ?? "");

  // ── Collapsing sticky header (Reanimated, native-driven) ─────────────────
  const { width } = useWindowDimensions();
  // Hero was 4:5 — 57% of an iPhone screen spent on art, with the date, city
  // and price all pushed below the fold. 4:3 keeps the poster a real hero while
  // the facts a visitor came for land on the first screen.
  const heroH = width * 0.78;
  const reveal = Math.max(80, heroH - insets.top - 120);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const lastSpyY = useSharedValue(-1);
  const [headerOn, setHeaderOn] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > reveal,
    (cur, prev) => {
      if (cur !== prev) runOnJS(setHeaderOn)(cur);
    },
  );

  // ── Scroll-spy: which section the sticky sub-nav highlights ───────────────
  // Section offsets live in plain refs (contentTop = the content block's offset
  // in the scroll view; secY = each section's offset within it). The active
  // section is computed on the JS thread from the scroll position — throttled by
  // an 8px delta so we never hop threads every frame. While a tap-scroll is in
  // flight the spy is suppressed by TARGET OFFSET (not a timer): it re-engages
  // only when the scroll actually lands near the target, when the momentum
  // settles, or when the user grabs the list mid-flight.
  const contentTopRef = useRef(0);
  const secYRef = useRef<Record<string, number>>({});
  const activeRef = useRef<TabKey>("about");
  const pendingTarget = useRef<number | null>(null);
  const [active, setActive] = useState<TabKey>("about");
  const spyLine = insets.top + 112; // a section "activates" when its top reaches here
  const scrollPad = insets.top + 96; // tap-to-scroll lands the heading just below the sticky tabs

  const recomputeActive = useCallback((y: number) => {
    const target = pendingTarget.current;
    if (target != null) {
      if (Math.abs(y - target) > 8) return; // programmatic scroll still in flight
      pendingTarget.current = null;
    }
    const line = y + spyLine;
    let cur: TabKey = SECTION_ORDER[0];
    for (const k of SECTION_ORDER) {
      const sy = secYRef.current[k];
      if (sy !== undefined && contentTopRef.current + sy <= line) cur = k;
    }
    if (cur !== activeRef.current) {
      activeRef.current = cur;
      setActive(cur);
    }
  }, [spyLine]);

  const releaseSpy = useCallback((y: number) => {
    pendingTarget.current = null;
    recomputeActive(y);
  }, [recomputeActive]);
  const interruptSpy = useCallback(() => {
    pendingTarget.current = null;
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      scrollY.value = y;
      if (Math.abs(y - lastSpyY.value) >= 8) {
        lastSpyY.value = y;
        runOnJS(recomputeActive)(y);
      }
    },
    // The user grabbing the list cancels any in-flight tap-scroll suppression.
    onBeginDrag: () => {
      runOnJS(interruptSpy)();
    },
    // A tap-scroll that can't reach its target (section near the end of the
    // page) still releases the spy the moment scrolling settles.
    onMomentumEnd: (e) => {
      runOnJS(releaseSpy)(e.contentOffset.y);
    },
  });

  const onSecLayout = (k: TabKey) => (e: LayoutChangeEvent) => {
    secYRef.current[k] = e.nativeEvent.layout.y;
  };

  function goTo(key: TabKey): void {
    const sy = secYRef.current[key];
    if (sy === undefined) return;
    const target = Math.max(0, contentTopRef.current + sy - scrollPad);
    pendingTarget.current = target;
    activeRef.current = key;
    setActive(key);
    // `scrollTo` is a reanimated worklet — driving the animated-ref scroll from
    // the UI thread is the reliable path on an Animated.ScrollView.
    runOnUI((y: number) => {
      scrollTo(scrollRef, 0, y, true);
    })(target);
  }

  // ── Keyboard avoidance for the comments composer ─────────────────────────
  // The composer lives inside the long scroll; an animated spacer at the end
  // of the content grows with the keyboard so the composer (and the thread)
  // can always scroll clear of it. Web-safe (static 0 on web).
  const kbHeight = useKeyboardHeight();
  const kbSpacer = useAnimatedStyle(() => ({ height: kbHeight.value }));

  // Programme "Now": re-evaluated each minute while the screen is focused so
  // the live slot appears/expires without a remount.
  const focused = useScreenFocused();
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!focused) return;
    setNowTs(Date.now());
    const iv = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, [focused]);

  // Parallax + pull-to-zoom hero.
  const heroAnim = useAnimatedStyle(() => {
    const y = scrollY.value;
    return { transform: [{ translateY: y > 0 ? y * 0.5 : 0 }, { scale: y < 0 ? 1 - y / heroH : 1 }] };
  });
  // Hero title fades as it slides under the bar.
  const heroTitleAnim = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, reveal * 0.7], [1, 0], Extrapolation.CLAMP),
  }));
  // Compact bar fades + slides in.
  const headerAnim = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [reveal, reveal + 50], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [reveal, reveal + 50], [-10, 0], Extrapolation.CLAMP) }],
  }));
  // Subheader (tabs) grows in height a beat later → the header's height changes with scroll.
  const subheaderAnim = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [reveal + 30, reveal + 90], [0, 46], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [reveal + 40, reveal + 90], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Loading ────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Screen>
        <Body pad={false}>
          <Skeleton w="100%" h={340} r={0} />
          <View style={{ paddingHorizontal: gutter, paddingTop: 18, gap: 12 }}>
            <Skeleton w="85%" h={26} />
            <Skeleton w="60%" h={26} />
            <View style={{ height: 8 }} />
            {[0, 1, 2].map((i) => <Skeleton key={i} w="100%" h={48} r={radii.control} />)}
          </View>
        </Body>
      </Screen>
    );
  }

  // ── Error / not found (404 / 410) ──────────────────────────────────────
  if (isError || !data) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
          <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
        </View>
        <StateBlock
          icon="alert"
          tone="error"
          title={t("detail.notFound")}
          body={t("detail.notFoundBody")}
          action={<Btn size="md" variant="secondary" onPress={() => router.replace("/discover")}>{t("detail.backToDiscover")}</Btn>}
        />
      </Screen>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const ev = data as unknown as Detail;
  const poster = toDetailEvent(data, lang);
  // Chrome over the hero follows the poster: a photo always gets a dark scrim,
  // a date plate may well be one of the light moods.
  const heroMood = posterMood(poster.id);
  const heroOnDark = Boolean(poster.coverImage) || heroMood.onDark;
  const isPaid = ev.type === "PAID";
  const isPast = new Date(ev.endDate ?? ev.startDate).getTime() < Date.now() || ev.status === "COMPLETED";
  const soldOut = gate?.reasonCode === "CAPACITY_FULL";
  const blocked = isPast || gate?.canRegister === false;
  const capacity = ev.maxParticipants ?? 0;
  const going = ev.registrationsCount ?? 0;
  const pct = capacity > 0 ? Math.min(100, Math.round((going / capacity) * 100)) : 0;
  const speakers = ev.speakers ?? [];
  const agenda = ev.agendaItems ?? [];
  const materials = agenda.flatMap((a) => (a.materials ?? []).map((m) => ({ ...m, agendaItemId: a.id })));
  const cats = ev.categories ?? [];

  const venueLine = [ev.venue, ev.city].filter(Boolean).join(" · ");
  const isOnline = ev.format === "ONLINE";

  async function openMaps() {
    const hasGeo = ev.latitude != null && ev.longitude != null;
    const query = hasGeo
      ? `${ev.latitude},${ev.longitude}`
      : [ev.venue, ev.address, ev.city].filter(Boolean).join(", ");
    if (!query) return;
    const encoded = encodeURIComponent(query);
    // Universal Google Maps URL — opens the Maps app if installed, else a
    // browser; the most reliably-openable target across iOS/Android.
    const google = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    const yandex = hasGeo
      ? `https://yandex.com/maps/?pt=${ev.longitude},${ev.latitude}&z=16&l=map`
      : `https://yandex.com/maps/?text=${encoded}`;
    for (const url of [google, yandex]) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        /* try the next target */
      }
    }
    void Linking.openURL(google).catch(() => undefined);
  }
  function onShare() {
    void Share.share({ message: `${ev.title}${ev.slug ? ` — ${env.webUrl}/events/${ev.slug}` : ""}` });
  }
  function onToggleSave() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    toggleSave.mutate(isSaved);
  }
  function onRegister() {
    // Guests can't register — send them to sign in first.
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setRegError(null);
    setRegNotice(null);
    // Blocking processing state — the user must not navigate mid-mutation.
    setMoment("processing");
    register.mutate(
      { eventId: ev.id, body: {} as never },
      {
        onSuccess: (res) => {
          const r = res as unknown as { id?: string; status?: string; ticketNumber?: string | null };
          // Reconcile the detail (CTA matrix, hero badge, mini-ticket) under the moment.
          void refetch();
          if (r.id) setMoment({ regId: r.id, status: r.status, ticketNumber: r.ticketNumber });
          else setMoment(null);
        },
        onError: (e) => {
          setMoment(null);
          // 409 = already registered → tell them clearly and reconcile so the CTA
          // flips to "View ticket" (the detail wasn't refetched after login).
          if (e instanceof ApiError && e.status === 409) {
            haptics.success();
            setRegNotice(t("detail.alreadyRegistered"));
            void refetch();
            return;
          }
          // Everything else (offline, 5xx, 4xx) must be surfaced — never silent.
          haptics.error();
          setRegError(
            e instanceof ApiError
              ? e.message || t("detail.register.failed")
              : t("detail.register.offline"),
          );
        },
      },
    );
  }

  // A section with nothing in it is not navigation — it is a promise of content
  // that isn't there. Tapping "Speakers" used to scroll you to a shrug icon, and
  // four such blocks stacked into roughly four screens of nothing. Empty
  // sections are dropped here, and the sub-nav is built from what remains.
  // Venue is never dropped: for an online event it is real, useful content.
  const hasSpeakers = speakers.length > 0;
  const hasProgramme = agenda.length > 0;
  const hasMaterials = materials.length > 0;
  const TABS: { key: TabKey; label: string }[] = [
    { key: "about", label: t("detail.tab.about") },
    ...(hasSpeakers ? [{ key: "speakers" as const, label: t("detail.tab.speakers") }] : []),
    ...(hasProgramme ? [{ key: "programme" as const, label: t("detail.tab.programme") }] : []),
    { key: "venue", label: t("detail.tab.venue") },
    ...(hasMaterials ? [{ key: "materials" as const, label: t("detail.tab.materials") }] : []),
    { key: "comments", label: t("detail.tab.comments") },
  ];

  function SectionTitle({ children }: { children: string }): React.JSX.Element {
    return (
      <Text style={[type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg }), { marginBottom: 14 }]}>
        {children}
      </Text>
    );
  }

  // ── CTA ────────────────────────────────────────────────────────────────
  function renderCta(): React.JSX.Element {
    if (isActiveReg) {
      return (
        <Btn full variant="primary" iconRight="aright" onPress={() => reg?.id && router.push(`/ticket/${reg.id}`)}>
          {t("common.viewTicket")}
        </Btn>
      );
    }
    if (isPaid) {
      return (
        <Btn full variant="secondary" iconRight="aright" onPress={() => Linking.openURL(`${env.webUrl}/events/${ev.slug ?? ev.id}/register`)}>
          {t("detail.ticketsOnWeb")}
        </Btn>
      );
    }
    if (blocked) {
      const label = isPast
        ? t("detail.eventEnded")
        : soldOut
          ? t("detail.soldOut")
          : gate?.reasonCode === "DEADLINE_PASSED" || gate?.reasonCode === "MANUALLY_CLOSED"
            ? t("detail.registrationClosed")
            : t("detail.registrationUnavailable");
      // Sold out demotes the CTA to the ink variant (primary path closed —
      // ember is reserved for a purchasable action).
      return <Btn full variant={soldOut ? "ink" : "secondary"} disabled>{label}</Btn>;
    }
    return (
      <Btn full variant="primary" haptic="press" loading={register.isPending} onPress={onRegister}>
        {`${t("common.register")} · ${t("common.free")}`}
      </Btn>
    );
  }

  return (
    <Screen>
      {/* Light status-bar content over the dark hero; flips back to dark the
          moment the collapsing light bar takes over. Rendered after Screen's
          own StatusBar so this one wins. */}
      <StatusBar style={headerOn || !heroOnDark ? "dark" : "light"} animated />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* Hero (parallax) */}
        <Animated.View style={[{ height: heroH, position: "relative" }, heroAnim]}>
          <EventPoster event={poster} bare insetTop={insets.top} />
          {/* The scrim exists to make white type readable over a photo. Over a
              date plate there is no photo to darken — it just muddied the
              mood's own colour, so the hero takes the mood instead. */}
          {poster.coverImage ? (
            <LinearGradient
              colors={["rgba(14,14,13,0.4)", "rgba(14,14,13,0)", "rgba(14,14,13,0)", isApprovedReg ? "rgba(14,14,13,0.72)" : "rgba(14,14,13,0.8)"]}
              locations={[0, 0.22, 0.55, 1]}
              style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
            />
          ) : null}
          {soldOut ? (
            <>
              {/* Flat dark scrim mutes the poster — the "dead" state. */}
              <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: p.scrim }} />
              {/* Centered sold-out pill (states StDetailSoldOut). */}
              <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, height: 34, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: p.surface }}>
                  <Icon name="x" size={15} color={p.danger} sw={2.5} />
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 13, leading: 1, color: p.danger })}>{t("detail.soldOut")}</Text>
                </View>
              </View>
            </>
          ) : null}
          <View style={{ position: "absolute", top: insets.top + 4, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
            <IconBtn name="cleft" glass dark={heroOnDark} size={40} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <IconBtn name="share" glass dark={heroOnDark} size={40} onPress={onShare} accessibilityLabel={t("a11y.share")} />
              <PopOnChange active={savedPop}>
                <IconBtn name="heart" glass dark={heroOnDark} size={40} active={isSaved} fill onPress={onToggleSave} accessibilityLabel={t("a11y.save")} />
              </PopOnChange>
            </View>
          </View>
          <Animated.View style={[{ position: "absolute", left: 20, right: 20, bottom: 18 }, heroTitleAnim]}>
            <View style={{ flexDirection: "row", gap: 7, marginBottom: 10 }}>
              {isApprovedReg ? (
                // "You're going" — solid forest badge (owned-state hero treatment).
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 11, borderRadius: radii.pill, backgroundColor: p.forest }}>
                  <Icon name="check" size={13} color={p.fgOnBrand} sw={3} />
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 11, leading: 1, color: p.fgOnBrand })}>{t("detail.registered")}</Text>
                </View>
              ) : null}
              {isPendingReg ? <Tag tone="accent">{t("detail.pending")}</Tag> : null}
              {cats[0]?.name ? (
                <View style={{ height: 24, paddingHorizontal: 9, borderRadius: radii.pill, backgroundColor: fade.canvasHigh, justifyContent: "center" }}>
                  <Text style={type({ weight: 700, size: 11, leading: 1, color: accent.ink })}>{cats[0].name}</Text>
                </View>
              ) : null}
              {capacity > 0 && !soldOut ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 24, paddingHorizontal: 9, borderRadius: radii.pill, backgroundColor: fade.inkSoft }}>
                  <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: darkTheme.danger }} />
                  <Text style={type({ weight: 600, size: 11, leading: 1, color: p.fgOnBrand })}>{t("detail.pctFull", { pct })}</Text>
                </View>
              ) : null}
            </View>
            <Text style={type({ role: "display", weight: 700, size: 27, leading: 1.06, track: -0.03, color: heroOnDark ? p.fgOnBrand : heroMood.fg })}>{ev.title}</Text>
          </Animated.View>
        </Animated.View>

        {/* In-flow sub-nav (opaque so the parallax hero never bleeds through). */}
        <View style={{ backgroundColor: p.canvas, borderBottomWidth: 1, borderBottomColor: p.border }}>
          <TabStrip tabs={TABS} active={active} onPress={goTo} />
        </View>

        {/* Content block — opaque canvas; everything below the hero lives here so
            the parallax hero stays strictly behind it (no bleed-through). */}
        <View
          onLayout={(e) => { contentTopRef.current = e.nativeEvent.layout.y; }}
          style={{ backgroundColor: p.canvas, paddingHorizontal: gutter, paddingTop: 18 }}
        >
          {/* Facts first: date, venue and price are what a visitor scrolled for.
              They used to sit below the organizer card, off the first screen. */}
          <View style={{ paddingBottom: 6 }}>
            <MetaRow icon="cal" label={t("detail.dateTime")} value={`${formatDateRange(ev.startDate, ev.endDate, lang)} · ${formatTimeRange(ev.startDate, ev.endDate, lang)}`} />
            <MetaRow icon="pin" label={t("detail.venue")} value={isOnline ? t("detail.onlineEvent") : venueLine || t("detail.venueTbd")} />
            <MetaRow icon="ticket" label={t("detail.ticketsFrom")} value={poster.free ? t("common.free") : poster.price[lang]} accent />
          </View>

          {/* Organizer (constant) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: p.borderSubtle }}>
            <AnimatedPressable
              accessibilityRole="button"
              haptic="tap"
              scaleTo={0.98}
              disabled={!ev.organization?.id}
              onPress={() => ev.organization?.id && router.push(`/organizer/${ev.organization.id}`)}
              style={{ flexDirection: "row", alignItems: "center", gap: 11, flex: 1, minWidth: 0 }}
            >
              <Avatar initials={initials(ev.organization?.name ?? ev.organization?.companyName ?? "EF")} size={42} hue={poster.hue} src={resolveMediaUrl(ev.organization?.logoUrl)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={type({ weight: 500, size: 11, leading: 1, color: p.fgMuted })}>{t("detail.organizedBy")}</Text>
                <Text style={[type({ weight: 700, size: 15, leading: 1.1, color: p.fg }), { marginTop: 3 }]} numberOfLines={1}>
                  {ev.organization?.name ?? ev.organization?.companyName ?? "—"}
                </Text>
              </View>
              {ev.organization?.id ? <Icon name="cright" size={18} color={p.fgSubtle} /> : null}
            </AnimatedPressable>
          </View>

          {ev.format ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
              <Tag tone="neutral">{t(`detail.format.${ev.format}` as never)}</Tag>
              {cats.map((c) => <Tag key={c.slug ?? c.name} tone="accent">{c.name ?? ""}</Tag>)}
            </View>
          ) : null}

          {/* ── About ─────────────────────────────────────────────────── */}
          <View onLayout={onSecLayout("about")} style={{ paddingTop: 26 }}>
            <SectionTitle>{t("detail.tab.about")}</SectionTitle>
            <View style={{ gap: 18 }}>
              {isApprovedReg ? (
                // Mini-ticket "receipt" (states StDetailRegistered): QR chip +
                // confirmation, tapping through to the full scannable ticket.
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.viewTicket")}
                  haptic="tap"
                  scaleTo={0.98}
                  onPress={() => reg?.id && router.push(`/ticket/${reg.id}`)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.card, backgroundColor: p.forestSoft, borderWidth: 1, borderColor: p.successSoft }}
                >
                  <View style={{ padding: 5, backgroundColor: p.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: p.border }}>
                    {qrQ.isError ? (
                      // Whole 64px QR chip retries (a nested inline-text target
                      // would be ~10px tall and near-misses would navigate away).
                      <AnimatedPressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.retry")}
                        haptic="tap"
                        onPress={() => void qrQ.refetch()}
                        style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center", gap: 5 }}
                      >
                        <Icon name="refresh" size={16} color={p.forestSoftFg} />
                        <Text style={type({ weight: 600, size: 10, leading: 1.2, color: p.forestSoftFg, align: "center" })}>
                          {t("common.retry")}
                        </Text>
                      </AnimatedPressable>
                    ) : qrQ.data ? (
                      <Image source={{ uri: (qrQ.data as unknown as { qrCode?: string }).qrCode }} style={{ width: 64, height: 64 }} resizeMode="contain" accessibilityLabel={t("ticket.scanAtDoor")} />
                    ) : (
                      <Skeleton w={64} h={64} r={radii.sm} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={type({ weight: 700, size: 14, leading: 1.2, color: p.forestSoftFg })}>{t("detail.ticketConfirmed")}</Text>
                    <Text style={[type({ role: "mono", weight: 500, size: 11, leading: 1.3, color: p.forestSoftFg }), { marginTop: 4 }]} numberOfLines={1}>
                      {reg?.ticketNumber ? reg.ticketNumber : t("common.viewTicket")}
                    </Text>
                  </View>
                  <Icon name="cright" size={16} color={p.forestSoftFg} />
                </AnimatedPressable>
              ) : isPendingReg ? (
                <View style={{ padding: 16, borderRadius: radii.card, backgroundColor: p.sunken, borderWidth: 1, borderColor: p.borderSubtle, alignItems: "center", gap: 6 }}>
                  <Text style={type({ weight: 700, size: 14, leading: 1.2, color: p.fg, align: "center" })}>{t("detail.registrationPending")}</Text>
                  <Text style={type({ weight: 400, size: 13, leading: 1.45, color: p.fgMuted, align: "center" })}>{t("detail.registrationPendingBody")}</Text>
                </View>
              ) : null}

              <BlockText doc={ev.description} fallback={ev.shortDescription} />
              {!ev.description && !ev.shortDescription ? (
                <Text style={type({ weight: 400, size: 14, leading: 1.6, color: p.fgMuted })}>{t("detail.aboutEmpty")}</Text>
              ) : null}

              {capacity > 0 ? (
                <View style={{ padding: 16, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 9 }}>
                    <Text style={type({ role: "mono", weight: 500, size: 12, leading: 1, color: p.fgMuted })}>{tn("detail.going", going)}</Text>
                    <Text style={type({ role: "mono", weight: 500, size: 12, leading: 1, color: p.fgMuted })}>{tn("detail.spotsLeft", Math.max(0, capacity - going))}</Text>
                  </View>
                  <Meter pct={pct} />
                  <Text style={[type({ weight: 500, size: 12, leading: 1, color: p.fgMuted }), { marginTop: 12 }]}>{tn("detail.othersGoing", going)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Speakers ──────────────────────────────────────────────── */}
          {hasSpeakers ? (
          <View onLayout={onSecLayout("speakers")} style={{ paddingTop: 30 }}>
            <SectionTitle>{t("detail.tab.speakers")}</SectionTitle>
            <View style={{ gap: 14 }}>
              {speakers.map((s, i) => {
                  const name = s.name ?? ([s.firstName, s.lastName].filter(Boolean).join(" ") || "—");
                  const sub = [s.role, s.company].filter(Boolean).join(" · ");
                  // Top billing: the organizer-ordered first speaker gets the
                  // headliner double-ring treatment (ember ring + canvas gap).
                  const headliner = i === 0 && speakers.length > 1;
                  return (
                    <View key={s.id ?? i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      {headliner ? (
                        <View style={{ borderWidth: 1.5, borderColor: accent.base, borderRadius: radii.pill, padding: 2, backgroundColor: p.canvas }}>
                          <Avatar initials={initials(name)} size={44} hue={(i * 67) % 360} src={resolveMediaUrl(s.avatarUrl)} />
                        </View>
                      ) : (
                        <Avatar initials={initials(name)} size={44} hue={(i * 67) % 360} src={resolveMediaUrl(s.avatarUrl)} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={type({ weight: 600, size: 14, leading: 1.1, color: p.fg })}>{name}</Text>
                        {sub ? <Text style={[type({ weight: 400, size: 12, leading: 1.2, color: p.fgMuted }), { marginTop: 3 }]}>{sub}</Text> : null}
                      </View>
                    </View>
                  );
              })}
            </View>
          </View>
          ) : null}

          {/* ── Programme ─────────────────────────────────────────────── */}
          {hasProgramme ? (
          <View onLayout={onSecLayout("programme")} style={{ paddingTop: 30 }}>
            <SectionTitle>{t("detail.tab.programme")}</SectionTitle>
            <View style={{ gap: 14 }}>
                {agenda.map((a, i) => {
                  const live = isLiveSlot(agenda, i, nowTs);
                  return (
                    <View key={a.id ?? i} style={{ flexDirection: "row", gap: 12 }}>
                      <Text style={[type({ role: "mono", weight: 600, size: 12, leading: 1.4, color: accent.ink }), { width: 52 }]}>
                        {a.startTime ? formatTime(a.startTime, lang) : "—"}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[type({ weight: 600, size: 14, leading: 1.25, color: p.fg }), { flexShrink: 1 }]}>{a.title ?? "—"}</Text>
                          {live ? (
                            <>
                              <LivePulse />
                              <Tag tone="live">{t("detail.now")}</Tag>
                            </>
                          ) : null}
                        </View>
                        {a.location ? <Text style={[type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted }), { marginTop: 3 }]}>{a.location}</Text> : null}
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
          ) : null}

          {/* ── Venue ─────────────────────────────────────────────────── */}
          <View onLayout={onSecLayout("venue")} style={{ paddingTop: 30 }}>
            <SectionTitle>{t("detail.tab.venue")}</SectionTitle>
            {isOnline ? (
              // "Online" is an answer, not an absence — so it gets a real card
              // (how you join, and when the link becomes available), not the
              // empty-state treatment it used to share with a missing venue.
              <View style={{ borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="globe" size={18} color={p.fgMuted} />
                  <Text style={[type({ weight: 700, size: 15, leading: 1.2, color: p.fg }), { flex: 1 }]}>{t("detail.onlineEvent")}</Text>
                </View>
                <Text style={[type({ weight: 400, size: 13, leading: 1.5, color: p.fgMuted }), { marginTop: 8 }]}>
                  {ev.onlineUrl ? t("detail.online.hasLink") : t("detail.online.linkAfterRegister")}
                </Text>
                {ev.onlineUrl ? (
                  <View style={{ marginTop: 14, alignSelf: "flex-start" }}>
                    <Btn size="md" variant="secondary" icon="globe" onPress={() => ev.onlineUrl && Linking.openURL(ev.onlineUrl)}>{t("detail.joinLink")}</Btn>
                  </View>
                ) : null}
              </View>
            ) : venueLine || ev.address ? (
              <View style={{ borderRadius: radii.card, overflow: "hidden", borderWidth: 1, borderColor: p.border }}>
                <View style={{ height: 130, backgroundColor: p.muted, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="pin" size={28} color={accent.base} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={type({ weight: 600, size: 14, leading: 1.2, color: p.fg })}>{ev.venue ?? ev.city ?? "—"}</Text>
                    {(ev.address || ev.city) ? <Text style={[type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted }), { marginTop: 3 }]}>{[ev.address, ev.city].filter(Boolean).join(", ")}</Text> : null}
                  </View>
                  <Btn size="sm" variant="secondary" icon="map" onPress={openMaps}>{t("common.directions")}</Btn>
                </View>
              </View>
            ) : (
              <StateBlock icon="pin" title={t("detail.venueTbd")} />
            )}
          </View>

          {/* ── Materials ─────────────────────────────────────────────── */}
          {hasMaterials ? (
          <View onLayout={onSecLayout("materials")} style={{ paddingTop: 30 }}>
            <SectionTitle>{t("detail.tab.materials")}</SectionTitle>
            {(
              <View style={{ gap: 10 }}>
                {materials.map((m, i) => {
                  // No dead taps: a row without a real file renders disabled
                  // (the API has no "locked" flag — everything present is open).
                  const available = Boolean(m.fileUrl && m.agendaItemId);
                  const label = m.label ?? m.fileUrl ?? "—";
                  return (
                    <AnimatedPressable
                      key={m.id ?? i}
                      accessibilityRole="button"
                      accessibilityLabel={available ? label : `${label} — ${t("detail.material.unavailable")}`}
                      accessibilityState={{ disabled: !available }}
                      haptic="tap"
                      scaleTo={0.98}
                      disabled={!available}
                      onPress={() => m.fileUrl && Linking.openURL(`${env.apiUrl}${m.fileUrl.startsWith("/") ? "" : "/"}${m.fileUrl}`)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.control, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, opacity: available ? 1 : 0.55 }}
                    >
                      <Icon name={available ? "dl" : "lock"} size={18} color={available ? accent.ink : p.fgSubtle} />
                      <Text style={[type({ weight: 500, size: 14, leading: 1.2, color: p.fg }), { flex: 1 }]} numberOfLines={1}>{label}</Text>
                      {available ? <Icon name="cright" size={16} color={p.fgSubtle} /> : null}
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>
          ) : null}

          {/* ── Comments ──────────────────────────────────────────────── */}
          <View onLayout={onSecLayout("comments")} style={{ paddingTop: 30 }}>
            {/* Focusing the composer (incl. Reply on a deep comment) scrolls it
                back under the sticky header, clear of the incoming keyboard. */}
            <EventComments eventId={id ?? ""} onComposerFocus={() => goTo("comments")} />
          </View>

          <View style={{ height: 40 }} />
          {/* Grows with the keyboard so the composer can always scroll clear. */}
          <Animated.View style={kbSpacer} />
        </View>
      </Animated.ScrollView>

      {/* Collapsing sticky header — fades/slides in; subheader grows in height */}
      <Animated.View
        pointerEvents={headerOn ? "auto" : "none"}
        style={[
          { position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, paddingTop: insets.top, backgroundColor: p.canvas, borderBottomWidth: 1, borderBottomColor: p.border },
          shadow.sm,
          headerAnim,
        ]}
      >
        <View style={{ height: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 4 }}>
          <IconBtn name="cleft" size={38} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
          <Text numberOfLines={1} style={[type({ weight: 700, size: 15.5, leading: 1.1, color: p.fg }), { flex: 1 }]}>{ev.title}</Text>
          <IconBtn name="share" size={38} onPress={onShare} accessibilityLabel={t("a11y.share")} />
          <PopOnChange active={savedPop}>
            <IconBtn name="heart" size={38} active={isSaved} fill onPress={onToggleSave} accessibilityLabel={t("a11y.save")} />
          </PopOnChange>
        </View>
        <Animated.View style={[{ overflow: "hidden", justifyContent: "flex-end" }, subheaderAnim]}>
          <TabStrip tabs={TABS} active={active} onPress={goTo} />
        </Animated.View>
      </Animated.View>

      <ActionBar>
        {regNotice ? (
          <View style={{ marginBottom: 10 }}>
            <Banner tone="success">{regNotice}</Banner>
          </View>
        ) : null}
        {regError ? (
          <View style={{ marginBottom: 10 }}>
            <Banner tone="danger">{regError}</Banner>
          </View>
        ) : null}
        {/* Save lives in the header only (the heart, in both the hero and the
            sticky bar). This bar used to carry a second, differently-iconed
            bookmark for the same action — two controls, one state. */}
        {renderCta()}
      </ActionBar>

      {/* Register moment — blocking processing + staged success confirmation. */}
      <RegisterMoment
        processing={moment === "processing"}
        result={typeof moment === "object" ? moment : null}
        eventTitle={ev.title}
        dateLine={`${formatDateRange(ev.startDate, ev.endDate, lang)} · ${formatTime(ev.startDate, lang)}`}
        onDone={() => setMoment(null)}
        onViewTicket={(rid) => {
          setMoment(null);
          router.push(`/ticket/${rid}`);
        }}
      />
    </Screen>
  );
}
