/**
 * Секция комментариев к статье блога
 * @module features/blog/ui/blog-comments-section
 */

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, Textarea, Skeleton } from "@shared/ui";
import { BlogCommentItem } from "./blog-comment-item";
import { cn } from "@shared/lib/cn";
import type { BlogComment } from "@api/services";

type BlogCommentsSectionProps = {
  comments: BlogComment[];
  isLoading: boolean;
  currentUserId?: string;
  onSubmit: (content: string) => Promise<void>;
  onLike: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isSubmitting?: boolean;
  isLikeLoading?: boolean;
  totalComments?: number;
  className?: string;
};

export function BlogCommentsSection({
  comments,
  isLoading,
  currentUserId,
  onSubmit,
  onLike,
  onEdit,
  onDelete,
  isSubmitting = false,
  isLikeLoading = false,
  totalComments,
  className,
}: BlogCommentsSectionProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    await onSubmit(newComment.trim());
    setNewComment("");
  };

  return (
    <section className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          Комментарии
          {totalComments !== undefined && (
            <span className="ml-2 text-muted-foreground">
              ({totalComments})
            </span>
          )}
        </h2>
      </div>

      {/* New Comment Form */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Напишите комментарий..."
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              Отправить
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Комментариев пока нет</p>
          {!currentUserId && (
            <p className="text-sm mt-2">Войдите, чтобы оставить комментарий</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <BlogCommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onLike={onLike}
              onEdit={onEdit}
              onDelete={onDelete}
              isLikeLoading={isLikeLoading}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
