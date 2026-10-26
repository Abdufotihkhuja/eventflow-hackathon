"use client";

import { useState, useCallback } from "react";

import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useT } from "@eventflow/i18n/react";
import type { User } from "@shared/api";
import {
  useBlogComments,
  type BlogCommentNode,
} from "@shared/lib/hooks/useBlogComments";
import {
  useEventComments,
  type EventCommentNode,
} from "@shared/lib/hooks/useEventComments";
import { useCurrentUserQuery } from "@shared/lib/hooks/useCurrentUserQuery";
import { useHasAuthSession } from "@shared/lib/hooks/useHasAuthSession";
import { cn, formatCommentTimeAgo, resolveAvatarUrl } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Surface } from "@shared/ui/surface";
import { Textarea } from "@shared/ui/textarea";

import type { ApiError } from "@shared/lib";

type CommentNode = BlogCommentNode | EventCommentNode;

interface CommentsSectionProps {
  resource: "blog" | "event";
  entityId: string;
  className?: string;
  /** Hide the built-in "Comments" heading when the parent renders its own. */
  hideHeader?: boolean;
}

function useComments(resource: "blog" | "event", entityId: string) {
  const blog = useBlogComments(entityId, resource === "blog");
  const event = useEventComments(entityId, resource === "event");
  return resource === "blog" ? blog : event;
}

/** Имя для отображения в стиле @username (без пробелов) */
function formatCommentUsername(name: string): string {
  return `@${name.replace(/\s+/g, "")}`;
}

/** Для блога — макс. 4 уровня (depth 0..3); на depth 3 кнопку «Ответить» не показываем. Для событий — без ограничения. */
const BLOG_MAX_REPLY_DEPTH = 3;

interface InlineReplyFormProps {
  parentAuthorName: string;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  currentUser: User | null;
}

function InlineReplyForm({
  parentAuthorName,
  replyText,
  onReplyTextChange,
  onSubmit,
  onCancel,
  isSubmitting,
  currentUser,
}: InlineReplyFormProps): React.ReactElement {
  const t = useT();
  const name = currentUser?.name ?? t("public.comments.you");
  const initial = name.charAt(0).toUpperCase();
  const avatarUrl = resolveAvatarUrl(currentUser?.avatarUrl);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mt-3 flex gap-3"
    >
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-10 rounded-full object-cover bg-bone-200"
          />
        ) : (
          <div
            className="flex size-10 items-center justify-center rounded-full bg-bone-300 text-sm font-semibold text-ink-100"
            aria-hidden
          >
            {initial}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={replyText}
          onChange={(e) => onReplyTextChange(e.target.value)}
          placeholder={t("public.comments.replyTo", { name: parentAuthorName })}
          rows={2}
          className="text-sm"
          aria-label={t("public.comments.replyText")}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("public.comments.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !replyText.trim()}
          >
            {isSubmitting ? t("public.comments.sending") : t("public.comments.reply")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentRow({
  comment,
  depth,
  resource,
  openReplyId,
  replyText,
  onReplyTextChange,
  onReplyOpen,
  onSubmitReply,
  onCancelReply,
  isReplySubmitting,
  currentUser,
  onLike,
  isLikeLoading,
}: {
  comment: CommentNode;
  depth: number;
  resource: "blog" | "event";
  openReplyId: string | null;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onReplyOpen: (parentId: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  isReplySubmitting: boolean;
  currentUser: User | null;
  onLike: (commentId: string, isLike: boolean) => void;
  isLikeLoading: boolean;
}) {
  const t = useT();
  const canReply =
    resource === "event" || depth < BLOG_MAX_REPLY_DEPTH;
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const isOrganizerComment =
    resource === "event" &&
    "isOrganizerReply" in comment &&
    Boolean((comment as EventCommentNode).isOrganizerReply);
  const organizerAuthor =
    resource === "event" && "authorOrganization" in comment
      ? (comment as EventCommentNode).authorOrganization
      : undefined;
  const name = isOrganizerComment
    ? (organizerAuthor?.name ?? t("public.comments.organizerLabel"))
    : (comment.user?.name ?? t("public.comments.user"));
  const initial = name.charAt(0).toUpperCase();
  const rawAvatarUrl = isOrganizerComment
    ? organizerAuthor?.avatarUrl
    : comment.user?.avatarUrl;
  const avatarUrl = rawAvatarUrl ? resolveAvatarUrl(rawAvatarUrl) : undefined;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReplyFormOpen = openReplyId === comment.id;

  return (
    <div className={cn("flex gap-3", depth > 0 && "mt-3")}>
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-10 rounded-full object-cover bg-bone-200"
          />
        ) : (
          <div
            className="flex size-10 items-center justify-center rounded-full bg-bone-300 text-sm font-semibold text-ink-100"
            aria-hidden
          >
            {initial}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium text-ink-400">
            {isOrganizerComment ? name : formatCommentUsername(name)}
          </span>
          {isOrganizerComment && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-ember-300 bg-ember-50 px-2 py-0.5 text-[11px] font-medium text-ember-600"
              title={t("public.comments.organizerHint")}
            >
              <ShieldCheck className="size-3" aria-hidden />
              {t("public.comments.organizerLabel")}
            </span>
          )}
          <span
            className="text-ink-50 text-xs"
            aria-label={t("public.comments.publishedAt", {
              time: formatCommentTimeAgo(comment.createdAt),
            })}
          >
            {formatCommentTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mb-1.5 text-sm text-ink-300 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        <div className="flex items-center gap-1 text-ink-100">
          <button
            type="button"
            onClick={() => onLike(comment.id, true)}
            disabled={isLikeLoading}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors hover:bg-bone-200 hover:text-ink-200",
              comment.isLiked === true && "text-ember-500"
            )}
            aria-label={t("public.comments.like")}
          >
            <ThumbsUp className="size-4" aria-hidden />
            {(comment.likesCount ?? 0) > 0 && (
              <span className="min-w-[1ch]">{comment.likesCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onLike(comment.id, false)}
            disabled={isLikeLoading}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors hover:bg-bone-200 hover:text-ink-200",
              comment.isLiked === false && "text-ink-200"
            )}
            aria-label={t("public.comments.dislike")}
          >
            <ThumbsDown className="size-4" aria-hidden />
            {(comment.dislikesCount ?? 0) > 0 && (
              <span className="min-w-[1ch]">{comment.dislikesCount}</span>
            )}
          </button>
          {canReply ? (
            <button
              type="button"
              onClick={() => onReplyOpen(comment.id)}
              className="rounded-full px-2 py-1 text-sm font-medium transition-colors hover:bg-bone-200 hover:text-ink-300"
            >
              {t("public.comments.reply")}
            </button>
          ) : (
            <span
              className="rounded-full px-2 py-1 text-sm text-ink-50"
              title={t("public.comments.maxDepth")}
            >
              {t("public.comments.reply")}
            </span>
          )}
        </div>

        {/* Inline-форма ответа под комментарием (как на референсе) */}
        {isReplyFormOpen && (
          <div className="ml-0 mt-2">
            <InlineReplyForm
              parentAuthorName={name}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onSubmit={onSubmitReply}
              onCancel={onCancelReply}
              isSubmitting={isReplySubmitting}
              currentUser={currentUser}
            />
          </div>
        )}

        {hasReplies && (
          <div className="mt-2">
            {repliesExpanded ? (
              <>
                <div className="ml-4 border-l-2 border-bone-300 pl-4">
                  {comment.replies.map((reply) => (
                    <CommentRow
                      key={reply.id}
                      comment={reply as CommentNode}
                      depth={depth + 1}
                      resource={resource}
                      openReplyId={openReplyId}
                      replyText={replyText}
                      onReplyTextChange={onReplyTextChange}
                      onReplyOpen={onReplyOpen}
                      onSubmitReply={onSubmitReply}
                      onCancelReply={onCancelReply}
                      isReplySubmitting={isReplySubmitting}
                      currentUser={currentUser}
                      onLike={onLike}
                      isLikeLoading={isLikeLoading}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRepliesExpanded(false)}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-100 hover:text-ink-200"
                >
                  <ChevronUp className="size-4 shrink-0" aria-hidden />
                  {t("public.comments.hideReplies")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRepliesExpanded(true)}
                className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-100 hover:text-ink-200"
              >
                <ChevronDown className="size-4 shrink-0" aria-hidden />
                {t("public.comments.showReplies", { count: comment.replies.length })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsSection({
  resource,
  entityId,
  className,
  hideHeader = false,
}: CommentsSectionProps): React.ReactElement | null {
  const t = useT();
  const { tree, total, isLoading, createMutation, likeMutation } = useComments(
    resource,
    entityId
  );
  // Секция живёт на публичных страницах (событие, статья), поэтому профиль
  // запрашиваем только при реальной сессии: GET /api/v1/session/me закрыт
  // JwtAuthGuard и для гостя вернул бы 401, а транспорт на 401 уводит на
  // /login — гостя выбрасывало со страницы события сразу после открытия.
  const hasSession = useHasAuthSession();
  const { data: currentUser } = useCurrentUserQuery({
    enabled: Boolean(entityId) && hasSession,
  });

  const [newCommentText, setNewCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleSubmitRoot = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const content = newCommentText.trim();
      if (!content) return;
      createMutation.mutate(
        { content },
        {
          onSuccess: () => setNewCommentText(""),
          onError: (err: Error) => {
            const apiErr = err as ApiError;
            toast.error(
              apiErr?.data?.message ?? t("public.comments.sendError")
            );
          },
        }
      );
    },
    [newCommentText, createMutation, t]
  );

  const handleReplyOpen = useCallback((parentId: string) => {
    setReplyToId(parentId);
    setReplyText("");
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToId(null);
    setReplyText("");
  }, []);

  const handleSubmitReply = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const content = replyText.trim();
      if (!content || !replyToId) return;
      createMutation.mutate(
        { content, parentId: replyToId },
        {
          onSuccess: () => {
            setReplyToId(null);
            setReplyText("");
          },
          onError: (err: Error) => {
            const apiErr = err as ApiError;
            toast.error(
              apiErr?.data?.message ?? t("public.comments.sendError")
            );
          },
        }
      );
    },
    [replyText, replyToId, createMutation, t]
  );

  const handleLike = useCallback(
    (commentId: string, isLike: boolean) => {
      likeMutation.mutate(
        { commentId, isLike },
        {
          onError: () => {
            toast.error(t("public.comments.reactionError"));
          },
        }
      );
    },
    [likeMutation, t]
  );

  return (
    <Surface
      variant="solid"
      radius="2xl"
      padding="lg"
      className={cn("space-y-6", className)}
    >
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-ink-100" aria-hidden />
          <h2 className="text-xl font-semibold text-ink-400">
            {t("public.comments.title")}
          </h2>
          {total > 0 && (
            <span className="text-sm text-ink-100">({total})</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmitRoot} className="space-y-3">
        <Textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={t("public.comments.placeholder")}
          rows={3}
          aria-label={t("public.comments.commentText")}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !newCommentText.trim()}
          >
            {createMutation.isPending ? t("public.comments.sending") : t("public.comments.send")}
          </Button>
        </div>
      </form>

      {isLoading && (
        <div className="space-y-4">
          <div className="h-20 rounded-xl bg-bone-200" />
          <div className="h-20 rounded-xl bg-bone-200" />
        </div>
      )}
      {!isLoading && tree.length === 0 && (
        <p className="text-sm text-ink-100">
          {t("public.comments.empty")}
        </p>
      )}
      {!isLoading && tree.length > 0 && (
        <ul className="list-none space-y-4 p-0">
          {tree.map((comment) => (
            <li key={comment.id} className="relative">
              <CommentRow
                comment={comment as CommentNode}
                depth={0}
                resource={resource}
                openReplyId={replyToId}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onReplyOpen={handleReplyOpen}
                onSubmitReply={handleSubmitReply}
                onCancelReply={handleCancelReply}
                isReplySubmitting={createMutation.isPending}
                currentUser={currentUser ?? null}
                onLike={handleLike}
                isLikeLoading={likeMutation.isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
