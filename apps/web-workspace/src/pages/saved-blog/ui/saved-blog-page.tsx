/**
 * Страница сохранённых статей блога
 * @module pages/saved-blog
 */

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { BlogPostsList } from "@features/blog/ui";
import {
  useSavedBlogPosts,
  useToggleBlogLike,
  useToggleSaveBlogPost,
} from "@features/blog/api";

export function SavedBlogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSavedBlogPosts({
    page,
    limit: 12,
  });

  const likeMutation = useToggleBlogLike();
  const saveMutation = useToggleSaveBlogPost();

  const handleLike = (postId: string) => {
    const post = data?.data.find((p) => p.id === postId);
    if (post) {
      likeMutation.toggle(postId, post.isLiked || false);
    }
  };

  const handleSave = (postId: string) => {
    const post = data?.data.find((p) => p.id === postId);
    if (post) {
      saveMutation.toggle(postId, post.isSaved || false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-brand-soft px-6 py-3 border border-brand-soft">
          <Bookmark className="h-6 w-6 text-primary fill-current" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Сохранённые статьи
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.total || 0} сохранённых статей
            </p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Статьи, которые вы сохранили для чтения позже. Ваша личная
          библиотека полезного контента.
        </p>
      </div>

      {/* Posts List */}
      <BlogPostsList
        data={data}
        isLoading={isLoading}
        getPostHref={(post) => `/blog/${post.slug}`}
        onLike={handleLike}
        onSave={handleSave}
        onPageChange={setPage}
        isLikeLoading={likeMutation.isPending}
        isSaveLoading={saveMutation.isPending}
        emptyStateVariant="saved-blog"
      />
    </div>
  );
}
