/**
 * Секция комментариев к статье блога
 * @module features/blog/ui/blog-comments-section
 */

import { MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Textarea,
  Skeleton,
} from "@shared/ui";
import { BlogCommentItem } from "./blog-comment-item";
import { cn } from "@shared/lib/cn";
import type { BlogComment } from "@api/services";

const commentSchema = z.object({
  content: z.string().trim().min(1, "Введите комментарий"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

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
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const handleSubmit = async (values: CommentFormValues) => {
    if (isSubmitting) return;
    await onSubmit(values.content.trim());
    form.reset({ content: "" });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Напишите комментарий..."
                      className="min-h-[100px]"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Отправить
              </Button>
            </div>
          </form>
        </Form>
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
