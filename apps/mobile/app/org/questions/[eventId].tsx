/**
 * 4.x · Registration questions — «Вопросы регистрации» at phone scale.
 *
 * The web tab is a two-step wizard with a live preview. On a phone that becomes
 * one sheet, because the thing an organizer does here from a phone is add a
 * missing question the morning registrations open — not design a test.
 *
 * The category drives the form, not the type: CLOSED and ALTERNATIVE need
 * options (the server refuses them without), RHETORICAL collects no answer at
 * all and carries a notice instead. Getting that wrong is the one way this
 * screen can silently fail to save, so the form shows exactly the fields the
 * chosen category actually accepts.
 *
 * Order is edited one step at a time — the reorder endpoint takes a whole
 * ordered list, and drag-and-drop on a phone list fights the scroller.
 */
import { useCallback, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  QUESTION_CATEGORIES,
  QUESTION_TYPES,
  needsOptions,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useQuestionsQuery,
  useReorderQuestionsMutation,
  useUpdateQuestionMutation,
  type EventQuestion,
  type QuestionCategory,
  type QuestionType,
} from "@entities/event-questions";
import { useCanEditEvent, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, BottomSheet, Btn, EventSectionRail, Field, Icon, IconBtn, Screen, Skeleton, StateBlock, useMutationError } from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

const CATEGORY_LABEL: Record<QuestionCategory, StringKey> = {
  OPEN: "org.questions.cat.OPEN",
  CLOSED: "org.questions.cat.CLOSED",
  ALTERNATIVE: "org.questions.cat.ALTERNATIVE",
  RHETORICAL: "org.questions.cat.RHETORICAL",
};

const TYPE_LABEL: Record<QuestionType, StringKey> = {
  TEXT: "org.questions.type.TEXT",
  TEXTAREA: "org.questions.type.TEXTAREA",
  NUMBER: "org.questions.type.NUMBER",
  SELECT: "org.questions.type.SELECT",
  CHECKBOX: "org.questions.type.CHECKBOX",
  FILE_UPLOAD: "org.questions.type.FILE_UPLOAD",
};

/** Type choices that make sense for a category — CLOSED is a two-option
 *  SELECT, and RHETORICAL asks nothing, so neither offers a type picker. */
function typesFor(category: QuestionCategory): QuestionType[] {
  if (category === "ALTERNATIVE") return ["SELECT", "CHECKBOX"];
  if (category === "OPEN") return ["TEXT", "TEXTAREA", "NUMBER", "FILE_UPLOAD"];
  return [];
}

interface Draft {
  id?: string;
  question: string;
  category: QuestionCategory;
  type: QuestionType;
  isRequired: boolean;
  options: string;
  informationalText: string;
}

function emptyDraft(): Draft {
  return {
    question: "",
    category: "OPEN",
    type: "TEXT",
    isRequired: false,
    options: "",
    informationalText: "",
  };
}

function toDraft(q: EventQuestion): Draft {
  return {
    id: q.id,
    question: q.question,
    category: q.category,
    type: q.type,
    isRequired: Boolean(q.isRequired),
    options: (q.options ?? []).join("\n"),
    informationalText: q.informationalText ?? "",
  };
}

/** Default type for a category, applied when the category changes. */
function defaultType(category: QuestionCategory): QuestionType {
  if (category === "CLOSED") return "SELECT";
  if (category === "ALTERNATIVE") return "SELECT";
  if (category === "RHETORICAL") return "TEXT";
  return "TEXT";
}

function Chip({
  on,
  label,
  onPress,
}: {
  on: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      haptic="select"
      scaleTo={0.96}
      onPress={onPress}
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
      <Text maxFontSizeMultiplier={1.2} style={type({ weight: on ? 600 : 500, size: 12.5, leading: 1, color: on ? accent.on : p.fgDefault })}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function QuestionRow({
  q,
  index,
  first,
  last,
  onEdit,
  onDelete,
  onMove,
}: {
  q: EventQuestion;
  index: number;
  first: boolean;
  last: boolean;
  /** Absent for a read-only member — the row then just reads. */
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (dir: -1 | 1) => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t } = useI18n();

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={q.question}
        haptic="tap"
        scaleTo={0.99}
        onPress={onEdit}
        onLongPress={onDelete}
        style={{
          flexDirection: "row",
          gap: 12,
          padding: 14,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: p.surface,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={[type({ role: "mono", weight: 600, size: 13, leading: 1.3, color: p.fgSubtle }), { width: 20, fontVariant: ["tabular-nums"] }]}
        >
          {index + 1}
        </Text>

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14.5, leading: 1.3, color: p.fg })}>
            {q.question}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 11.5, leading: 1, color: p.fgMuted })}>
              {t(CATEGORY_LABEL[q.category])}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 11.5, leading: 1, color: p.border })}>
              ·
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 11.5, leading: 1, color: p.fgMuted })}>
              {t(TYPE_LABEL[q.type])}
            </Text>
            {q.isRequired ? (
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 11.5, leading: 1, color: accent.base })}>
                {t("org.questions.required")}
              </Text>
            ) : null}
            {q.points ? (
              <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 11.5, leading: 1, color: p.fgDefault })}>
                {t("org.questions.points", { n: q.points })}
              </Text>
            ) : null}
          </View>
          {q.options && q.options.length > 0 ? (
            <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12.5, leading: 1.35, color: p.fgSubtle })}>
              {q.options.join(" · ")}
            </Text>
          ) : null}
        </View>

        {/* One step at a time — see the file header. */}
        <View style={{ gap: 2, justifyContent: "center" }}>
          {/* The end of the list simply has no arrow — a dimmed one that does
              nothing teaches less than its absence. */}
          {!onMove || first ? <View style={{ width: 30, height: 30 }} /> : (
            <IconBtn name="cup" size={30} onPress={() => onMove(-1)} accessibilityLabel={t("org.questions.moveUp")} />
          )}
          {!onMove || last ? <View style={{ width: 30, height: 30 }} /> : (
            <IconBtn name="cdown" size={30} onPress={() => onMove(1)} accessibilityLabel={t("org.questions.moveDown")} />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function OrgQuestions(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  const [sheet, setSheet] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ question?: string; options?: string }>({});
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = useCanEditEvent();
  const query = useQuestionsQuery(eventId);
  const createM = useCreateQuestionMutation(eventId);
  const updateM = useUpdateQuestionMutation(eventId);
  const deleteM = useDeleteQuestionMutation(eventId);
  const reorderM = useReorderQuestionsMutation(eventId);
  const onError = useMutationError();

  const rows = query.data ?? [];
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
    const opts = sheet.options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    const next: typeof errors = {};
    if (!sheet.question.trim()) next.question = t("org.questions.err.question");
    if (needsOptions(sheet.category, sheet.type) && opts.length < 1) next.options = t("org.questions.err.options");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      haptics.error();
      return;
    }

    const payload = {
      question: sheet.question.trim(),
      category: sheet.category,
      type: sheet.type,
      isRequired: sheet.isRequired,
      options: needsOptions(sheet.category, sheet.type) ? opts : undefined,
      informationalText: sheet.category === "RHETORICAL" ? sheet.informationalText.trim() || undefined : undefined,
    };
    const done = (): void => {
      haptics.success();
      setSheet(null);
      setErrors({});
    };
    if (sheet.id) updateM.mutate({ id: sheet.id, ...payload }, { onSuccess: done, onError });
    else createM.mutate(payload, { onSuccess: done, onError });
  };

  const onDelete = (q: EventQuestion): void => {
    confirm({
      title: t("org.questions.delete.title"),
      message: t("org.questions.delete.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => deleteM.mutate(q.id, { onError }),
    });
  };

  const onMove = (index: number, dir: -1 | 1): void => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    haptics.select();
    reorderM.mutate(next.map((q) => q.id), { onError });
  };

  const gate = useWorkspaceGate();
  if (gate) return gate;

  const showOptions = sheet ? needsOptions(sheet.category, sheet.type) : false;
  const typeChoices = sheet ? typesFor(sheet.category) : [];

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
            {t("org.section.questions")}
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
        {canEdit ? (
          <IconBtn name="plus" size={40} active onPress={() => { setErrors({}); setSheet(emptyDraft()); }} accessibilityLabel={t("org.questions.add")} />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="questions" />
      </View>

      <Body
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={86} r={radii.card} />
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
        ) : rows.length === 0 ? (
          <View style={{ paddingVertical: 36 }}>
            <StateBlock
              icon="doc"
              title={t("org.questions.empty.title")}
              body={t("org.questions.empty.body")}
              action={
                canEdit ? (
                  <Btn size="md" variant="primary" icon="plus" onPress={() => { setErrors({}); setSheet(emptyDraft()); }}>
                    {t("org.questions.add")}
                  </Btn>
                ) : undefined
              }
            />
          </View>
        ) : (
          <View style={{ gap: 10, paddingTop: 4 }}>
            {rows.map((q, i) => (
              <QuestionRow
                key={q.id}
                q={q}
                index={i}
                first={i === 0}
                last={i === rows.length - 1}
                onEdit={canEdit ? () => { setErrors({}); setSheet(toDraft(q)); } : undefined}
                onDelete={canEdit ? () => onDelete(q) : undefined}
                onMove={canEdit ? (dir) => onMove(i, dir) : undefined}
              />
            ))}
          </View>
        )}
      </Body>

      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} maxHeightRatio={0.92} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
            {sheet?.id ? t("org.questions.form.edit") : t("org.questions.form.new")}
          </Text>

          <Field
            label={t("org.questions.field.question")}
            required
            value={sheet?.question ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, question: v } : s))}
            error={errors.question}
            multiline
            numberOfLines={2}
            maxLength={500}
            autoCapitalize="sentences"
          />

          <View style={{ gap: 8 }}>
            <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" })}>
              {t("org.questions.field.category")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {QUESTION_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  on={sheet?.category === c}
                  label={t(CATEGORY_LABEL[c])}
                  onPress={() => setSheet((s) => (s ? { ...s, category: c, type: defaultType(c) } : s))}
                />
              ))}
            </View>
          </View>

          {typeChoices.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 11, leading: 1, track: 0.04, color: p.fgMuted, transform: "uppercase" })}>
                {t("org.questions.field.type")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {typeChoices.map((k) => (
                  <Chip
                    key={k}
                    on={sheet?.type === k}
                    label={t(TYPE_LABEL[k])}
                    onPress={() => setSheet((s) => (s ? { ...s, type: k } : s))}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {showOptions ? (
            <Field
              label={t("org.questions.field.options")}
              required
              value={sheet?.options ?? ""}
              onChangeText={(v) => setSheet((s) => (s ? { ...s, options: v } : s))}
              error={errors.options}
              hint={t("org.questions.field.optionsHint")}
              multiline
              numberOfLines={4}
              maxLength={1000}
              autoCapitalize="sentences"
            />
          ) : null}

          {sheet?.category === "RHETORICAL" ? (
            <Field
              label={t("org.questions.field.info")}
              value={sheet?.informationalText ?? ""}
              onChangeText={(v) => setSheet((s) => (s ? { ...s, informationalText: v } : s))}
              multiline
              numberOfLines={3}
              maxLength={1000}
              autoCapitalize="sentences"
            />
          ) : (
            <AnimatedPressable
              accessibilityRole="switch"
              accessibilityState={{ checked: sheet?.isRequired }}
              haptic="select"
              scaleTo={0.98}
              onPress={() => setSheet((s) => (s ? { ...s, isRequired: !s.isRequired } : s))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: 13,
                borderRadius: radii.control,
                borderWidth: 1,
                borderColor: p.border,
                backgroundColor: p.surface,
              }}
            >
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 500, size: 14, leading: 1.2, color: p.fg })}>
                {t("org.questions.field.required")}
              </Text>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: sheet?.isRequired ? accent.base : "transparent",
                  borderWidth: sheet?.isRequired ? 0 : 1.5,
                  borderColor: p.borderStrong,
                }}
              >
                {sheet?.isRequired ? <Icon name="check" size={14} sw={3} color={accent.on} /> : null}
              </View>
            </AnimatedPressable>
          )}

          <Btn full size="lg" variant="primary" loading={busy} onPress={onSave}>
            {t("common.save")}
          </Btn>
        </View>
      </BottomSheet>
    </Screen>
  );
}
