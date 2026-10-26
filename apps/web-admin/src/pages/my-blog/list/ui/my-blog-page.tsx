/**
 * Страница управления блогом организации
 * @module pages/my-blog/list
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import { BlogPostsList } from "@features/blog/ui";
import { useBlogPosts, useDeleteBlogPost } from "@features/blog/api";
import type { BlogPostStatus, BlogSortBy, SortOrder } from "@api/services";
import { useT } from "@eventflow/i18n/react";

const STATUS_OPTIONS: { value: BlogPostStatus | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "blog.myBlog.allStatuses" },
  { value: "DRAFT", labelKey: "blog.status.draft" },
  { value: "PENDING_REVIEW", labelKey: "blog.status.pendingReview" },
  { value: "APPROVED", labelKey: "blog.status.approved" },
  { value: "REJECTED", labelKey: "blog.status.rejected" },
  { value: "PUBLISHED", labelKey: "blog.status.published" },
];

const SORT_OPTIONS: { value: BlogSortBy; labelKey: string }[] = [
  { value: "createdAt", labelKey: "blog.sort.createdAt" },
  { value: "publishedAt", labelKey: "blog.sort.publishedAt" },
  { value: "likesCount", labelKey: "blog.sort.likesCount" },
  { value: "viewsCount", labelKey: "blog.sort.viewsCount" },
];

export function MyBlogPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogPostStatus | "all">("all");
  const [sortBy, setSortBy] = useState<BlogSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, isLoading } = useBlogPosts({
    page,
    limit: 12,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    sortBy,
    sortOrder,
  });

  const deleteMutation = useDeleteBlogPost();

  const handleDelete = (postId: string) => {
    deleteMutation.mutate(postId);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as BlogPostStatus | "all");
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as BlogSortBy);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("blog.myBlog.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("blog.myBlog.description")}
          </p>
        </div>

        <Link to="/my-blog/new">
          <Button size="lg" className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" />
            {t("blog.myBlog.createPost")}
          </Button>
        </Link>
      </div>

      {/* Stats Cards (optional) */}
      {!isLoading && data && data.total > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{data.total}</div>
            <p className="text-xs text-muted-foreground">
              {t("blog.myBlog.totalPosts")}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold text-warning">
              {data.data.filter((p) => p.status === "PENDING_REVIEW").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("blog.myBlog.pendingReview")}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold text-success">
              {data.data.filter((p) => p.status === "PUBLISHED").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("blog.myBlog.published")}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {data.data.filter((p) => p.status === "DRAFT").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("blog.myBlog.drafts")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-muted/30 p-4 rounded-lg border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("blog.myBlog.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("blog.myBlog.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t("blog.myBlog.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          title={
            sortOrder === "asc"
              ? t("blog.sort.ascending")
              : t("blog.sort.descending")
          }
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Posts List */}
      <BlogPostsList
        data={data}
        isLoading={isLoading}
        showStatus
        getPostHref={(post) => `/my-blog/${post.id}`}
        onDelete={handleDelete}
        onPageChange={setPage}
        isDeleteLoading={deleteMutation.isPending}
        emptyStateVariant="my-blog"
      />
    </div>
  );
}
