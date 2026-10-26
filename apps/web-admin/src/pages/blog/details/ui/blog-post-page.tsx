/**
 * Публичная страница детального просмотра статьи
 * @module pages/blog/details
 */

import { useParams } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Heart, Bookmark, Share2, Eye, Clock, Calendar, Tag as TagIcon, MessageCircle } from "lucide-react";
import { Button, RichTextEditor } from "@shared/ui";
import { getMediaUrl } from "@api/config";
import { BlogCommentsSection } from "@features/blog/ui";
import {
  useBlogPostBySlug,
  useBlogComments,
  useToggleBlogLike,
  useToggleSaveBlogPost,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
} from "@features/blog/api";
import { useAuth } from "@entities/auth";
import { cn } from "@shared/lib/cn";
import { toast } from "sonner";

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: post, isLoading } = useBlogPostBySlug(slug);
  const { data: commentsData, isLoading: isCommentsLoading } = useBlogComments(
    post?.id,
    { limit: 50 }
  );

  const likeMutation = useToggleBlogLike();
  const saveMutation = useToggleSaveBlogPost();
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const toggleCommentLikeMutation = useToggleCommentLike();

  const handleLike = () => {
    if (!post) return;
    if (!user) {
      toast.error("Войдите, чтобы поставить лайк");
      return;
    }
    likeMutation.toggle(post.id, post.isLiked || false);
  };

  const handleSave = () => {
    if (!post) return;
    if (!user) {
      toast.error("Войдите, чтобы сохранить статью");
      return;
    }
    saveMutation.toggle(post.id, post.isSaved || false);
  };

  const handleShare = async () => {
    if (!post) return;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.shortDescription,
          url,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    }
  };

  const handleCreateComment = async (content: string) => {
    if (!post) return;
    if (!user) {
      toast.error("Войдите, чтобы оставить комментарий");
      return;
    }
    await createCommentMutation.mutateAsync({
      postId: post.id,
      data: { content },
    });
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    if (!post) return;
    updateCommentMutation.mutate({
      postId: post.id,
      commentId,
      data: { content },
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    deleteCommentMutation.mutate({
      postId: post.id,
      commentId,
    });
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (!post) return;
    if (!user) {
      toast.error("Войдите, чтобы поставить лайк");
      return;
    }
    toggleCommentLikeMutation.mutate({
      postId: post.id,
      commentId,
    });
  };

  if (isLoading || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded w-3/4" />
          <div className="aspect-video bg-muted rounded" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => {
                  // Обрабатываем структуру тегов из API (может быть tag.tag или просто tag)
                  const tagData = (tag as any).tag || tag;
                  return (
                    <span
                      key={tagData.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <TagIcon className="h-3 w-3" />
                      {tagData.name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="space-y-3">
              {/* Organization */}
              <div className="flex items-center gap-3">
                {post.organization.logoUrl ? (
                  <img
                    src={getMediaUrl(post.organization.logoUrl)}
                    alt={post.organization.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                    <span className="text-lg font-semibold text-primary">
                      {post.organization.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-base">
                    {post.organization.name}
                  </p>
                  {post.organization.email && (
                    <p className="text-xs text-muted-foreground">
                      {post.organization.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates and Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {post.publishedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(post.publishedAt), "d MMMM yyyy", {
                        locale: ru,
                      })}
                    </span>
                  </div>
                )}

                <span className="hidden md:inline">•</span>

                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{post.readingTime} мин чтения</span>
                </div>

                <span className="hidden md:inline">•</span>

                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{post.viewsCount} просмотров</span>
                </div>

                <span className="hidden md:inline">•</span>

                <div className="flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.commentsCount} комментариев</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4">
              <Button
                variant={post.isLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    post.isLiked && "fill-current"
                  )}
                />
                {post.likesCount}
              </Button>

              <Button
                variant={post.isSaved ? "default" : "outline"}
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Bookmark
                  className={cn(
                    "mr-2 h-4 w-4",
                    post.isSaved && "fill-current"
                  )}
                />
                Сохранить
              </Button>

              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Поделиться
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border shadow-lg">
              <img
                src={getMediaUrl(post.coverImage)}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Short Description */}
          {post.shortDescription && (
            <div className="text-xl text-muted-foreground leading-relaxed italic">
              {post.shortDescription}
            </div>
          )}

          {/* Article Content */}
          <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
            <RichTextEditor
              value={post.content as any}
              editable={false}
              className="border-0 bg-transparent [&_.bn-container]:bg-transparent [&_.bn-editor]:bg-transparent [&_.bn-editor]:text-foreground dark:[&_.bn-editor]:text-foreground"
            />
          </article>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-8 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant={post.isLiked ? "default" : "outline"}
                onClick={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    post.isLiked && "fill-current"
                  )}
                />
                {post.likesCount}
              </Button>

              <Button
                variant={post.isSaved ? "default" : "outline"}
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Bookmark
                  className={cn(
                    "mr-2 h-4 w-4",
                    post.isSaved && "fill-current"
                  )}
                />
                {post.isSaved ? "Сохранено" : "Сохранить"}
              </Button>
            </div>

            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Поделиться
            </Button>
          </div>

          {/* Comments Section */}
          {post.commentsEnabled && (
            <BlogCommentsSection
              comments={commentsData?.data || []}
              isLoading={isCommentsLoading}
              currentUserId={user?.id}
              onSubmit={handleCreateComment}
              onLike={handleToggleCommentLike}
              onEdit={handleUpdateComment}
              onDelete={handleDeleteComment}
              isSubmitting={createCommentMutation.isPending}
              isLikeLoading={toggleCommentLikeMutation.isPending}
              totalComments={post.commentsCount}
              className="pt-12 border-t"
            />
          )}
        </div>
      </div>
    </div>
  );
}
