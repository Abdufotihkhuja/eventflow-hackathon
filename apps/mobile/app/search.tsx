import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toCardEvent, useInfiniteEventsQuery } from "@entities/event";
import { goBack } from "@shared/lib/go-back";
import { useI18n } from "@shared/i18n";
import { AnimatedPressable, fadeIn } from "@shared/motion";
import { useRegion } from "@shared/region";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, Btn, EventCard, Icon, IconBtn, Screen, Skeleton, StateBlock } from "@shared/ui";

// Mirrors the Discover feed skeleton (same EventCard geometry).
const CARD_SKEL_H = 300;
/** Start fetching the next page within this distance of the list end. */
const PAGE_TRIGGER_PX = 600;

/** Event search — live, debounced query over the public events API. */
export default function Search(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, tn, lang, tx } = useI18n();
  const { region, ready } = useRegion();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  // Escape hatch: the region silently constrains search results; the hint chip
  // below surfaces it and lets the user search across all regions.
  const [allRegions, setAllRegions] = useState(false);

  // Debounce keystrokes into the query term.
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const active = term.length >= 2;
  const city = allRegions ? undefined : region.city ?? undefined;
  const q = useInfiniteEventsQuery(
    { search: term, locale: lang, city, limit: 20 },
    { enabled: active && ready },
  );
  const items = q.data?.pages.flatMap((page) => page.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - PAGE_TRIGGER_PX;
    if (nearEnd && q.hasNextPage && !q.isFetchingNextPage) {
      void q.fetchNextPage();
    }
  }

  // The region hint is an escape hatch, only meaningful once a search runs.
  const regionHint = active && !allRegions && region.city ? (
    <View style={{ flexDirection: "row", marginBottom: 12 }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("search.regionFilter.remove")}
        haptic="select"
        onPress={() => setAllRegions(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: accent.soft }}
      >
        <Icon name="pin" size={13} color={accent.ink} />
        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 12, leading: 1, color: accent.ink })}>
          {t("search.regionFilter", { city: tx(region.label) })}
        </Text>
        <Icon name="x" size={13} color={accent.ink} />
      </AnimatedPressable>
    </View>
  ) : null;

  function body(): React.JSX.Element {
    if (!active) {
      return <StateBlock icon="search" title={t("search.idle.title")} body={t("search.idle.body")} />;
    }
    // First-ever fetch only — refinements keep the previous list rendered
    // (placeholderData), so keystrokes never tear results down to skeletons.
    if (q.isLoading || !ready) {
      return (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={CARD_SKEL_H} r={radii.card} />)}
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
    if (items.length === 0) {
      return (
        <View style={{ flex: 1 }}>
          {regionHint}
          <StateBlock icon="search" title={t("search.empty.title")} body={t("search.empty.body", { q: term })} />
        </View>
      );
    }
    return (
      <Animated.View entering={fadeIn()}>
        {regionHint}
        {/* Results count comes from the server envelope total. */}
        <Text
          maxFontSizeMultiplier={1.3}
          style={[type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.06, color: p.fgMuted, transform: "uppercase" }), { marginBottom: 12 }]}
        >
          {tn("search.results", total, { q: term })}
        </Text>
        <View style={{ gap: 12, opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          {items.map((e) => (
            <EventCard key={e.id} event={toCardEvent(e, lang)} onPress={() => router.push(`/event/${e.id}`)} />
          ))}
          {q.isFetchingNextPage ? <Skeleton h={CARD_SKEL_H} r={radii.card} /> : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <Screen>
      {/* Search bar */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconBtn name="cleft" size={42} onPress={() => goBack(router, "/discover")} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radii.card, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Icon name="search" size={18} color={p.fgSubtle} />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            autoFocus
            returnKeyType="search"
            accessibilityLabel={t("a11y.search")}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={p.fgMuted}
            // No lineHeight on a single-line TextInput — on iOS a fixed lineHeight
            // clips the glyphs and breaks vertical centering; the row centers it.
            // Key OMITTED, not overridden with `undefined` — the override kills
            // the Android Fabric EditText on the first keystroke (see Field).
            style={[(({ lineHeight: _lh, ...rest }) => rest)(type({ weight: 400, size: 14, color: p.fg })), { flex: 1, padding: 0 }]}
          />
          {text.length > 0 ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t("a11y.close")}
              haptic="tap"
              rippleBorderless
              hitSlop={8}
              onPress={() => { setText(""); inputRef.current?.focus(); }}
            >
              <Icon name="x" size={18} color={p.fgSubtle} />
            </AnimatedPressable>
          ) : null}
        </View>
      </View>

      <Body contentStyle={{ paddingTop: 6, flexGrow: 1 }} onScroll={onScroll} dismissKeyboardOnDrag>
        {body()}
      </Body>
    </Screen>
  );
}
