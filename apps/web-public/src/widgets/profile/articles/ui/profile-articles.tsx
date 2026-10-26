"use client";

import { useState } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { useT } from "@eventflow/i18n/react";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Filter,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { formatUtcToLocalDate } from "@shared/lib/date";
import {
  useSavedArticlesQuery,
  useSavedBlogPostsQuery,
  useDeleteArticleByIdMutation,
  useToggleSaveMutation,
  type SavedArticle,
} from "@shared/lib/hooks";
import { Button, Input } from "@shared/ui";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileLoadingState,
} from "@widgets/profile/layout";
import { ProfilePageHeader } from "@widgets/profile/page-header";

import type { SavedBlogPostItem } from "@shared/api";

// eslint-disable-next-line complexity -- UI компонент с состояниями loading/error/empty/data
export function ProfileArticlesSection(): React.ReactNode {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [page] = useState(1);

  const { data, isLoading, isError, error } = useSavedArticlesQuery({
    page,
    limit: 12,
  });
  const { data: savedPostsData, isLoading: isLoadingSavedPosts } =
    useSavedBlogPostsQuery({ page: 1, limit: 50 }, { enabled: true });

  const articles = data?.articles ?? [];
  const savedBlogPosts = savedPostsData?.items ?? [];

  const filteredArticles = articles.filter((article) => {
    const title = article.title ?? "";
    const desc = article.description ?? article.excerpt ?? "";
    const matchesSearch =
      searchQuery.trim() === "" ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const hasAnyContent =
    savedBlogPosts.length > 0 || filteredArticles.length > 0;
  const isLoadingAny = isLoading || isLoadingSavedPosts;

  const searchAction = (
    <div className="relative w-full md:w-64">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
        aria-hidden
      />
      <Input
        type="text"
        placeholder={t("public.blog.searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-4"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-50 hover:text-ink-100"
          aria-label={t("actions.clear")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <ProfilePageHeader
        icon={BookOpen}
        eyebrow={t("public.profile.articles.badge")}
        title={t("public.profile.articles.title")}
        description={t("public.profile.articles.description")}
        actions={searchAction}
      />

      {isError && (
        <ProfileErrorState
          title={t("public.profile.articles.loadErrorTitle")}
          description={
            error?.message ||
            t("public.profile.articles.loadErrorDescription")
          }
        />
      )}

      {/* Секция: сохранённые посты блога */}
      {savedBlogPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-ink-400">
            {t("public.profile.articles.savedBlogPosts")}
          </h2>
          {isLoadingSavedPosts ? (
            <ProfileLoadingState
              title={t("public.profile.articles.loading")}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {savedBlogPosts.map((item) => (
                <SavedBlogPostCard key={item.post.id} item={item} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Секция: закладки по ссылке */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-400">
          {t("public.profile.articles.linkBookmarks")}
        </h2>
        {isLoading && (
          <ProfileLoadingState
            title={t("public.profile.articles.loadingBookmarks")}
          />
        )}
        {!isLoading && !isError && filteredArticles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
        {!isLoading && !isError && filteredArticles.length === 0 && (
          <p className="py-6 text-sm text-ink-100">
            {t("public.profile.articles.noLinkBookmarks")}
          </p>
        )}
      </section>

      {!isLoadingAny && !isError && !hasAnyContent && (
        <EmptyState
          searchQuery={searchQuery}
          onClear={() => setSearchQuery("")}
        />
      )}

      {!isLoadingAny && hasAnyContent && (
        <div className="flex justify-center">
          <Link href="/blog">
            <Button
              variant="outline"
              size="lg"
              rightIcon={<ArrowUpRight className="h-4 w-4" aria-hidden />}
            >
              {t("public.profile.articles.allBlogPosts")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

interface SavedBlogPostCardProps {
  item: SavedBlogPostItem;
}

function SavedBlogPostCard({ item }: SavedBlogPostCardProps): React.ReactNode {
  const t = useT();
  const { post, savedAt } = item;
  const toggleSave = useToggleSaveMutation(post.id);

  const handleUnsave = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    toggleSave.mutate(true);
  };

  const savedDate = formatUtcToLocalDate(savedAt, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-bone-300/60 bg-bone-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-bone-400 hover:shadow-lg">
        <div className="relative aspect-16/10 overflow-hidden">
          <Image
            src={post.coverImage || "/images/blog-banner.jpg"}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink-400/30 via-transparent to-transparent" />
          <button
            type="button"
            onClick={handleUnsave}
            disabled={toggleSave.isPending}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bone-50/90 text-ink-100 opacity-0 backdrop-blur transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100 disabled:opacity-50"
            aria-label={t("public.profile.articles.removeFromSaved")}
          >
            {toggleSave.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink-400 group-hover:text-ember-500">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="line-clamp-2 flex-1 text-sm text-ink-100">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-bone-200 pt-3 text-xs text-ink-100">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t("public.profile.articles.savedAt", { date: savedDate })}
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-ink-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember-400"
              aria-hidden
            />
          </div>
        </div>
      </article>
    </Link>
  );
}

interface ArticleCardProps {
  article: SavedArticle;
}

function ArticleCard({ article }: ArticleCardProps): React.ReactNode {
  const t = useT();
  const cardImage = article.imageUrl ?? "/images/blog-banner.jpg";
  const deleteMutation = useDeleteArticleByIdMutation();

  const handleDelete = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    deleteMutation.mutate({ id: article.id, url: article.url });
  };

  const savedDate = formatUtcToLocalDate(article.savedAt, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const linkUrl = article.url ?? article.articleUrl;

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-bone-300/60 bg-bone-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-bone-400 hover:shadow-lg hover:shadow-bone-300/50">
        {/* Image */}
        <div className="relative aspect-16/10 overflow-hidden">
          <Image
            src={cardImage}
            alt={article.title ?? t("public.profile.articles.articleAlt")}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink-400/30 via-transparent to-transparent" />

          {/* Source badge */}
          {article.source && (
            <span className="absolute left-3 top-3 inline-flex rounded-full bg-bone-50/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ember-500 backdrop-blur">
              {article.source}
            </span>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bone-50/90 text-ink-100 opacity-0 backdrop-blur transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100 disabled:opacity-50"
            aria-label={t("public.profile.articles.deleteFromFavorites")}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink-400 group-hover:text-ember-500">
            {article.title ?? t("public.profile.articles.untitled")}
          </h3>

          {article.description && (
            <p className="line-clamp-2 flex-1 text-sm text-ink-100">
              {article.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between border-t border-bone-200 pt-3 text-xs text-ink-100">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t("public.profile.articles.savedAt", { date: savedDate })}
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-ink-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember-400"
              aria-hidden
            />
          </div>
        </div>
      </article>
    </a>
  );
}

interface EmptyStateProps {
  searchQuery: string;
  onClear: () => void;
}

function EmptyState({
  searchQuery,
  onClear,
}: EmptyStateProps): React.ReactNode {
  const t = useT();
  const description = searchQuery
    ? t("public.profile.articles.emptySearch", { query: searchQuery })
    : t("public.profile.articles.emptyDefault");

  return (
    <ProfileEmptyState
      icon={Filter}
      title={t("public.profile.articles.emptyTitle")}
      description={description}
      action={
        searchQuery ? (
          <Button variant="secondary" size="md" onClick={onClear}>
            {t("public.profile.articles.resetSearch")}
          </Button>
        ) : (
          <Link href="/blog">
            <Button variant="primary" size="md">
              {t("public.profile.articles.allBlogPosts")}
            </Button>
          </Link>
        )
      }
    />
  );
}

