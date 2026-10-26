import { useEffect, useMemo, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  Image, RefreshControl, ScrollView, Text, TextInput, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from "react-native";
import Animated from "react-native-reanimated";

import {
  useCancelEventMutation,
  useDeleteEventMutation,
  useOrgEventsCountQuery,
  useOrgEventsInfiniteQuery,
  type OrgEventLifecycle,
  type OrgEventRow,
  type OrgEventsFilter,
} from "@entities/org-events";
import { PERM, useAuth, useHasPermission, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { formatDateStamp, formatNumber, formatTime } from "@shared/lib/format";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { Body, BottomSheet, Btn, Icon, IconBtn, OrgEventCard, OrgEventListRow, OrgHeader, Screen, Skeleton, Spinner, StateBlock, type EventLifecycleStatus } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

type FilterKey = "all" | EventLifecycleStatus;
type TypeFilter = "all" | "free" | "paid";
type FormatFilter = "all" | "OFFLINE" | "ONLINE" | "HYBRID";
type SortKey = "newest" | "oldest" | "startDate" | "title";

const TYPE_OPTS: { key: TypeFilter; label: StringKey }[] = [
  { key: "all", label: "common.all" },
  { key: "free", label: "org.form.free" },
  { key: "paid", label: "org.form.paid" },
];
const FORMAT_OPTS: { key: FormatFilter; label: StringKey }[] = [
  { key: "all", label: "common.all" },
  { key: "OFFLINE", label: "org.form.format.OFFLINE" },
  { key: "ONLINE", label: "org.form.format.ONLINE" },
  { key: "HYBRID", label: "org.form.format.HYBRID" },
];
const SORT_OPTS: { key: SortKey; label: StringKey }[] = [
  { key: "newest", label: "org.events.sort.newest" },
  { key: "oldest", label: "org.events.sort.oldest" },
  { key: "startDate", label: "org.events.sort.startDate" },
  { key: "title", label: "org.events.sort.title" },
];

const DAY_MS = 86_400_000;

/** Chip → the server's `lifecycle` parameter. «Все» sends nothing.
 *  The stage is computed server-side now: LIVE has no status of its own and
 *  PAST spans two, so neither survives being narrowed page by page. */
const LIFECYCLE_PARAM: Record<Exclude<FilterKey, "all">, OrgEventLifecycle> = {
  live: "LIVE",
  published: "PUBLISHED",
  pending: "PENDING",
  draft: "DRAFT",
  past: "PAST",
  cancelled: "CANCELLED",
};

/** Sort → server field + direction. «Новые/старые» now mean by CREATION and
 *  «по дате проведения» by start date; the client sort conflated the two and
 *  ordered all three by `startDate`. */
const SORT_PARAM: Record<SortKey, { sortBy: NonNullable<OrgEventsFilter["sortBy"]>; sortOrder: NonNullable<OrgEventsFilter["sortOrder"]> }> = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  oldest: { sortBy: "createdAt", sortOrder: "asc" },
  startDate: { sortBy: "startDate", sortOrder: "asc" },
  title: { sortBy: "title", sortOrder: "asc" },
};

/** Chip order per design 16 §5.2 (+ pending/cancelled — real API statuses). */
const FILTERS: { key: FilterKey; label: StringKey }[] = [
  { key: "all", label: "common.all" },
  { key: "live", label: "org.status.live" },
  { key: "published", label: "org.status.published" },
  { key: "pending", label: "org.status.pending" },
  { key: "draft", label: "org.status.draft" },
  { key: "past", label: "org.status.past" },
  { key: "cancelled", label: "org.status.cancelled" },
];

/**
 * Long-press по карточке (design 4.4).
 *
 * Макет предлагает «дублировать / удалить». Дублирования в API нет вовсе, а
 * `DELETE /events/:id` не смотрит на статус и снесёт опубликованное событие
 * вместе с регистрациями — поэтому удаление здесь только для черновика, а
 * живому событию предлагается отмена: у продукта для этого есть отдельная
 * операция, и участники должны узнать, а не найти по ссылке пустоту.
 */
function CardActionsSheet({
  row, onClose, onDelete, onCancel, busy, canDelete, canCancel,
}: {
  row: OrgEventRow | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  busy: boolean;
  /** `events:delete` — deleting a draft. */
  canDelete: boolean;
  /** `events:update` — cancelling a live event. */
  canCancel: boolean;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  const draft = row?.lifecycle === "draft" && canDelete;
  const cancellable = row ? ["published", "live"].includes(row.lifecycle) && canCancel : false;

  return (
    <BottomSheet visible={!!row} onClose={onClose} maxHeightRatio={0.5} closeLabel={t("common.close")}>
      <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
        <Text numberOfLines={2} style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
          {row?.title ?? ""}
        </Text>

        {draft ? (
          <Btn full size="lg" variant="secondary" loading={busy} onPress={() => row && onDelete(row.id)}>
            {t("org.events.actions.delete")}
          </Btn>
        ) : null}

        {cancellable ? (
          <>
            <Btn full size="lg" variant="secondary" loading={busy} onPress={() => row && onCancel(row.id)}>
              {t("org.events.actions.cancel")}
            </Btn>
            <Text style={type({ weight: 400, size: 12, leading: 1.5, color: p.fgMuted })}>
              {t("org.events.actions.liveNote")}
            </Text>
          </>
        ) : null}

        <Text style={type({ weight: 400, size: 12, leading: 1.5, color: p.fgSubtle })}>
          {t("org.events.actions.duplicateSoon")}
        </Text>
      </View>
    </BottomSheet>
  );
}

/** One row of mutually-exclusive options in the filter sheet. */
function OptionGroup<K extends string>({
  title, options, value, onChange,
}: {
  title: string;
  /** `label` is a catalog key; `text` is already-resolved copy (city names,
   *  which are data and have no translation key). Exactly one is given. */
  options: { key: K; label?: StringKey; text?: string }[];
  value: K;
  onChange: (k: K) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();
  return (
    <View style={{ gap: 9 }}>
      <Text
        maxFontSizeMultiplier={1.3}
        style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map(({ key, label, text }) => {
          const on = value === key;
          return (
            <AnimatedPressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              haptic="select"
              scaleTo={0.96}
              onPress={() => onChange(key)}
              style={{
                paddingHorizontal: 13,
                height: 36,
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: on ? p.inverse : p.surface,
                borderWidth: 1,
                borderColor: on ? "transparent" : p.border,
              }}
            >
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: on ? 600 : 500, size: 13, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                {text ?? (label ? t(label) : key)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

/** One lifecycle chip. It asks the server for its OWN count, under whatever
 *  narrowing is currently active — the screen no longer holds the whole list,
 *  so a count cannot be tallied from what happens to be loaded. The number
 *  appears when it arrives; a chip briefly without one beats a chip that says
 *  "0" because page two has not come back yet. */
function FilterChip({
  orgId, base, lifecycle, label, active, onPress,
}: {
  orgId: string | undefined;
  base: OrgEventsFilter;
  lifecycle?: OrgEventLifecycle;
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element | null {
  const p = usePalette();
  const { lang } = useI18n();
  const countQ = useOrgEventsCountQuery(orgId, base, lifecycle);
  const count = countQ.data;

  // An empty bucket is noise on a rail you scroll horizontally — hide it, but
  // never hide the chip the user is standing on.
  if (!active && count === 0) return null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      haptic="select"
      scaleTo={0.97}
      onPress={onPress}
      style={{
        height: 34,
        paddingHorizontal: 14,
        borderRadius: radii.pill,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: active ? p.inverse : p.sunken,
      }}
    >
      <Text maxFontSizeMultiplier={1.2} style={type({ weight: active ? 600 : 500, size: 12, leading: 1, color: active ? p.fgInverse : p.fgDefault })}>
        {label}
      </Text>
      {typeof count === "number" ? (
        <Text
          maxFontSizeMultiplier={1.2}
          style={[type({ role: "mono", weight: 600, size: 11, leading: 1, color: active ? p.fgInverseMuted : p.fgMuted }), { fontVariant: ["tabular-nums"] }]}
        >
          {formatNumber(count, lang)}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

/** 16 · Org events, design 4.4: a large masthead with an explicit "Create"
 *  action, title search, lifecycle chips with counts, per-lifecycle cards, and
 *  an endlessly scrolling list.
 *
 *  Every narrowing — stage, search, type, format, city, order — is a SERVER
 *  parameter. It used to pull one page of 100 and sift it in the browser, which
 *  quietly cut a busy organization off at a hundred events; and once the list
 *  pages, sifting locally would answer for rows it has never seen. */
export default function OrgEvents(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const [activeKey, setActiveKey] = useState<FilterKey>("all");
  const [q, setQ] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeF, setTypeF] = useState<TypeFilter>("all");
  const [formatF, setFormatF] = useState<FormatFilter>("all");
  const [cityF, setCityF] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  /** Card (1a) vs dense list (1b) — design «Пять видов карточки события». */
  const [view, setView] = useState<"cards" | "list">("cards");
  const [refreshing, setRefreshing] = useState(false);
  const [actionRow, setActionRow] = useState<OrgEventRow | null>(null);

  // Debounced so typing does not fire a request per keystroke.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const orgId = workspace?.organizationId;

  /** Everything EXCEPT the stage — the chips share it and each adds its own. */
  const base = useMemo<OrgEventsFilter>(
    () => ({
      search: search || undefined,
      type: typeF === "all" ? undefined : typeF === "free" ? "FREE" : "PAID",
      format: formatF === "all" ? undefined : formatF,
      city: cityF === "all" ? undefined : cityF,
    }),
    [search, typeF, formatF, cityF],
  );

  const filter = useMemo<OrgEventsFilter>(
    () => ({
      ...base,
      ...(activeKey === "all" ? {} : { lifecycle: LIFECYCLE_PARAM[activeKey] }),
      ...SORT_PARAM[sort],
    }),
    [base, activeKey, sort],
  );

  const del = useDeleteEventMutation();
  const cancelEvent = useCancelEventMutation();

  /** Удаление и отмена — обе необратимы, обе подтверждаются. */
  const onDeleteRow = (id: string): void => {
    const title = actionRow?.title ?? "";
    setActionRow(null);
    confirm({
      title: t("org.events.actions.delete.title"),
      message: t("org.events.actions.delete.body", { title }),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => del.mutate(id),
    });
  };
  const onCancelRow = (id: string): void => {
    const title = actionRow?.title ?? "";
    setActionRow(null);
    confirm({
      title: t("org.events.actions.cancel.title"),
      message: t("org.events.actions.cancel.body", { title }),
      confirmText: t("org.events.actions.cancel"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => cancelEvent.mutate(id),
    });
  };

  const query = useOrgEventsInfiniteQuery(orgId, filter);
  const rows = useMemo(() => query.data?.pages.flatMap((pg) => pg.rows) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  // The city picker has no catalogue endpoint to read, so its options are the
  // cities seen so far. Scrolling further can add to the list — that is honest
  // for a picker, and better than an empty dropdown.
  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  /** Count of NON-default sheet filters — the badge on the filter button, so
   *  the user can tell a short list from a filtered one without opening it. */
  const activeFilters =
    (typeF === "all" ? 0 : 1) + (formatF === "all" ? 0 : 1) + (cityF === "all" ? 0 : 1);

  /** Pull the next page as the scroll approaches the end. */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 400) {
      void query.fetchNextPage();
    }
  };

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  // Hooks run before the gate's early return — every render must call the
  // same ones in the same order.
  const has = useHasPermission();
  const canCreate = has(PERM.eventsCreate);
  const canDelete = has(PERM.eventsDelete);
  const canEdit = has(PERM.eventsUpdate);

  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openForm = (): void => router.push("/org/event-form");

  return (
    <Screen>
      <OrgHeader
        title={t("org.events.title")}
        large
        right={
          canCreate ? (
            <Btn size="sm" variant="primary" icon="plus" onPress={openForm}>
              {t("org.events.createShort")}
            </Btn>
          ) : undefined
        }
      />

      {rows.length > 0 ? (
        <View style={{ backgroundColor: p.canvas, borderBottomWidth: 1, borderBottomColor: p.borderSubtle, paddingTop: 12, gap: 12 }}>
          {/* Title search — instant, over the loaded page */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16 }}>
          <View
            style={{
              flex: 1,
              height: 38,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              borderRadius: radii.control,
              backgroundColor: p.sunken,
            }}
          >
            <Icon name="search" size={16} sw={2} color={p.fgSubtle} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("org.events.searchPlaceholder")}
              placeholderTextColor={p.fgSubtle}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={t("org.events.searchPlaceholder")}
              style={[type({ weight: 400, size: 15, leading: 1, color: p.fg }), { flex: 1, padding: 0 }]}
            />
            {q ? (
              <AnimatedPressable accessibilityRole="button" accessibilityLabel={t("common.clear")} haptic="tap" hitSlop={8} onPress={() => setQ("")}>
                <Icon name="x" size={16} sw={2} color={p.fgMuted} />
              </AnimatedPressable>
            ) : null}
          </View>
            {/* Cards ↔ dense list. One icon that shows the mode you'd switch
                TO — an organizer with a dozen events lives in the dense one. */}
            <IconBtn
              name={view === "cards" ? "list" : "grid"}
              size={38}
              onPress={() => setView(view === "cards" ? "list" : "cards")}
              accessibilityLabel={t(view === "cards" ? "org.events.view.list" : "org.events.view.cards")}
            />
            <View>
              <IconBtn name="sliders" size={38} active={activeFilters > 0} onPress={() => setSheetOpen(true)} accessibilityLabel={t("org.events.filters")} />
              {activeFilters > 0 ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    borderRadius: radii.pill,
                    backgroundColor: accent.base,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={type({ role: "mono", weight: 600, size: 9, leading: 1, color: accent.on })}>{activeFilters}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Lifecycle chips — hidden until counted */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 7 }}
          >
            {FILTERS.map(({ key, label }) => (
              <FilterChip
                key={key}
                orgId={orgId}
                base={base}
                lifecycle={key === "all" ? undefined : LIFECYCLE_PARAM[key]}
                label={t(label)}
                active={activeKey === key}
                onPress={() => setActiveKey(key)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Body
        tabBarClearance
        contentStyle={{ paddingTop: 14 }}
        onScroll={onScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={236} r={radii.card} />
            ))}
          </View>
        ) : query.isError ? (
          <View style={{ paddingVertical: 28 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => query.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : rows.length === 0 ? (
          /* Nothing came back. With every filter server-side this is the ONE
             empty state: either the organization has no events at all, or the
             current narrowing matches none. Both read from the same query, so
             tell them apart by whether anything is narrowed. */
          <View style={{ paddingVertical: 28 }}>
            {activeKey === "all" && !search && activeFilters === 0 ? (
              <StateBlock
                icon="cal"
                title={t("org.home.empty.title")}
                body={t("org.home.empty.body")}
                action={canCreate ? <Btn size="md" variant="primary" icon="plus" onPress={openForm}>{t("org.events.createFirst")}</Btn> : undefined}
              />
            ) : (
              <StateBlock
                icon={search ? "search" : "cal"}
                title={search ? t("org.events.empty.search") : t("org.events.empty.filtered")}
                body={search ? t("org.events.empty.searchBody", { q: search }) : t("org.events.empty.filteredBody")}
                action={search ? <Btn size="md" variant="secondary" onPress={() => setQ("")}>{t("common.clear")}</Btn> : undefined}
              />
            )}
          </View>
        ) : (
          <View style={view === "cards" ? { gap: 26 } : undefined}>
            {rows.map((row, i) =>
              view === "cards" ? (
                <OrgEventCard
                  key={row.id}
                  row={row}
                  index={i}
                  onPress={() => router.push({ pathname: "/org/event/[id]", params: { id: row.id } })}
                  onMore={() => setActionRow(row)}
                />
              ) : (
                <OrgEventListRow
                  key={row.id}
                  row={row}
                  index={i}
                  last={i === rows.length - 1}
                  onPress={() => router.push({ pathname: "/org/event/[id]", params: { id: row.id } })}
                  onMore={() => setActionRow(row)}
                />
              ),
            )}
            {/* Design 4.4's three pulsing dots live here as the kit's spinner —
                the list keeps going, so the footer never claims a total. */}
            {query.isFetchingNextPage ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <Spinner size={22} />
              </View>
            ) : null}
          </View>
        )}
      </Body>
          {/* 4.4b · filter sheet. All of it runs over the loaded page — the list
          endpoint takes no type/format/city/sort params, so filtering here is
          instant and honest rather than a request that silently ignores them. */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} maxHeightRatio={0.85} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={type({ role: "display", weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
              {t("org.events.filters")}
            </Text>
            {activeFilters > 0 ? (
              <AnimatedPressable
                accessibilityRole="button"
                haptic="tap"
                scaleTo={0.95}
                hitSlop={8}
                onPress={() => {
                  setTypeF("all");
                  setFormatF("all");
                  setCityF("all");
                }}
              >
                <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.base })}>{t("common.clear")}</Text>
              </AnimatedPressable>
            ) : null}
          </View>

          <OptionGroup title={t("org.events.filter.type")} options={TYPE_OPTS} value={typeF} onChange={setTypeF} />
          <OptionGroup title={t("org.events.filter.format")} options={FORMAT_OPTS} value={formatF} onChange={setFormatF} />
          <OptionGroup title={t("org.events.filter.sort")} options={SORT_OPTS} value={sort} onChange={setSort} />

          {cities.length > 0 ? (
            <OptionGroup
              title={t("org.events.filter.city")}
              options={[
                { key: "all", label: "org.events.filter.anyCity" as StringKey },
                ...cities.map((c) => ({ key: c, text: c })),
              ]}
              value={cityF}
              onChange={setCityF}
            />
          ) : null}

          {/* The count is the SERVER's total under this filter, not the number
              of rows loaded — the sheet promises what the list will hold, and
              the list keeps loading after it closes. */}
          <Btn full size="lg" variant="primary" disabled={total === 0} onPress={() => setSheetOpen(false)}>
            {total === 0
              ? t("org.events.filter.showNone")
              : t("org.events.filter.show", { n: formatNumber(total, lang) })}
          </Btn>
        </View>
      </BottomSheet>

      <CardActionsSheet
        row={actionRow}
        onClose={() => setActionRow(null)}
        onDelete={onDeleteRow}
        onCancel={onCancelRow}
        busy={del.isPending || cancelEvent.isPending}
        canDelete={canDelete}
        canCancel={canEdit}
      />
    </Screen>
  );
}
