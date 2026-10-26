/**
 * @module widgets/blog/hero
 * @description Hero секция блога с заголовком, поиском и фильтрами по категориям
 * Вдохновлено: Portrait, Craft, MetaMask, Ada
 */

"use client";

import { useState, useCallback } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { useT } from "@eventflow/i18n/react";
import { Search, Clock, ArrowRight, TrendingUp } from "lucide-react";

import { getCategoryLabel, formatPublishDate } from "@entities/blog";
import {
  useBlogCategoriesQuery,
  useFeaturedPostsQuery,
} from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Input } from "@shared/ui/input";

import type { BlogPost } from "@entities/blog";

interface CategoryChip {
  id: string;
  label: string;
}

interface CategoryFilterProps {
  categories: CategoryChip[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

function CategoryFilters({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            "relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            activeCategory === cat.id
              ? "bg-ember-400 text-white shadow-lg shadow-ember-400/25"
              : "bg-white text-ink-100 hover:bg-ember-50 hover:text-ember-500 border border-bone-300"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function SearchInput({ value, onChange, onSubmit }: SearchInputProps) {
  const t = useT();
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-xl border bg-white px-4 py-3 transition-all duration-200",
        isFocused
          ? "border-ember-200 shadow-lg shadow-ember-50/50 ring-4 ring-ember-50"
          : "border-bone-300 hover:border-bone-400"
      )}
    >
      <Search
        className={cn(
          "size-5 shrink-0 transition-colors",
          isFocused ? "text-ember-400" : "text-ink-50"
        )}
        aria-hidden
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={t("public.blog.searchPlaceholder")}
        className="h-auto min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none hover:border-0 focus:border-0 focus:bg-transparent focus:shadow-none"
      />
    </div>
  );
}

interface FeaturedCardProps {
  post: BlogPost;
  variant: "large" | "small";
}

function FeaturedCard({ post, variant }: FeaturedCardProps) {
  const t = useT();
  const isLarge = variant === "large";

  // Главная карточка: изображение слева, контент справа — компактная и без пустот
  if (isLarge) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group relative flex items-stretch overflow-hidden rounded-xl bg-white"
      >
        {/* Изображение — занимает всю высоту карточки, обрезается по object-cover */}
        <div className="relative h-full w-2/5 min-w-[140px] max-w-[280px] shrink-0 overflow-hidden bg-bone-200 sm:min-w-[180px] md:max-w-[320px]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
            sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 320px"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/20 to-transparent" />

          {post.trending && (
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-400 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                <TrendingUp className="size-3" />
                {t("public.blog.hero.trending")}
              </span>
            </div>
          )}
        </div>

        {/* Контент — flex-start, без center, контент наверх */}
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6 md:p-6 lg:p-7">
          <span className="mb-2 inline-flex w-fit rounded-full bg-ember-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ember-500">
            {getCategoryLabel(post.category)}
          </span>

          <h2 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-ink-400 transition-colors group-hover:text-ember-500 sm:text-xl md:mb-3 md:text-2xl">
            {post.title}
          </h2>

          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-100 md:line-clamp-3 md:text-base">
            {post.excerpt}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-bone-200 pt-4">
            <div className="flex items-center gap-2">
              {post.author.avatar ? (
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-bone-300 ring-1 ring-white">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-ember-300 to-ember-500 text-xs font-bold text-white ring-1 ring-white">
                  {post.author.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink-400">
                  {post.author.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-100">
                  <span>{formatPublishDate(post.publishedAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-3" />
                    {t("public.blog.hero.readTimeMinutes", {
                      minutes: post.readTime,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-ember-500">
              {t("public.blog.hero.read")}
              <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Small variant
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex gap-4 overflow-hidden rounded-xl bg-white p-4 transition-all duration-200 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-bone-200 sm:w-28">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center">
        <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ember-500">
          {getCategoryLabel(post.category)}
        </span>
        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-ink-400 transition-colors group-hover:text-ember-500">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-ink-100">
          <span>{formatPublishDate(post.publishedAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {t("public.blog.hero.readTimeMinutes", {
              minutes: post.readTime,
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface BlogHeroProps {
  /** Получает выбранный categoryId (или undefined для «Все»). */
  onCategoryChange?: (categoryId: string | undefined) => void;
  onSearch?: (query: string) => void;
}

export function BlogHero({ onCategoryChange, onSearch }: BlogHeroProps) {
  const t = useT();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: featuredPosts, isLoading } = useFeaturedPostsQuery(3);
  const { data: categories } = useBlogCategoriesQuery();

  const categoryChips: CategoryChip[] = [
    { id: "all", label: t("public.blog.hero.categories.all") },
    ...(categories ?? []).map((c) => ({ id: c.id, label: c.name })),
  ];

  const handleCategoryChange = useCallback(
    (category: string) => {
      setActiveCategory(category);
      onCategoryChange?.(category === "all" ? undefined : category);
    },
    [onCategoryChange]
  );

  const handleSearch = useCallback(() => {
    onSearch?.(searchQuery);
  }, [onSearch, searchQuery]);

  const mainPost = featuredPosts?.[0];
  const secondaryPosts = featuredPosts?.slice(1, 3) || [];

  return (
    <section className="relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-ember-50/50 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-ember-50/60 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        {/* Header */}
        <div className="mb-10 text-center md:mb-12 lg:mb-14">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-ink-400 md:text-5xl lg:text-6xl">
            {t("public.blog.hero.title")}{" "}
            <span className="text-ember-500">Eventflow</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-ink-100 md:text-xl">
            {t("public.blog.hero.description")}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-center md:justify-between">
          <CategoryFilters
            categories={categoryChips}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />

          <div className="w-full md:w-72 lg:w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
            />
          </div>
        </div>

        {/* Featured Posts */}
        {isLoading ? (
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-5 lg:gap-6">
            <div className="flex overflow-hidden rounded-xl border border-bone-300/80 bg-white lg:col-span-3">
              <div className="aspect-4/3 w-2/5 max-w-[280px] shrink-0 animate-pulse bg-bone-200" />
              <div className="flex flex-1 flex-col justify-center gap-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-bone-200" />
                <div className="h-6 w-4/5 animate-pulse rounded bg-bone-200" />
                <div className="h-4 w-full animate-pulse rounded bg-bone-200" />
                <div className="mt-2 flex gap-3">
                  <div className="size-8 animate-pulse rounded-full bg-bone-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-bone-200" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="h-28 animate-pulse rounded-xl bg-bone-200" />
              <div className="h-28 animate-pulse rounded-xl bg-bone-200" />
            </div>
          </div>
        ) : (
          mainPost && (
            <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-5 lg:gap-6">
              {/* Главная статья — компактная карточка без лишней тени и пустот */}
              <div className="overflow-hidden rounded-xl border border-bone-300/80 bg-white lg:col-span-3">
                <FeaturedCard post={mainPost} variant="large" />
              </div>

              {/* Secondary posts */}
              <div className="flex flex-col gap-4 lg:col-span-2">
                {secondaryPosts.map((post) => (
                  <div
                    key={post.id}
                    className="overflow-hidden rounded-xl border border-bone-300/80 bg-white"
                  >
                    <FeaturedCard post={post} variant="small" />
                  </div>
                ))}

                {/* Subscribe card */}
                <div className="flex flex-1 flex-col justify-center rounded-xl border border-ember-300/20 bg-linear-to-br from-ember-400 to-ember-500 p-6 text-white">
                  <h3 className="mb-2 text-lg font-bold">
                    {t("public.blog.hero.newsletterTitle")}
                  </h3>
                  <p className="mb-4 text-sm text-white/90">
                    {t("public.blog.hero.newsletterDescription")}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={t("public.blog.hero.emailPlaceholder")}
                      className="h-auto min-w-0 flex-1 rounded-lg border-0 bg-white/20 px-3 py-2 text-sm text-white shadow-none backdrop-blur-none placeholder:text-white/60 hover:border-0 focus:border-0 focus:bg-white/30 focus:shadow-none"
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ember-500 transition-colors hover:bg-white/90"
                    >
                      {t("public.blog.hero.subscribe")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
