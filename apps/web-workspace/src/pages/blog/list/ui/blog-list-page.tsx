/**
 * Публичная страница списка статей блога
 * @module pages/blog/list
 */

import { useState } from "react";
import { Search, Filter, TrendingUp, Clock, BookOpen } from "lucide-react";
import { useT } from "@eventflow/i18n/react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import { BlogPostsList } from "@features/blog/ui";
import {
  usePublishedBlogPosts,
  useToggleBlogLike,
  useToggleSaveBlogPost,
} from "@features/blog/api";
import type { BlogSortBy, SortOrder } from "@api/services";

const SORT_OPTIONS: {
  value: BlogSortBy;
  label: string;
  icon?: React.ElementType;
}[] = [
  { value: "publishedAt", label: "blog.sort.newest", icon: Clock },
  { value: "likesCount", label: "blog.sort.popular", icon: TrendingUp },
  { value: "viewsCount", label: "blog.sort.mostViewed" },
];

export function BlogListPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<BlogSortBy>("publishedAt");
  const [sortOrder] = useState<SortOrder>("desc");

  const { data, isLoading } = usePublishedBlogPosts({
    page,
    limit: 12,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  const likeMutation = useToggleBlogLike();
  const saveMutation = useToggleSaveBlogPost();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as BlogSortBy);
    setPage(1);
  };

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
    <div className="container mx-auto px-4 py-12 space-y-12">
      {/* Hero Section */}
      <div className="rounded-2xl bg-muted p-8 md:p-12 border border-border">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand-soft-foreground">
            <BookOpen className="h-4 w-4" />
            {t("blog.list.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {t("blog.list.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("blog.list.description")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("blog.list.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full md:w-[220px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("blog.list.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      />
    </div>
  );
}
