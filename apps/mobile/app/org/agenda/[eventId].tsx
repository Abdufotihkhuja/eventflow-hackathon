/**
 * 4.x · Event agenda — «Программа» from the web cabinet, at phone scale.
 *
 * The day grouping is the whole point: a one-day event reads as a single
 * timeline, a three-day one as three, and an item's room and speakers ride
 * along on its own row rather than in a detail sheet nobody opens while
 * standing in a hallway.
 *
 * Editing is a bottom sheet with the four fields that actually change on a
 * phone (title, description, start, duration). Room assignment and reordering
 * stay in the web cabinet — see the entity module for why.
 */
import { useCallback, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AGENDA_TYPES,
  groupByDay,
  speakerName,
  toApiDate,
  toApiTime,
  useAgendaQuery,
  useCreateAgendaItemMutation,
  useDeleteAgendaItemMutation,
  useUpdateAgendaItemMutation,
  type AgendaItem,
  type AgendaItemType,
} from "@entities/agenda";
import { useCanEditEvent, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { formatDateStamp } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, BottomSheet, Btn, DateTimeField, EventSectionRail, Field, Icon, IconBtn, Screen, Skeleton, StateBlock, useMutationError } from "@shared/ui";

/** Draft state of the edit sheet. `id` absent = creating. */
interface Draft {
  id?: string;
  title: string;
  description: string;
  /** Date and time are separate pickers — `DateTimeField` does one or the
   *  other, and the event form splits them the same way. */
  date: Date | null;
  time: Date | null;
  duration: string;
  type: AgendaItemType;
}

function emptyDraft(): Draft {
  return { title: "", description: "", date: null, time: null, duration: "60", type: "PRESENTATION" };
}

function toDraft(item: AgendaItem): Draft {
  // `date` + `startTime` are wall-clock strings; build the pickers' Dates from
  // their parts so no timezone conversion ever touches them.
  const [y, m, d] = item.date.split("-").map(Number);
  const [hh, mm] = item.startTime.split(":").map(Number);
  const day = Number.isFinite(y) ? new Date(y, (m ?? 1) - 1, d ?? 1) : null;
  const time = Number.isFinite(hh) ? new Date(2000, 0, 1, hh, mm ?? 0) : null;
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    date: day,
    time,
    duration: String(item.duration ?? 60),
    type: item.type ?? "PRESENTATION",
  };
}

function AgendaRow({
  item,
  index,
  onEdit,
  onDelete,
}: {
  item: AgendaItem;
  index: number;
  /** Absent for a read-only member — the row then just reads. */
  onEdit?: () => void;
  onDelete?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const speakers = (item.speakers ?? []).map(speakerName).filter(Boolean);

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        haptic="tap"
        scaleTo={0.99}
        onPress={onEdit}
        onLongPress={onDelete}
        style={{ flexDirection: "row", gap: 12, paddingVertical: 13 }}
      >
        {/* Time column — the spine of a timeline. */}
        <View style={{ width: 58, alignItems: "flex-start", gap: 3 }}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[type({ role: "mono", weight: 600, size: 13, leading: 1, color: p.fg }), { fontVariant: ["tabular-nums"] }]}
          >
            {item.startTime}
          </Text>
          {item.duration ? (
            <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
              {t("org.agenda.minutes", { n: item.duration })}
            </Text>
          ) : null}
        </View>

        <View style={{ width: 1, backgroundColor: p.borderSubtle }} />

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 15, leading: 1.25, track: -0.015, color: p.fg })}>
            {item.title}
          </Text>
          {item.description ? (
            <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.4, color: p.fgMuted })}>
              {item.description}
            </Text>
          ) : null}
          {speakers.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Icon name="users" size={13} sw={2} color={p.fgSubtle} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 12.5, leading: 1.3, color: p.fgDefault }), { flex: 1 }]}>
                {speakers.join(", ")}
              </Text>
            </View>
          ) : null}
          {item.room?.name ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="pin" size={13} sw={2} color={p.fgSubtle} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12.5, leading: 1.3, color: p.fgDefault })}>
                {item.room.name}
              </Text>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function OrgAgenda(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [sheet, setSheet] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ title?: string; start?: string }>({});
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = useCanEditEvent();
  const query = useAgendaQuery(eventId);
  const createM = useCreateAgendaItemMutation(eventId);
  const updateM = useUpdateAgendaItemMutation(eventId);
  const deleteM = useDeleteAgendaItemMutation(eventId);
  const onError = useMutationError();

  const days = useMemo(() => groupByDay(query.data ?? []), [query.data]);
  const busy = createM.isPending || updateM.isPending;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const onSave = (): void => {
    if (!sheet) return;
    const next: typeof errors = {};
    if (!sheet.title.trim()) next.title = t("org.agenda.err.title");
    if (!sheet.date) next.start = t("org.agenda.err.start");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      haptics.error();
      return;
    }
    const payload = {
      title: sheet.title.trim(),
      description: sheet.description.trim() || undefined,
      type: sheet.type,
      date: toApiDate(sheet.date as Date),
      startTime: sheet.time ? toApiTime(sheet.time) : "09:00",
      // The API requires a positive duration; the sheet defaults it to an hour.
      duration: Math.max(1, Number(sheet.duration) || 60),
    };
    const done = (): void => {
      haptics.success();
      setSheet(null);
      setErrors({});
    };
    if (sheet.id) updateM.mutate({ id: sheet.id, ...payload }, { onSuccess: done, onError });
    else createM.mutate(payload, { onSuccess: done, onError });
  };

  const onDelete = (item: AgendaItem): void => {
    confirm({
      title: t("org.agenda.delete.title"),
      message: t("org.agenda.delete.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => deleteM.mutate(item.id, { onError }),
    });
  };

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
            {t("org.section.agenda")}
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
        {/* Offered only to a member who may actually change the event —
            the server refuses the rest, and a button that always fails is
            worse than no button. */}
        {canEdit ? (
          <IconBtn
            name="plus"
            size={40}
            active
            onPress={() => {
              setErrors({});
              setSheet(emptyDraft());
            }}
            accessibilityLabel={t("org.agenda.add")}
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="agenda" />
      </View>

      <Body
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 12, paddingTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={72} r={radii.card} />
            ))}
          </View>
        ) : query.isError ? (
          <View style={{ paddingVertical: 40 }}>
            <StateBlock
              icon="alert"
              tone="error"
              title={t("state.error.title")}
              body={t("state.error.body")}
              action={<Btn size="md" variant="secondary" onPress={() => query.refetch()}>{t("common.retry")}</Btn>}
            />
          </View>
        ) : days.length === 0 ? (
          <View style={{ paddingVertical: 36 }}>
            <StateBlock
              icon="cal"
              title={t("org.agenda.empty.title")}
              body={t("org.agenda.empty.body")}
              action={
                canEdit ? (
                  <Btn size="md" variant="primary" icon="plus" onPress={() => { setErrors({}); setSheet(emptyDraft()); }}>
                    {t("org.agenda.add")}
                  </Btn>
                ) : undefined
              }
            />
          </View>
        ) : (
          <View style={{ gap: 22, paddingTop: 4 }}>
            {days.map((day, di) => (
              <View key={day.date} style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 4 }}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}
                  >
                    {days.length > 1 ? t("org.agenda.day", { n: di + 1 }) : formatDateStamp(day.date, lang)}
                  </Text>
                  {days.length > 1 ? (
                    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1, color: p.fgSubtle })}>
                      {formatDateStamp(day.date, lang)}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    borderRadius: radii.card,
                    borderWidth: 1,
                    borderColor: p.border,
                    backgroundColor: p.surface,
                    paddingHorizontal: 14,
                  }}
                >
                  {day.items.map((item, i) => (
                    <View key={item.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: p.borderSubtle } : undefined}>
                      <AgendaRow
                        item={item}
                        index={i}
                        onEdit={canEdit ? () => { setErrors({}); setSheet(toDraft(item)); } : undefined}
                        onDelete={canEdit ? () => onDelete(item) : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </Body>

      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} maxHeightRatio={0.9} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
            {sheet?.id ? t("org.agenda.form.edit") : t("org.agenda.form.new")}
          </Text>

          <Field
            label={t("org.agenda.field.title")}
            required
            value={sheet?.title ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, title: v } : s))}
            error={errors.title}
            autoCapitalize="sentences"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                mode="date"
                label={t("org.agenda.field.start")}
                value={sheet?.date ?? null}
                onChange={(d) => setSheet((s) => (s ? { ...s, date: d } : s))}
                error={errors.start}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField
                mode="time"
                label={t("org.form.time")}
                value={sheet?.time ?? null}
                onChange={(d) => setSheet((s) => (s ? { ...s, time: d } : s))}
              />
            </View>
          </View>
          {/* Type is required by the API and changes how the item reads on the
              public page — a break is not a keynote. */}
          <View style={{ gap: 8 }}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" })}
            >
              {t("org.agenda.field.type")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {AGENDA_TYPES.map((k) => {
                const on = sheet?.type === k;
                return (
                  <AnimatedPressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    haptic="select"
                    scaleTo={0.96}
                    onPress={() => setSheet((s) => (s ? { ...s, type: k } : s))}
                    style={{
                      paddingHorizontal: 12,
                      height: 34,
                      justifyContent: "center",
                      borderRadius: radii.pill,
                      backgroundColor: on ? accent.base : p.surface,
                      borderWidth: on ? 0 : 1,
                      borderColor: p.border,
                    }}
                  >
                    <Text
                      maxFontSizeMultiplier={1.2}
                      style={type({ weight: on ? 600 : 500, size: 12.5, leading: 1, color: on ? accent.on : p.fgDefault })}
                    >
                      {t(`org.agenda.type.${k}` as never)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <Field
            label={t("org.agenda.field.duration")}
            value={sheet?.duration ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, duration: v.replace(/[^0-9]/g, "") } : s))}
            keyboardType="number-pad"
          />
          <Field
            label={t("org.agenda.field.description")}
            value={sheet?.description ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, description: v } : s))}
            multiline
            numberOfLines={3}
            maxLength={1000}
            autoCapitalize="sentences"
          />

          <Btn full size="lg" variant="primary" loading={busy} onPress={onSave}>
            {t("common.save")}
          </Btn>
        </View>
      </BottomSheet>
    </Screen>
  );
}
