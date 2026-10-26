/**
 * Список статей блога с пагинацией
 * @module features/blog/ui/blog-posts-list
 */

import { BlogPostCard } from "./blog-post-card";
import { BlogEmptyState } from "./blog-empty-state";
import { Button, Skeleton } from "@shared/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@eventflow/i18n/react";
import type { BlogPostPreview, BlogPostsResponse } from "@api/services";

type BlogPostsListProps = {
  data: BlogPostsResponse | undefined;
  isLoading: boolean;
  showStatus?: boolean;
  getPostHref: (post: BlogPostPreview) => string;
  getEditHref?: (post: BlogPostPreview) => string;
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPageChange?: (page: number) => void;
  isLikeLoading?: boolean;
  isSaveLoading?: boolean;
  isDeleteLoading?: boolean;
  emptyStateVariant?: "my-blog" | "public-blog" | "saved-blog";
};

export function BlogPostsList({
  data,
  isLoading,
  showStatus = false,
  getPostHref,
  getEditHref,
  onLike,
  onSave,
  onDelete,
  onPageChange,
  isLikeLoading = false,
  isSaveLoading = false,
  isDeleteLoading = false,
  emptyStateVariant = "public-blog",
}: BlogPostsListProps) {
  const t = useT();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <BlogPostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return <BlogEmptyState variant={emptyStateVariant} />;
  }

  const { data: posts, page, total, totalPages } = data;
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-6">
      {/* Posts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard
            key={post.id}
            post={post}
            href={getPostHref(post)}
            editHref={getEditHref?.(post)}
            showStatus={showStatus}
            onLike={onLike}
            onSave={onSave}
            onDelete={onDelete}
            isLikeLoading={isLikeLoading}
            isSaveLoading={isSaveLoading}
            isDeleteLoading={isDeleteLoading}
          />
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between border-t pt-6">
          <div className="text-sm text-muted-foreground">
            {t("blog.card.pageInfo", { page, totalPages })} • {t("blog.card.totalCount", { total })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("actions.previous")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
            >
              {t("actions.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlogPostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

