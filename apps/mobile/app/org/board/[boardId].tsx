/**
 * 4.20 / 4.20b · Kanban on a phone.
 *
 * The design's core call: drag-and-drop across a miniature board does not work
 * on a phone, so it shows ONE COLUMN AT A TIME with a pager above it, and
 * moving a card is an explicit choice rather than a drag. That is what this is.
 *
 * Moving is optimistic (see `useMoveTaskMutation`) — the card lands the instant
 * you pick a column, and rolls back if the PATCH fails. A board where cards
 * lag behind your finger reads as broken even when it is merely honest.
 *
 * The task sheet (4.20b) shows checklists as PROGRESS, not as editable rows:
 * checklist items live behind their own `tasks/:id/checklists` endpoints, and
 * a half-wired editor that silently drops ticks would be worse than a readout.
 * Due date, priority and assignees come straight off the task payload.
 */
import { useMemo, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useBoardColumnsQuery,
  useBoardTasksQuery,
  useMoveTaskMutation,
  useUpdateTaskMutation,
  type BoardTask,
  type TaskPriority,
} from "@entities/boards";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { goBack } from "@shared/lib/go-back";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette, type Palette } from "@shared/theme";
import { Avatar, Body, BottomSheet, Btn, Icon, IconBtn, Screen, Skeleton, StateBlock, Tag, useToast } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const PRIORITY_LABEL: Record<TaskPriority, StringKey> = {
  LOW: "org.board.priority.LOW",
  MEDIUM: "org.board.priority.MEDIUM",
  HIGH: "org.board.priority.HIGH",
  URGENT: "org.board.priority.URGENT",
};

function priorityTone(pr: TaskPriority, p: Palette): { bg: string; fg: string } {
  switch (pr) {
    case "URGENT":
      return { bg: p.dangerSoft, fg: p.dangerSoftFg };
    case "HIGH":
      return { bg: accent.soft, fg: accent.ink };
    case "LOW":
      return { bg: p.sunken, fg: p.fgMuted };
    default:
      return { bg: p.sunken, fg: p.fgDefault };
  }
}

function assigneeName(a: { firstName?: string | null; lastName?: string | null }): string {
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
}

/** Checklist progress if the payload carried one. */
function checklistProgress(task: BoardTask): { done: number; total: number } | null {
  if (!task.checklists?.length) return null;
  let done = 0;
  let total = 0;
  for (const c of task.checklists) {
    for (const i of c.items ?? []) {
      total += 1;
      if (i.isCompleted) done += 1;
    }
  }
  return total > 0 ? { done, total } : null;
}

function TaskCard({ task, index, onOpen }: { task: BoardTask; index: number; onOpen: (t: BoardTask) => void }): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const tone = priorityTone(task.priority, p);
  const progress = checklistProgress(task);
  const overdue = !!task.dueDate && !task.isCompleted && new Date(task.dueDate).getTime() < Date.now();

  return (
    <Animated.View entering={index < 10 ? enterStagger(Math.min(index, 5)) : undefined} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={task.title}
        haptic="tap"
        scaleTo={0.985}
        onPress={() => onOpen(task)}
        style={{
          padding: 13,
          borderRadius: radii.card,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.border,
          gap: 9,
          opacity: task.isCompleted ? 0.6 : 1,
        }}
      >
        <Text
          numberOfLines={3}
          maxFontSizeMultiplier={1.3}
          style={type({
            weight: 600,
            size: 14,
            leading: 1.3,
            color: p.fg,
            ...(task.isCompleted ? { decoration: "line-through" as never } : null),
          })}
        >
          {task.title}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          {task.priority !== "MEDIUM" ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: tone.bg }}>
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 10, leading: 1, track: 0.04, color: tone.fg, transform: "uppercase" })}>
                {t(PRIORITY_LABEL[task.priority])}
              </Text>
            </View>
          ) : null}
          {progress ? (
            <Tag tone={progress.done === progress.total ? "forest" : "neutral"}>
              {progress.done}/{progress.total}
            </Tag>
          ) : null}
          {task.dueDate ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={12} sw={2} color={overdue ? p.danger : p.fgSubtle} />
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 500, size: 11, leading: 1, color: overdue ? p.danger : p.fgMuted })}>
                {formatDateStamp(task.dueDate, lang)}
              </Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {(task.assignees ?? []).slice(0, 3).map((a, i) => (
            <View key={a.id ?? a.userId ?? i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar initials={(assigneeName(a)[0] ?? "?").toUpperCase()} size={22} hue={(assigneeName(a).charCodeAt(0) || 65) * 7} />
            </View>
          ))}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function BoardScreen(): React.JSX.Element {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const toast = useToast();
  const params = useLocalSearchParams<{ boardId?: string; title?: string }>();
  const boardId = typeof params.boardId === "string" ? params.boardId : "";
  const boardName = typeof params.title === "string" ? params.title : t("org.board.title");

  const [colIndex, setColIndex] = useState(0);
  const [openTask, setOpenTask] = useState<BoardTask | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const columnsQ = useBoardColumnsQuery(boardId || undefined);
  const tasksQ = useBoardTasksQuery(boardId || undefined);
  const moveM = useMoveTaskMutation(boardId || undefined);
  const updateM = useUpdateTaskMutation(boardId || undefined);

  const columns = useMemo(() => columnsQ.data ?? [], [columnsQ.data]);
  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data]);

  const activeColumn = columns[Math.min(colIndex, Math.max(0, columns.length - 1))];
  const columnTasks = useMemo(
    () => tasks.filter((x) => x.columnId === activeColumn?.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [tasks, activeColumn],
  );

  const countFor = (columnId: string): number => tasks.filter((x) => x.columnId === columnId).length;

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([columnsQ.refetch(), tasksQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const move = (task: BoardTask, columnId: string): void => {
    setOpenTask(null);
    haptics.select();
    moveM.mutate(
      { taskId: task.id, columnId },
      { onError: () => toast.show(t("org.board.moveError")) },
    );
  };

  const toggleDone = (task: BoardTask): void => {
    haptics.select();
    setOpenTask(null);
    updateM.mutate(
      { taskId: task.id, patch: { isCompleted: !task.isCompleted } },
      { onError: () => toast.show(t("org.board.moveError")) },
    );
  };

  const wipExceeded = !!activeColumn?.wipLimit && columnTasks.length > activeColumn.wipLimit;

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconBtn name="cleft" size={40} onPress={() => goBack(router, "/org")} accessibilityLabel={t("a11y.back")} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ weight: 700, size: 17, leading: 1.2, track: -0.02, color: p.fg })}>
            {boardName}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 11, leading: 1.2, color: p.fgMuted })}>
            {t("org.board.tasksCount", { n: tasks.length })}
          </Text>
        </View>
      </View>

      {/* Column pager — one column on screen, the rest a tap away */}
      {columns.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 14, paddingBottom: 12, gap: 8 }}
        >
          {columns.map((c, i) => {
            const on = i === colIndex;
            return (
              <AnimatedPressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                haptic="select"
                scaleTo={0.97}
                onPress={() => setColIndex(i)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  height: 34,
                  paddingHorizontal: 13,
                  borderRadius: radii.pill,
                  backgroundColor: on ? p.inverse : p.sunken,
                }}
              >
                {c.color ? <View style={{ width: 7, height: 7, borderRadius: radii.pill, backgroundColor: c.color }} /> : null}
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: on ? 600 : 500, size: 13, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                  {c.name}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    type({ role: "mono", weight: 600, size: 11, leading: 1, color: on ? p.fgInverseMuted : p.fgSubtle }),
                    { fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {countFor(c.id)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* WIP limit — a column rule the board itself declares, so honour it */}
      {wipExceeded ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            marginHorizontal: gutter,
            marginBottom: 12,
            padding: 11,
            borderRadius: radii.control,
            backgroundColor: p.warningSoft,
          }}
        >
          <Icon name="alert" size={15} sw={2} color={p.warning} />
          <Text style={[type({ weight: 500, size: 12, leading: 1.35, color: p.warning }), { flex: 1 }]}>
            {t("org.board.wip", { n: activeColumn?.wipLimit ?? 0 })}
          </Text>
        </View>
      ) : null}

      <Body
        contentStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {columnsQ.isPending || tasksQ.isPending ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={96} r={radii.card} />
            ))}
          </View>
        ) : columnsQ.isError || tasksQ.isError ? (
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => void onRefresh()}>{t("common.retry")}</Btn>}
          />
        ) : columns.length === 0 ? (
          <StateBlock icon="grid" title={t("org.board.noColumns.title")} body={t("org.board.noColumns.body")} />
        ) : columnTasks.length === 0 ? (
          <StateBlock icon="check" title={t("org.board.emptyColumn.title")} body={t("org.board.emptyColumn.body", { name: activeColumn?.name ?? "" })} />
        ) : (
          columnTasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} onOpen={setOpenTask} />)
        )}
      </Body>

      {/* 4.20b · task sheet */}
      <BottomSheet visible={!!openTask} onClose={() => setOpenTask(null)} maxHeightRatio={0.85} closeLabel={t("common.close")}>
        {openTask ? (
          <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 16 }}>
            <Text style={type({ role: "display", weight: 700, size: 19, leading: 1.25, track: -0.02, color: p.fg })}>{openTask.title}</Text>

            {openTask.description ? (
              <Text style={type({ weight: 400, size: 14, leading: 1.55, color: p.fgDefault })}>{openTask.description}</Text>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Tag tone={openTask.priority === "URGENT" ? "danger" : "neutral"}>{t(PRIORITY_LABEL[openTask.priority])}</Tag>
              {openTask.dueDate ? <Tag>{formatDateStamp(openTask.dueDate, lang)}</Tag> : null}
              {checklistProgress(openTask) ? (
                <Tag tone="forest">
                  {checklistProgress(openTask)?.done}/{checklistProgress(openTask)?.total}
                </Tag>
              ) : null}
            </View>

            {(openTask.assignees ?? []).length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}>
                  {t("org.board.assignees")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {(openTask.assignees ?? []).map((a, i) => (
                    <View key={a.id ?? a.userId ?? i} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Avatar initials={(assigneeName(a)[0] ?? "?").toUpperCase()} size={24} hue={(assigneeName(a).charCodeAt(0) || 65) * 7} />
                      <Text style={type({ weight: 500, size: 13, leading: 1, color: p.fgDefault })}>{assigneeName(a) || "—"}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Move — the phone replacement for dragging */}
            <View style={{ gap: 8 }}>
              <Text style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.1, color: p.fgMuted, transform: "uppercase" })}>
                {t("org.board.moveTo")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {columns
                  .filter((c) => c.id !== openTask.columnId)
                  .map((c) => (
                    <AnimatedPressable
                      key={c.id}
                      accessibilityRole="button"
                      haptic="tap"
                      scaleTo={0.96}
                      onPress={() => move(openTask, c.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                        paddingHorizontal: 13,
                        height: 38,
                        borderRadius: radii.pill,
                        backgroundColor: p.surface,
                        borderWidth: 1,
                        borderColor: p.border,
                      }}
                    >
                      {c.color ? <View style={{ width: 7, height: 7, borderRadius: radii.pill, backgroundColor: c.color }} /> : null}
                      <Text style={type({ weight: 600, size: 13, leading: 1, color: p.fgDefault })}>{c.name}</Text>
                      <Icon name="aright" size={14} sw={2} color={p.fgSubtle} />
                    </AnimatedPressable>
                  ))}
              </View>
            </View>

            <Btn full size="lg" variant={openTask.isCompleted ? "secondary" : "primary"} icon="check" onPress={() => toggleDone(openTask)}>
              {t(openTask.isCompleted ? "org.board.reopen" : "org.board.markDone")}
            </Btn>
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
