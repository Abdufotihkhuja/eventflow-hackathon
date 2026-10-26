/**
 * @module widgets/blog/catalog
 * @description Каталог статей с улучшенной сеткой
 * Вдохновлено: Craft, MetaMask, Ada
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";


import { useT } from "@eventflow/i18n/react";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useBlogPostsQuery } from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { BlogCard, Button, MotionFadeIn, Surface } from "@shared/ui";

import type { BlogCategory, BlogFilters } from "@entities/blog";

interface BlogCatalogProps {
  initialCategory?: BlogCategory;
  initialSearch?: string;
}

type ViewMode = "grid" | "list";

function getGridColumns(totalLoaded: number): string {
  if (totalLoaded <= 1) return "mx-auto max-w-xl";
  if (totalLoaded === 2) return "sm:grid-cols-2";
  return "sm:grid-cols-2 lg:grid-cols-3";
}

export function BlogCatalog({
  initialCategory,
  initialSearch,
}: BlogCatalogProps) {
  const t = useT();
  const [filters, setFilters] = useState<BlogFilters>({
    category: initialCategory,
    search: initialSearch,
  });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const errorShownRef = useRef(false);

  const { data, isLoading, isFetching, isError, error } = useBlogPostsQuery(
    filters,
    page,
    9
  );

  // eslint-disable-next-line no-restricted-syntax -- показ тоста при ошибке загрузки
  useEffect(() => {
    if (!isError || !error) return;
    if (errorShownRef.current) return;
    errorShownRef.current = true;
    const message =
      error instanceof Error ? error.message : t("public.blog.catalog.loadErrorDescription");
    toast.error(t("public.blog.catalog.loadErrorTitle"), { description: message });
  }, [isError, error, t]);

  // eslint-disable-next-line no-restricted-syntax -- сброс флага тоста при успехе
  useEffect(() => {
    if (!isError) errorShownRef.current = false;
  }, [isError]);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const hasMore = data ? page * 9 < data.total : false;
  const totalLoaded = data?.posts.length || 0;
  const totalCount = data?.total || 0;
  const gridColumns = getGridColumns(totalLoaded);

  // Update filters from parent (hero section)
  const updateFilters = useCallback(
    (newFilters: Partial<BlogFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPage(1);
    },
    [setFilters, setPage]
  );

  // Expose updateFilters for parent components
  if (typeof window !== "undefined") {
    (
      window as unknown as { updateBlogFilters?: typeof updateFilters }
    ).updateBlogFilters = updateFilters;
  }

  return (
    <section className="relative py-16 md:py-20 lg:py-24">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/4 h-[500px] w-[500px] rounded-full bg-ember-50/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-bone-200/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink-400 md:text-3xl lg:text-4xl">
              {t("public.blog.catalog.title")}
            </h2>
            <p className="mt-2 text-ink-100">
              {t("public.blog.catalog.description")}
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-100">
              {t("public.blog.catalog.view")}:
            </span>
            <div className="flex overflow-hidden rounded-lg border border-bone-300 bg-white">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-ember-400 text-white"
                    : "text-ink-100 hover:bg-ember-50 hover:text-ember-500"
                )}
                aria-label={t("public.blog.catalog.grid")}
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">{t("public.blog.catalog.grid")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-ember-400 text-white"
                    : "text-ink-100 hover:bg-ember-50 hover:text-ember-500"
                )}
                aria-label={t("public.blog.catalog.list")}
              >
                <List className="size-4" />
                <span className="hidden sm:inline">{t("public.blog.catalog.list")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && page === 1 ? (
          <div
            className={cn(
              "grid items-stretch gap-6",
              viewMode === "grid"
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 max-w-3xl"
            )}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[460px] overflow-hidden rounded-[22px] border border-bone-300/60 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
              >
                <div className="aspect-16/10 animate-pulse bg-bone-200" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-20 animate-pulse rounded bg-bone-200" />
                  <div className="h-6 w-full animate-pulse rounded bg-bone-200" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-bone-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-bone-200" />
                  <div className="flex items-center gap-3 pt-8">
                    <div className="size-7 animate-pulse rounded-full bg-bone-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-bone-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data && data.posts.length > 0 ? (
          <>
            {/* Posts grid/list */}
            <div
              className={cn(
                "grid items-stretch gap-6",
                viewMode === "grid"
                  ? gridColumns
                  : "grid-cols-1 mx-auto max-w-3xl"
              )}
            >
              {data.posts.map((post, index) => (
                <MotionFadeIn
                  key={post.id}
                  direction="up"
                  delay={index * 0.05}
                  className="h-full"
                >
                  <BlogCard
                    post={post}
                    variant={viewMode === "list" ? "featured" : "default"}
                    showExcerpt={viewMode === "list"}
                    showInteractions={false}
                  />
                </MotionFadeIn>
              ))}
            </div>

            {/* Load more / Stats */}
            <div className="mt-12 flex flex-col items-center gap-4 md:mt-16">
              {hasMore && (
                <Button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isFetching}
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("public.blog.catalog.loading")}
                    </>
                  ) : (
                    t("public.blog.catalog.loadMore")
                  )}
                </Button>
              )}

              <p className="text-sm text-ink-100">
                {t("public.blog.catalog.shownPrefix")}{" "}
                <span className="font-semibold text-ink-400">{totalLoaded}</span>{" "}
                {t("common.of")}{" "}
                <span className="font-semibold text-ink-400">{totalCount}</span>{" "}
                {t("public.blog.catalog.articles")}
              </p>
            </div>
          </>
        ) : (
          /* Empty state */
          <Surface
            variant="muted"
            radius="3xl"
            padding="lg"
            className="py-16 text-center md:py-24"
          >
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-white shadow-lg">
              <svg
                className="size-10 text-ink-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-ink-400">
              {t("public.blog.catalog.emptyTitle")}
            </h3>
            <p className="mx-auto max-w-md text-ink-100">
              {t("public.blog.catalog.emptyDescription")}
            </p>
            <Button
              type="button"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              variant="primary"
              className="mt-6 rounded-full"
            >
              {t("public.blog.catalog.resetFilters")}
            </Button>
          </Surface>
        )}
      </div>
    </section>
  );
}
