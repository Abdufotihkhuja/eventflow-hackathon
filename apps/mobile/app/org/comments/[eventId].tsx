/**
 * 4.x · Event comments — «Комментарии» from the web cabinet, at phone scale.
 *
 * This is a moderation screen, not a feed: the organizer reads what guests are
 * asking, answers as the organization (the badge on those replies is why the
 * answer carries weight), and removes what should not stand. Replies are
 * indented one level and no further — a phone column has no room for a thread
 * that keeps nesting, and the API does not nest deeper in practice.
 */
import { useCallback, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  commentAuthorName,
  flattenThread,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useEventCommentsQuery,
  useUpdateCommentMutation,
  type EventComment,
} from "@entities/event-comments";
import { useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { confirm } from "@shared/lib/confirm";
import { formatDateStamp, formatTime } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, crossFadeLayout, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import { backToEvent, Body, BottomSheet, Btn, EventSectionRail, Field, IconBtn, Screen, Skeleton, StateBlock, useMutationError } from "@shared/ui";

function CommentRow({
  comment,
  depth,
  index,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: EventComment;
  depth: 0 | 1;
  index: number;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, lang } = useI18n();
  const fromOrg = Boolean(comment.authorOrganizationId);
  const edited = comment.updatedAt && comment.updatedAt !== comment.createdAt;

  return (
    <Animated.View entering={enterStagger(Math.min(index, 5))} layout={crossFadeLayout()}>
      <View
        style={{
          marginLeft: depth === 1 ? 22 : 0,
          padding: 13,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: fromOrg ? accent.base : p.border,
          backgroundColor: p.surface,
          gap: 7,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 13.5, leading: 1.2, color: p.fg }), { flexShrink: 1 }]}>
            {commentAuthorName(comment)}
          </Text>
          {/* The badge is the point: a guest must be able to tell the event's
              own answer from another guest's opinion. */}
          {fromOrg ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: accent.soft }}>
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 10, leading: 1, color: accent.base })}>
                {t("org.comments.byOrganizer")}
              </Text>
            </View>
          ) : null}
          <Text maxFontSizeMultiplier={1.2} style={[type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle }), { marginLeft: "auto" }]}>
            {`${formatDateStamp(comment.createdAt, lang)}, ${formatTime(comment.createdAt, lang)}`}
          </Text>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 14, leading: 1.45, color: p.fgDefault })}>
          {comment.content}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 1 }}>
          {depth === 0 ? (
            <AnimatedPressable accessibilityRole="button" haptic="tap" hitSlop={8} onPress={onReply}>
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 12, leading: 1, color: accent.base })}>
                {t("org.comments.reply")}
              </Text>
            </AnimatedPressable>
          ) : null}
          {/* Only the organization's own comments are editable — the API
              refuses anything else, so offering it would be a lie. */}
          {fromOrg ? (
            <AnimatedPressable accessibilityRole="button" haptic="tap" hitSlop={8} onPress={onEdit}>
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 12, leading: 1, color: p.fgMuted })}>
                {t("common.edit")}
              </Text>
            </AnimatedPressable>
          ) : null}
          <AnimatedPressable accessibilityRole="button" haptic="tap" hitSlop={8} onPress={onDelete}>
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 500, size: 12, leading: 1, color: p.danger })}>
              {t("common.delete")}
            </Text>
          </AnimatedPressable>
          {edited ? (
            <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
              {t("org.comments.edited")}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function OrgComments(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ eventId?: string; title?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const title = typeof params.title === "string" ? params.title : "";

  /** `reply` carries the parent id; `edit` carries the comment being changed. */
  const [sheet, setSheet] = useState<{ mode: "new" | "reply" | "edit"; id?: string; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const query = useEventCommentsQuery(eventId);
  const createM = useCreateCommentMutation(eventId);
  const updateM = useUpdateCommentMutation(eventId);
  const deleteM = useDeleteCommentMutation(eventId);
  const onError = useMutationError();

  const rows = useMemo(() => flattenThread(query.data ?? []), [query.data]);
  const busy = createM.isPending || updateM.isPending;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const onSend = (): void => {
    if (!sheet) return;
    const text = sheet.text.trim();
    if (!text) {
      haptics.error();
      return;
    }
    const done = (): void => {
      haptics.success();
      setSheet(null);
    };
    if (sheet.mode === "edit" && sheet.id) updateM.mutate({ id: sheet.id, content: text }, { onSuccess: done, onError });
    else createM.mutate({ content: text, parentId: sheet.mode === "reply" ? sheet.id : undefined }, { onSuccess: done, onError });
  };

  const onDelete = (c: EventComment): void => {
    confirm({
      title: t("org.comments.delete.title"),
      message: t("org.comments.delete.body"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      destructive: true,
      onConfirm: () => deleteM.mutate(c.id, { onError }),
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
            {t("org.section.comments")}
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
        <IconBtn
          name="plus"
          size={40}
          active
          onPress={() => setSheet({ mode: "new", text: "" })}
          accessibilityLabel={t("org.comments.write")}
        />
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: p.borderSubtle }}>
        <EventSectionRail eventId={eventId} title={title} active="comments" />
      </View>

      <Body
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={accent.base} colors={[accent.base]} />}
      >
        {query.isPending ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={92} r={radii.card} />
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
            <StateBlock icon="chat" title={t("org.comments.empty.title")} body={t("org.comments.empty.body")} />
          </View>
        ) : (
          <View style={{ gap: 10, paddingTop: 4 }}>
            {rows.map(({ comment, depth }, i) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                depth={depth}
                index={i}
                onReply={() => setSheet({ mode: "reply", id: comment.id, text: "" })}
                onEdit={() => setSheet({ mode: "edit", id: comment.id, text: comment.content })}
                onDelete={() => onDelete(comment)}
              />
            ))}
          </View>
        )}
      </Body>

      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} maxHeightRatio={0.7} closeLabel={t("common.close")}>
        <View style={{ paddingHorizontal: gutter, paddingBottom: 8, gap: 14 }}>
          <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>
            {t(
              sheet?.mode === "edit"
                ? "org.comments.form.edit"
                : sheet?.mode === "reply"
                  ? "org.comments.form.reply"
                  : "org.comments.write",
            )}
          </Text>
          <Field
            label={t("org.comments.field.text")}
            value={sheet?.text ?? ""}
            onChangeText={(v) => setSheet((s) => (s ? { ...s, text: v } : s))}
            multiline
            numberOfLines={4}
            maxLength={2000}
            autoCapitalize="sentences"
          />
          <Btn full size="lg" variant="primary" loading={busy} onPress={onSend}>
            {t(sheet?.mode === "edit" ? "common.save" : "org.comments.send")}
          </Btn>
        </View>
      </BottomSheet>
    </Screen>
  );
}
