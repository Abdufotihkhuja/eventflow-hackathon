/**
 * 4.8 · Participants — moderation in one gesture.
 *
 * The design's changes over the old hairline list, and why each earns its keep:
 *  • swipe right approves, swipe left rejects (design 4.8's headline gesture) —
 *    moderating a queue is the one thing done dozens of times in a row here,
 *    and a thumb flick beats aiming at a 13px word every time;
 *  • one CARD per person, so approve/reject can live as a split footer INSIDE
 *    the row — the old layout put a green pill where the status badge goes on
 *    every other row, which made "approved" and "approve" look alike;
 *  • status chips are tinted by meaning (amber pending / green approved /
 *    red rejected), so the filter rail says what it filters without reading;
 *  • long-press enters SELECTION mode with a dark action bar — bulk approve
 *    used to be all-or-nothing over every loaded pending row;
 *  • tapping a row opens the person's card as a sheet instead of a dead end.
 *
 * The design's per-person test score is not built: registration answers are a
 * separate payload this list endpoint does not carry.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, RefreshControl, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { SlideOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useApproveRegistrationMutation,
  useBulkApproveMutation,
  useBulkRejectMutation,
  useEventRegistrationsInfiniteQuery,
  useEventRegistrationsQuery,
  useRejectRegistrationMutation,
  type OrgRegistrationItem,
  type OrgRegStatus,
} from "@entities/registration";
import { useEntitlementsQuery } from "@entities/billing";
import { useAuth, useCanEditEvent, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatNumber, formatTime, resolveMediaUrl } from "@shared/lib/format";
import { AnimatedPressable, crossFadeLayout, dur, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette, type Palette } from "@shared/theme";
import { haptics } from "@shared/lib/haptics";
import { Avatar, backToEvent, Body, BottomSheet, Btn, Field, Icon, IconBtn, LimitPrompt, Screen, Spinner, StateBlock, SwipeRow } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

type TabKey = OrgRegStatus | "ALL";

const TABS: { key: TabKey; label: StringKey }[] = [
  { key: "ALL", label: "attendees.tab.all" },
  { key: "PENDING", label: "attendees.tab.pending" },
  { key: "APPROVED", label: "attendees.tab.approved" },
  { key: "REJECTED", label: "attendees.tab.rejected" },
];

function statusTone(status: OrgRegStatus, p: Palette): { bg: string; fg: string } {
  switch (status) {
    case "APPROVED":
      return { bg: p.successSoft, fg: p.successSoftFg };
    case "REJECTED":
      return { bg: p.dangerSoft, fg: p.dangerSoftFg };
    case "CANCELLED":
      return { bg: p.isDark ? "rgba(255,255,255,0.08)" : p.sunken, fg: p.fgMuted };
    default:
      return { bg: p.warningSoft, fg: p.warning };
  }
}

/** Chip tint per filter — the rail carries the same colour language as the
 *  status pills, so "pending" reads amber in both places. */
function chipTone(key: TabKey, p: Palette): { bg: string; fg: string } {
  if (key === "ALL") return { bg: p.sunken, fg: p.fgDefault };
  return statusTone(key as OrgRegStatus, p);
}

function fullName(u: OrgRegistrationItem["user"]): string {
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
}
function initials(u: OrgRegistrationItem["user"]): string {
  const a = u?.firstName?.trim()?.[0] ?? "";
  const b = u?.lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || (u?.email?.[0]?.toUpperCase() ?? "?");
}

/** One attendee card. Slides out to the left when approve/reject moves it off
 *  the current filter (the keyed child unmounts → exit plays). */
function AttendeeCard({
  item, index, busy, selecting, selected, canDecide,
  onApprove, onReject, onOpen, onToggleSelect, onLongPress,
}: {
  item: OrgRegistrationItem;
  index: number;
  busy: boolean;
  selecting: boolean;
  selected: boolean;
  /** `events:update`. Without it the card reads and nothing more — the API
   *  refuses the decision anyway, and a swipe that always fails is a trap. */
  canDecide: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpen: (item: OrgRegistrationItem) => void;
  onToggleSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const tone = statusTone(item.status, p);
  const name = fullName(item.user) || item.user?.email || "—";
  const pending = item.status === "PENDING";

  const when = item.createdAt ? `${formatDateStamp(item.createdAt, lang)}, ${formatTime(item.createdAt, lang)}` : null;

  // The design's headline gesture: right = approve, left = reject. Live only on
  // a row that HAS a decision pending — swiping an already-approved person
  // would promise an action the API does not offer. Suspended in selection mode
  // (the drag there means "pick", not "decide") and while a decision is in
  // flight. The buttons below stay: a gesture nobody discovers is not a feature,
  // and it is the only affordance a screen-reader user has.
  const swipeEnabled = pending && canDecide && !selecting && !busy;

  return (
    <Animated.View
      entering={index < 8 ? enterStagger(index) : undefined}
      exiting={Platform.OS === "web" ? undefined : SlideOutLeft.duration(dur.base)}
      layout={crossFadeLayout()}
      style={{ borderRadius: radii.card, overflow: "hidden" }}
    >
      <SwipeRow
        enabled={swipeEnabled}
        radius={radii.card}
        right={{ icon: "check", label: t("attendees.approve"), color: p.success, onTrigger: () => onApprove(item.id) }}
        left={{ icon: "x", label: t("attendees.reject"), color: p.danger, onTrigger: () => onReject(item.id) }}
      >
        {/* The card FACE — border and fill travel with the finger, so the
            panels behind are revealed by a solid edge, not a translucent one. */}
        <View
          style={{
            backgroundColor: p.surface,
            borderRadius: radii.card,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? accent.base : p.border,
            overflow: "hidden",
          }}
        >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityState={{ selected }}
        haptic="tap"
        scaleTo={0.99}
        onPress={() => (selecting ? onToggleSelect(item.id) : onOpen(item))}
        onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        {selecting ? (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? accent.base : p.sunken,
            }}
          >
            {selected ? <Icon name="check" size={18} sw={2.8} color={accent.on} /> : null}
          </View>
        ) : (
          <Avatar initials={initials(item.user)} size={38} hue={(name.charCodeAt(0) * 13) % 360} src={resolveMediaUrl(item.user?.avatarUrl)} />
        )}

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 15, leading: 1.2, color: p.fg }), { flexShrink: 1 }]}>
              {name}
            </Text>
            <View style={{ paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: tone.bg }}>
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: tone.fg, transform: "uppercase" })}>
                {t(`attendees.status.${item.status}` as StringKey)}
              </Text>
            </View>
          </View>
          {item.user?.email ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.fgMuted })}>
              {item.user.email}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {when ? (
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>{when}</Text>
            ) : null}
            {item.ticketNumber ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: radii.sm, backgroundColor: p.sunken }}>
                <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, color: p.fgDefault })}>
                  {item.ticketNumber}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </AnimatedPressable>

      {/* Split decision footer — only where a decision is actually pending */}
      {pending && canDecide && !selecting ? (
        <View style={{ flexDirection: "row", gap: 1, backgroundColor: p.borderSubtle, borderTopWidth: 1, borderTopColor: p.borderSubtle }}>
          {busy ? (
            <View style={{ flex: 1, paddingVertical: 11, alignItems: "center", backgroundColor: p.surface }}>
              <Spinner size={18} />
            </View>
          ) : (
            <>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("attendees.reject")}
                haptic="tap"
                scaleTo={0.97}
                onPress={() => onReject(item.id)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, backgroundColor: p.surface }}
              >
                <Icon name="x" size={15} sw={2.4} color={p.danger} />
                <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 13, leading: 1, color: p.danger })}>{t("attendees.reject")}</Text>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("attendees.approve")}
                haptic="tap"
                scaleTo={0.97}
                onPress={() => onApprove(item.id)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, backgroundColor: p.surface }}
              >
                <Icon name="check" size={15} sw={2.6} color={p.successSoftFg} />
                <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 13, leading: 1, color: p.successSoftFg })}>{t("attendees.approve")}</Text>
              </AnimatedPressable>
            </>
          )}
        </View>
      ) : null}
        </View>
      </SwipeRow>
    </Animated.View>
  );
}

/** Person sheet — the row's detail, built only from fields the list carries. */
function PersonSheet({ item, onClose }: { item: OrgRegistrationItem | null; onClose: () => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const tone = item ? statusTone(item.status, p) : { bg: p.sunken, fg: p.fgMuted };
  const name = item ? fullName(item.user) || item.user?.email || "—" : "";

  const rows = item
    ? ([
        { k: t("attendees.sheet.email"), v: item.user?.email ?? "—", mono: false },
        { k: t("attendees.sheet.phone"), v: item.user?.phone ?? "—", mono: true },
        { k: t("attendees.sheet.registered"), v: item.createdAt ? `${formatDateStamp(item.createdAt, lang)}, ${formatTime(item.createdAt, lang)}` : "—", mono: false },
        { k: t("attendees.sheet.ticket"), v: item.ticketNumber ?? "—", mono: true },
      ] as const)
    : [];

  return (
    <BottomSheet visible={!!item} onClose={onClose} maxHeightRatio={0.86} closeLabel={t("common.close")}>
      <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar initials={item ? initials(item.user) : "?"} size={52} hue={(name.charCodeAt(0) * 13) % 360} src={resolveMediaUrl(item?.user?.avatarUrl)} />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <Text numberOfLines={2} style={type({ role: "display", weight: 700, size: 19, leading: 1.1, track: -0.02, color: p.fg })}>{name}</Text>
            {item ? (
              <View style={{ alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: tone.bg }}>
                <Text style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.06, color: tone.fg, transform: "uppercase" })}>
                  {t(`attendees.status.${item.status}` as StringKey)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, paddingHorizontal: 14 }}>
          {rows.map((r, i) => (
            <View
              key={r.k}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: p.borderSubtle,
              }}
            >
              <Text style={type({ weight: 400, size: 13, leading: 1.2, color: p.fgMuted })}>{r.k}</Text>
              <Text
                numberOfLines={1}
                style={[
                  type(r.mono
                    ? { role: "mono", weight: 600, size: 13, leading: 1.2, color: p.fg }
                    : { weight: 500, size: 13, leading: 1.2, color: p.fg }),
                  { flexShrink: 1, textAlign: "right" },
                ]}
              >
                {r.v}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

export default function Attendees(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : t("attendees.title");

  const [tab, setTab] = useState<TabKey>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetItem, setSheetItem] = useState<OrgRegistrationItem | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const canDecide = useCanEditEvent();
  const selecting = selected.length > 0;
  /** Pending reject: the ids awaiting a reason, or null when the sheet is shut. */
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  /** How many approvals were refused by the ceiling, or null when clear. */
  const [overLimit, setOverLimit] = useState<number | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const q = useEventRegistrationsInfiniteQuery(eventId || undefined, {
    status: tab === "ALL" ? undefined : tab,
    search: search || undefined,
  });
  const approve = useApproveRegistrationMutation(eventId);
  const reject = useRejectRegistrationMutation(eventId);
  const bulkApprove = useBulkApproveMutation(eventId);
  const bulkReject = useBulkRejectMutation(eventId);

  const rows = useMemo(() => q.data?.pages.flatMap((pg) => pg.data) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? rows.length;

  // The plan's participant ceiling and what is already spent against it — the
  // two numbers 4.8b's LimitPrompt is built from. `approvedQ` asks for a single
  // row and reads `total`; the list itself is filtered by the active tab and
  // cannot answer "how many are approved" while standing on another one.
  const entQ = useEntitlementsQuery(workspace?.organizationId);
  const approvedQ = useEventRegistrationsQuery(eventId || undefined, { status: "APPROVED", limit: 1 });
  const ent = entQ.data;
  const seatLimit = ent?.enforcementEnabled ? ent.maxParticipantsPerEvent : null;
  const seatsUsed = approvedQ.data?.total ?? 0;

  /** Would approving `n` more cross the plan's ceiling? Advisory only — the
   *  server decides, this exists so the organizer sees WHY before it refuses. */
  const exceedsSeats = (n: number): boolean =>
    typeof seatLimit === "number" && seatLimit > 0 && seatsUsed + n > seatLimit;

  // Selection only ever means "these pending people" — a bulk decision on an
  // already-decided row is not an action the API offers.
  const selectablePending = useMemo(() => new Set(rows.filter((r) => r.status === "PENDING").map((r) => r.id)), [rows]);
  const selectedPending = useMemo(() => selected.filter((id) => selectablePending.has(id)), [selected, selectablePending]);

  // Leaving the filter or searching drops a stale selection.
  useEffect(() => setSelected([]), [tab, search]);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onApprove = (id: string): void => {
    if (exceedsSeats(1)) {
      setOverLimit(1);
      return;
    }
    setBusyId(id);
    approve.mutate(id, { onSettled: () => setBusyId(null) });
  };

  /** Rejection asks for a reason instead of a bare yes/no (design 4.8b): the
   *  text is emailed to the person, and «отклонено» with no explanation is the
   *  worst message this product sends. Still optional — a queue of obvious
   *  spam should not need an essay per row. */
  const onReject = (id: string): void => {
    setReason("");
    setRejecting([id]);
  };

  const onLongPress = (id: string): void => {
    if (!selectablePending.has(id)) return;
    haptics.press();
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const onToggleSelect = (id: string): void => {
    if (!selectablePending.has(id)) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onBulkApprove = (): void => {
    if (!selectedPending.length || bulkApprove.isPending) return;
    if (exceedsSeats(selectedPending.length)) {
      setOverLimit(selectedPending.length);
      return;
    }
    haptics.press();
    bulkApprove.mutate(selectedPending, { onSuccess: () => setSelected([]) });
  };
  const onBulkReject = (): void => {
    if (!selectedPending.length || bulkReject.isPending) return;
    setReason("");
    setRejecting(selectedPending);
  };

  /** Commit whatever the reject sheet was opened for — one row or a selection. */
  const confirmReject = (): void => {
    const ids = rejecting ?? [];
    const text = reason.trim() || undefined;
    setRejecting(null);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      setBusyId(ids[0]);
      reject.mutate({ id: ids[0], reason: text }, { onSettled: () => setBusyId(null) });
      return;
    }
    bulkReject.mutate({ ids, reason: text }, { onSuccess: () => setSelected([]) });
  };

  // Near-end pagination — fetch the next page when the scroll approaches bottom.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!q.hasNextPage || q.isFetchingNextPage) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 320) {
      void q.fetchNextPage();
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => backToEvent(router, eventId)} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>{title}</Text>
          <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
            {t("attendees.count", { n: formatNumber(total, lang) })}
          </Text>
        </View>
        <IconBtn name="qr" size={40} onPress={() => router.push({ pathname: "/org/scan", params: { title } })} accessibilityLabel={t("attendees.scan")} />
      </View>

      <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
        <Field placeholder={t("attendees.search")} value={searchInput} onChangeText={setSearchInput} icon="search" />
      </View>

      {/* Status filter — tinted to match the row pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: 12, gap: 7 }}
      >
        {TABS.map(({ key, label }) => {
          const on = tab === key;
          const tone = chipTone(key, p);
          return (
            <AnimatedPressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              haptic="select"
              scaleTo={0.97}
              style={{
                height: 34,
                paddingHorizontal: 14,
                borderRadius: radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? p.inverse : tone.bg,
              }}
            >
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: on ? 600 : 500, size: 12, leading: 1, color: on ? p.fgInverse : tone.fg })}>
                {t(label)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <Body
        contentStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 96, gap: 10 }}
        onScroll={onScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {q.isPending ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}><Spinner /></View>
        ) : q.isError ? (
          <StateBlock icon="alert" tone="error" title={t("state.error.title")} body={t("state.error.body")} action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>} />
        ) : rows.length === 0 ? (
          <StateBlock icon="users" title={t("attendees.empty.title")} body={t(tab === "PENDING" ? "attendees.empty.pending" : "attendees.empty.body")} />
        ) : (
          <>
            {rows.map((r, i) => (
              <AttendeeCard
                key={r.id}
                item={r}
                index={i}
                busy={busyId === r.id}
                selecting={selecting}
                selected={selected.includes(r.id)}
                canDecide={canDecide}
                onApprove={onApprove}
                onReject={onReject}
                onOpen={setSheetItem}
                onToggleSelect={onToggleSelect}
                // Long-press opens BULK moderation; pointless without the right.
                onLongPress={canDecide ? onLongPress : undefined}
              />
            ))}
            {q.isFetchingNextPage ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}><Spinner size={22} /></View>
            ) : null}
          </>
        )}
      </Body>

      {/* Selection bar — the design's ink strip, shown only in selection mode */}
      {selecting ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: gutter,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: p.inverse,
          }}
        >
          <Text style={type({ weight: 600, size: 13, leading: 1.2, color: p.fgInverse })}>
            {t("attendees.selected", { n: selectedPending.length })}
          </Text>
          <View style={{ flex: 1 }} />
          <AnimatedPressable accessibilityRole="button" haptic="tap" scaleTo={0.95} hitSlop={8} onPress={() => setSelected([])}>
            <Text style={type({ weight: 600, size: 13, leading: 1, color: p.fgInverseMuted })}>{t("common.clear")}</Text>
          </AnimatedPressable>
          <Btn size="sm" variant="secondary" loading={bulkReject.isPending} onPress={onBulkReject}>
            {t("attendees.reject")}
          </Btn>
          <Btn size="sm" variant="primary" loading={bulkApprove.isPending} onPress={onBulkApprove}>
            {t("attendees.approve")}
          </Btn>
        </View>
      ) : null}

      <PersonSheet item={sheetItem} onClose={() => setSheetItem(null)} />

      {/* 4.8b · rejection with a reason. The text is emailed to the person, so
          the sheet says so plainly and counts the characters the API accepts. */}
      <BottomSheet visible={!!rejecting} onClose={() => setRejecting(null)} maxHeightRatio={0.7} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 19, leading: 1.2, track: -0.02, color: p.fg })}>
            {rejecting && rejecting.length > 1
              ? t("attendees.bulkReject.message", { n: rejecting.length })
              : t("attendees.reject.title")}
          </Text>

          <Field
            label={t("attendees.reject.reason")}
            value={reason}
            onChangeText={setReason}
            placeholder={t("attendees.reject.reasonPlaceholder")}
            autoCapitalize="sentences"
            multiline
            maxLength={500}
            hint={t("attendees.reject.reasonHint")}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={[type({ weight: 400, size: 11, leading: 1.3, color: p.fgSubtle }), { flexShrink: 1 }]}>
              {t("attendees.reject.optional")}
            </Text>
            <Text style={[type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle }), { fontVariant: ["tabular-nums"] }]}>
              {reason.length}/500
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Btn full size="lg" variant="secondary" onPress={() => setRejecting(null)}>{t("common.cancel")}</Btn>
            </View>
            <View style={{ flex: 1 }}>
              <Btn full size="lg" variant="primary" onPress={confirmReject}>{t("attendees.reject")}</Btn>
            </View>
          </View>
        </View>
      </BottomSheet>

      {/* 4.8b · the plan ceiling. A card, not a toast: a toast says "no" and
          takes the three numbers that explain it away with it. */}
      <BottomSheet visible={overLimit !== null} onClose={() => setOverLimit(null)} maxHeightRatio={0.6} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8 }}>
          {overLimit !== null && typeof seatLimit === "number" ? (
            <LimitPrompt
              tier={ent?.tierKey ?? "—"}
              limit={seatLimit}
              used={seatsUsed}
              requested={overLimit}
              onOpenPlan={() => {
                setOverLimit(null);
                router.push("/org/profile");
              }}
              onDismiss={() => setOverLimit(null)}
            />
          ) : null}
        </View>
      </BottomSheet>
    </Screen>
  );
}
