/**
 * Event comments — the participant-facing discussion thread.
 *
 * Wired to the public events-comments API (list + post + reply + like). The
 * backend nests replies arbitrarily; on mobile we cap the visual hierarchy at
 * one level (replies of replies are flattened under their top-level comment,
 * IG/YouTube-style) and collapse a thread's replies behind a toggle.
 *
 * Edit / delete exist on the API but are NOT exposed by the SDK yet
 * (contract gap — `events.updateComment` / `deleteComment` are missing), so we
 * don't hand-roll them; like + reply are the live write surface.
 */
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";

import {
  useEventCommentsQuery,
  useLikeCommentMutation,
  usePostCommentMutation,
} from "@entities/event";
import { useAuth } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, hueFromId, resolveMediaUrl } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, bannerIn, bannerOut, fadeIn, spring, useReducedMotion } from "@shared/motion";
import { accent, radii, type, usePalette } from "@shared/theme";
import { Avatar, Btn, Icon, Skeleton, StateBlock } from "@shared/ui";

/** Comments are paged by growing the limit (server offers limit/offset only). */
const PAGE = 50;

interface CommentNode {
  id: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  user?: { id?: string; firstName?: string; lastName?: string; avatarUrl?: string | null } | null;
  authorOrganization?: { id?: string; companyName?: string; logoUrl?: string | null } | null;
  likesCount?: number;
  userLikeStatus?: boolean | null;
  replies?: CommentNode[];
}

type TranslateFn = ReturnType<typeof useI18n>["t"];
type Lang = ReturnType<typeof useI18n>["lang"];

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "EF";
}

function authorOf(c: CommentNode): { name: string; hueSeed: string; isOrg: boolean; imageUrl?: string } {
  if (c.authorOrganization?.companyName) {
    return {
      name: c.authorOrganization.companyName,
      hueSeed: c.authorOrganization.id ?? c.id,
      isOrg: true,
      imageUrl: resolveMediaUrl(c.authorOrganization.logoUrl),
    };
  }
  const name = [c.user?.firstName, c.user?.lastName].filter(Boolean).join(" ") || "—";
  return { name, hueSeed: c.user?.id ?? c.id, isOrg: false, imageUrl: resolveMediaUrl(c.user?.avatarUrl) };
}

/** Relative "just now / 5m / 2h / 3d", falling back to a date stamp past a week. */
function relTime(iso: string, t: TranslateFn, lang: Lang): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return t("comments.time.now");
  const m = Math.floor(s / 60);
  if (m < 60) return t("comments.time.min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("comments.time.hour", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("comments.time.day", { n: d });
  return formatDateStamp(iso, lang);
}

/** Collect every descendant reply (BFS) into one flat, time-ordered list. */
function flattenReplies(c: CommentNode): CommentNode[] {
  const out: CommentNode[] = [];
  const walk = (nodes?: CommentNode[]) => {
    for (const n of nodes ?? []) {
      out.push(n);
      walk(n.replies);
    }
  };
  walk(c.replies);
  return out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Heart that pops (spring.pop 1→1.3→1) + tap haptic on like. */
function LikeButton({
  liked, likes, onPress, label,
}: {
  liked: boolean;
  likes: number;
  onPress: () => void;
  label: string;
}): React.JSX.Element {
  const p = usePalette();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: liked }}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        if (!liked && !reduced) {
          scale.value = withSequence(withSpring(1.3, spring.pop), withSpring(1, spring.pop));
        }
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <Animated.View style={st}>
        <Icon name="heart" size={15} fill={liked} color={liked ? accent.base : p.fgSubtle} />
      </Animated.View>
      {likes > 0 ? (
        <Text style={type({ weight: 600, size: 12, leading: 1, color: liked ? accent.base : p.fgMuted })}>{likes}</Text>
      ) : null}
    </Pressable>
  );
}

export function EventComments({
  eventId,
  onComposerFocus,
}: {
  eventId: string;
  /** Host screen scrolls the composer clear of the incoming keyboard. */
  onComposerFocus?: () => void;
}): React.JSX.Element {
  const p = usePalette();
  const { t, tn, lang } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [limit, setLimit] = useState(PAGE);
  const q = useEventCommentsQuery(eventId, { limit });
  const post = usePostCommentMutation(eventId);
  const like = useLikeCommentMutation(eventId);

  const [textValue, setTextValue] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [postFailed, setPostFailed] = useState(false);

  const data = q.data as unknown as { data?: CommentNode[]; total?: number } | undefined;
  const comments = data?.data ?? [];
  const total = data?.total ?? comments.length;

  const meInitials = initials([user?.firstName, user?.lastName].filter(Boolean).join(" ") || t("comments.you"));

  function submit(): void {
    const content = textValue.trim();
    if (!content || post.isPending) return;
    setPostFailed(false);
    const parentId = replyTo?.id;
    post.mutate(
      { content, ...(parentId ? { parentId } : {}) } as never,
      {
        onSuccess: () => {
          setTextValue("");
          if (parentId) setOpen((o) => ({ ...o, [parentId]: true }));
          setReplyTo(null);
        },
        onError: () => {
          haptics.error();
          setPostFailed(true);
        },
      },
    );
  }

  function onLike(c: CommentNode): void {
    if (!isAuthenticated) { router.push("/login"); return; }
    like.mutate(c.id);
  }

  function onReply(c: CommentNode): void {
    if (!isAuthenticated) { router.push("/login"); return; }
    setReplyTo({ id: c.id, name: authorOf(c).name });
    // Focus fires the composer's onFocus → the host scrolls it into view.
    inputRef.current?.focus();
  }

  function renderComment(c: CommentNode, isReply: boolean): React.JSX.Element {
    const a = authorOf(c);
    const liked = c.userLikeStatus === true;
    const likes = c.likesCount ?? 0;
    const replies = isReply ? [] : flattenReplies(c);
    const expanded = open[c.id] ?? false;
    return (
      <View key={c.id} style={{ flexDirection: "row", gap: 11 }}>
        <Avatar initials={initials(a.name)} size={isReply ? 30 : 38} hue={hueFromId(a.hueSeed)} src={a.imageUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Author + time */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <Text style={type({ weight: 600, size: 13, leading: 1.2, color: p.fg })} numberOfLines={1}>{a.name}</Text>
            {a.isOrg ? (
              <View style={{ paddingHorizontal: 6, height: 17, borderRadius: radii.pill, backgroundColor: accent.soft, justifyContent: "center" }}>
                <Text style={type({ weight: 700, size: 9, leading: 1, track: 0.02, color: accent.ink })}>{t("comments.organizer")}</Text>
              </View>
            ) : null}
            <Text style={type({ role: "mono", weight: 500, size: 11, leading: 1, color: p.fgSubtle })}>· {relTime(c.createdAt, t, lang)}</Text>
          </View>

          {/* Body */}
          <Text style={[type({ weight: 400, size: 14, leading: 1.45, color: p.fgDefault }), { marginTop: 4 }]}>{c.content}</Text>

          {/* Actions */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8 }}>
            <LikeButton liked={liked} likes={likes} label={t("comments.like")} onPress={() => onLike(c)} />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onReply(c)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={type({ weight: 600, size: 12, leading: 1, color: p.fgMuted })}>{t("comments.reply")}</Text>
            </Pressable>
          </View>

          {/* Replies (collapsible) */}
          {replies.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setOpen((o) => ({ ...o, [c.id]: !expanded }))} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 7, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 22, height: 1, backgroundColor: p.border }} />
                <Text style={type({ weight: 600, size: 12, leading: 1, color: accent.ink })}>
                  {expanded ? t("comments.hideReplies") : tn("comments.replies", replies.length)}
                </Text>
              </Pressable>
              {expanded ? (
                <Animated.View entering={fadeIn()} style={{ marginTop: 14, gap: 16, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: p.borderSubtle }}>
                  {replies.map((r) => renderComment(r, true))}
                </Animated.View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function renderList(): React.JSX.Element {
    if (q.isPending) {
      return (
        <View style={{ gap: 20, marginTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 11 }}>
              <Skeleton w={38} h={38} r={radii.pill} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton w="40%" h={12} />
                <Skeleton w="90%" h={12} />
                <Skeleton w="65%" h={12} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    if (q.isError) {
      return (
        <View style={{ paddingVertical: 24 }}>
          <StateBlock
            icon="alert"
            tone="error"
            title={t("state.error.title")}
            body={t("state.error.body")}
            action={<Btn size="md" variant="secondary" onPress={() => q.refetch()}>{t("common.retry")}</Btn>}
          />
        </View>
      );
    }
    if (comments.length === 0) {
      return (
        <View style={{ paddingVertical: 28 }}>
          <StateBlock icon="chat" title={t("comments.empty.title")} body={t("comments.empty.body")} />
        </View>
      );
    }
    // Load-more: the header count shows the TRUE server total; past the current
    // page we grow the limit (keepPreviousData keeps the thread rendered).
    // Only offered when the current page actually filled up, so it never
    // lingers if `total` counts nested replies too.
    // `isPlaceholderData` isolates the LOAD-MORE refetch (limit grew, previous
    // page shown) from unrelated refetches (e.g. the like-mutation's onSettled
    // invalidation), which must not swap the button for a spinner.
    const loadingMore = q.isPlaceholderData && q.isFetching;
    const hasMore = (comments.length >= limit && comments.length < total) || loadingMore;
    return (
      <View style={{ gap: 22, marginTop: 4 }}>
        {comments.map((c) => renderComment(c, false))}
        {hasMore ? (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="tap"
            disabled={loadingMore}
            onPress={() => setLimit((l) => l + PAGE)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: radii.control, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={accent.ink} />
            ) : (
              <Text style={type({ weight: 600, size: 13, leading: 1, color: accent.ink })}>{t("comments.loadMore")}</Text>
            )}
          </AnimatedPressable>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
        <Text style={type({ role: "display", weight: 700, size: 18, leading: 1.2, track: -0.02, color: p.fg })}>{t("detail.tab.comments")}</Text>
        {total > 0 ? (
          <Text style={type({ role: "mono", weight: 600, size: 13, leading: 1, color: p.fgSubtle })}>{total}</Text>
        ) : null}
      </View>

      {/* Composer */}
      {isAuthenticated ? (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}>
          <Avatar initials={meInitials} size={36} hue={hueFromId(user?.id ?? "me")} src={resolveMediaUrl(user?.avatarUrl)} />
          <View style={{ flex: 1 }}>
            {replyTo ? (
              <Animated.View entering={bannerIn()} exiting={bannerOut()} style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginBottom: 8, paddingLeft: 10, paddingRight: 6, height: 26, borderRadius: radii.pill, backgroundColor: accent.soft }}>
                <Text style={type({ weight: 600, size: 11, leading: 1, color: accent.ink })} numberOfLines={1}>{t("comments.replyingTo", { name: replyTo.name })}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t("a11y.close")} hitSlop={8} onPress={() => setReplyTo(null)}>
                  <Icon name="x" size={13} color={accent.ink} />
                </Pressable>
              </Animated.View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, backgroundColor: p.surface }}>
              <TextInput
                ref={inputRef}
                value={textValue}
                onChangeText={(v) => {
                  setTextValue(v);
                  if (postFailed) setPostFailed(false);
                }}
                onFocus={onComposerFocus}
                placeholder={t(replyTo ? "comments.replyPlaceholder" : "detail.commentPlaceholder")}
                placeholderTextColor={p.fgMuted}
                multiline
                style={[type({ weight: 400, size: 14, leading: 1.35, color: p.fg }), { flex: 1, padding: 0, paddingTop: 6, paddingBottom: 6, minHeight: 24, maxHeight: 120 }]}
              />
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("detail.commentSend")}
                accessibilityState={{ disabled: textValue.trim().length === 0, busy: post.isPending }}
                haptic="tap"
                disabled={textValue.trim().length === 0 || post.isPending}
                onPress={submit}
                style={{ width: 36, height: 36, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: textValue.trim().length === 0 && !post.isPending ? p.muted : accent.base }}
              >
                {post.isPending ? (
                  <ActivityIndicator size="small" color={accent.on} />
                ) : (
                  <Icon name="aright" size={18} color={textValue.trim().length === 0 ? p.fgSubtle : accent.on} />
                )}
              </AnimatedPressable>
            </View>
            {postFailed ? (
              <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: p.danger }), { marginTop: 7 }]}>{t("comments.postError")}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 22 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/login")}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, opacity: pressed ? 0.95 : 1 })}
          >
            <Icon name="user" size={18} color={p.fgMuted} />
            <Text style={[type({ weight: 500, size: 13, leading: 1.4, color: p.fgMuted }), { flex: 1 }]}>{t("comments.signInBody")}</Text>
            <Text style={type({ weight: 700, size: 13, leading: 1, color: accent.ink })}>{t("common.signIn")}</Text>
          </Pressable>
        </View>
      )}

      {renderList()}
    </View>
  );
}
