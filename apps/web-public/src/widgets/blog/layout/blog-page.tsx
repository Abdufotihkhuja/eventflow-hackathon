"use client";

import { useCallback, useMemo, useState } from "react";

import Image from "next/image";

import { useLocale, useT } from "@eventflow/i18n/react";

import {
  formatPublishDate,
  formatReadTime,
  getCategoryLabel,
} from "@entities/blog";
import {
  useBlogCategoriesQuery,
  useBlogPostsQuery,
  useFeaturedPostsQuery,
} from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Container } from "@shared/ui/container";
import {
  CalmBlogCard,
  type CalmBlogCardData,
  DesignIcon,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";

import type {
  BlogListResponse,
  BlogPost,
  BlogPostCategory,
} from "@entities/blog";

function postToCard(post: BlogPost, locale: string) {
  return {
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    categoryLabel: getCategoryLabel(post.category),
    date: formatPublishDate(post.publishedAt, locale),
    readTime: formatReadTime(post.readTime, locale),
    authorName: post.author.name,
    authorAvatar: post.author.avatar,
    trending: post.trending,
  };
}

export interface BlogPageProps {
  /** Server-fetched first page of posts (default view) for SSR/SEO. */
  initialPosts?: BlogListResponse;
  /** Server-fetched featured posts for SSR/SEO. */
  initialFeatured?: BlogPost[];
  /** Server-fetched dynamic blog categories for SSR/SEO. */
  initialCategories?: BlogPostCategory[];
}

export function BlogPage({
  initialPosts,
  initialFeatured,
  initialCategories,
}: BlogPageProps = {}): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  // "all" or a category id from the dynamic taxonomy.
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: categories } = useBlogCategoriesQuery(initialCategories);

  const filters = useMemo(
    () => ({
      categoryId: activeCategory === "all" ? undefined : activeCategory,
      search: appliedSearch.trim() || undefined,
    }),
    [activeCategory, appliedSearch],
  );

  // Initial server data only applies to the untouched default view.
  const isDefaultView =
    page === 1 && activeCategory === "all" && appliedSearch.trim() === "";

  const { data: featuredPosts, isLoading: featuredLoading } =
    useFeaturedPostsQuery(3, initialFeatured);
  const {
    data: catalogData,
    isLoading: catalogLoading,
    isFetching: catalogFetching,
    isError,
  } = useBlogPostsQuery(
    filters,
    page,
    9,
    isDefaultView ? initialPosts : undefined,
  );

  const handleCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setPage(1);
  }, []);

  // "All" chip + dynamic categories from the API.
  const categoryChips = useMemo(
    () => [
      { id: "all", label: t("public.blog.hero.categories.all") },
      ...(categories ?? []).map((c) => ({ id: c.id, label: c.name })),
    ],
    [categories, t],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setAppliedSearch(searchInput);
      setPage(1);
    },
    [searchInput],
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const mainFeatured = featuredPosts?.[0];
  const sideFeatured = featuredPosts?.slice(1, 3) ?? [];

  const totalLoaded = catalogData?.posts.length ?? 0;
  const totalCount = catalogData?.total ?? 0;
  const hasMore = catalogData ? page * 9 < catalogData.total : false;
  const trendingLabel = t("public.blog.hero.trending");

  return (
    <main style={{ background: "var(--bg-1)", color: "var(--fg-1)" }}>
      {/* HERO */}
      <section
        style={{
          paddingBlock: "72px 40px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            width: 760,
            height: 460,
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, var(--ember-100) 0%, transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <Container size="narrow" style={{ position: "relative", zIndex: 1 }}>
          <Eyebrow align="center">{t("public.blog.hero.eyebrow")}</Eyebrow>
          <h1
            style={{
              font: "700 72px/1.0 var(--font-sans)",
              letterSpacing: "-0.04em",
              margin: "20px auto 0",
              textWrap: "balance",
              color: "var(--ink-400)",
              maxWidth: "20ch",
            }}
            className="cm-blog-h1"
          >
            {t("public.blog.hero.titleLead")}{" "}
            <ItalicAccent>{t("public.blog.hero.titleAccent")}</ItalicAccent>.
          </h1>
          <p
            style={{
              font: "400 18px/1.6 var(--font-sans)",
              color: "var(--fg-2)",
              margin: "20px auto 0",
              maxWidth: 600,
              textWrap: "balance",
            }}
          >
            {t("public.blog.hero.description")}
          </p>

          {/* Search pill */}
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            style={{
              margin: "32px auto 0",
              maxWidth: 560,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bone-50)",
              border: "1px solid var(--border-1)",
              borderRadius: 999,
              padding: 6,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flex: 1,
                padding: "0 18px",
              }}
            >
              <DesignIcon
                name="search"
                size={16}
                stroke={2}
                style={{ color: "var(--fg-3)" }}
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("public.blog.searchPlaceholder")}
                style={{
                  border: "none",
                  outline: "none",
                  flex: 1,
                  padding: "12px 0",
                  font: "400 14px/1.2 var(--font-sans)",
                  color: "var(--fg-1)",
                  background: "transparent",
                }}
              />
              {appliedSearch ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label={t("public.blog.catalog.resetFilters")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--fg-3)",
                    cursor: "pointer",
                    font: "500 12px/1 var(--font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  ✕
                </button>
              ) : null}
            </label>
            <button
              type="submit"
              style={{
                background: "var(--ember-400)",
                color: "var(--bone-50)",
                border: "none",
                font: "600 14px/1 var(--font-sans)",
                padding: "13px 28px",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <DesignIcon name="search" size={15} stroke={2.2} />
              {t("public.blog.hero.searchSubmit")}
            </button>
          </form>
        </Container>
      </section>

      {/* FEATURED RAIL */}
      {(featuredLoading || mainFeatured) && (
        <section style={{ paddingBlock: "16px 24px" }}>
          <Container size="wide">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                paddingBottom: 14,
                marginBottom: 24,
                borderBottom: "2px solid var(--ink-400)",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Eyebrow style={{ marginBottom: 8 }}>
                  {t("public.blog.hero.featuredEyebrow")}
                </Eyebrow>
                <h2
                  style={{
                    font: "700 28px/1 var(--font-sans)",
                    letterSpacing: "-0.025em",
                    color: "var(--ink-400)",
                    margin: 0,
                  }}
                >
                  {t("public.blog.hero.featuredTitleLead")}
                  <ItalicAccent>
                    {t("public.blog.hero.featuredTitleAccent")}
                  </ItalicAccent>
                </h2>
              </div>
            </div>

            {featuredLoading ? (
              <div
                className="skeleton"
                style={{ height: 420, borderRadius: 12 }}
              />
            ) : mainFeatured ? (
              <FeaturedHeroCard
                post={postToCard(mainFeatured, locale)}
                href={withLocalePath(`/blog/${mainFeatured.slug}`, locale)}
                trendingLabel={trendingLabel}
                readMoreLabel={t("public.blog.banner.readArticle")}
              />
            ) : null}
          </Container>
        </section>
      )}

      {/* CATALOG */}
      <section style={{ paddingBlock: "40px 96px" }}>
        <Container size="wide">
          {/* Category chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {categoryChips.map((c) => {
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategory(c.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `1px solid ${
                      active ? "var(--ink-400)" : "var(--border-1)"
                    }`,
                    background: active ? "var(--ink-400)" : "transparent",
                    color: active ? "var(--bone-100)" : "var(--fg-2)",
                    font: "500 13px/1 var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <Eyebrow>{t("public.blog.catalog.title")}</Eyebrow>
            <span
              style={{
                font: "500 12px/1 var(--font-mono)",
                color: "var(--fg-3)",
              }}
            >
              {catalogData
                ? `${totalLoaded} ${t("common.of")} ${totalCount}`
                : "—"}
            </span>
          </div>

          {catalogLoading && page === 1 ? (
            <div className="cm-blog-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 380, borderRadius: 8 }}
                />
              ))}
            </div>
          ) : catalogData && catalogData.posts.length > 0 ? (
            <>
              <div className="cm-blog-grid">
                {catalogData.posts.map((post) => (
                  <CalmBlogCard
                    key={post.id}
                    post={postToCard(post, locale)}
                    href={withLocalePath(`/blog/${post.slug}`, locale)}
                    trendingLabel={trendingLabel}
                  />
                ))}
              </div>

              <div
                style={{
                  marginTop: 40,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={catalogFetching}
                    style={{
                      background: "transparent",
                      color: "var(--ink-400)",
                      border: "1px solid var(--ink-400)",
                      font: "600 14px/1 var(--font-sans)",
                      padding: "13px 28px",
                      borderRadius: 999,
                      cursor: catalogFetching ? "wait" : "pointer",
                      opacity: catalogFetching ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {catalogFetching
                      ? t("public.blog.catalog.loading")
                      : t("public.blog.catalog.loadMore")}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div
              style={{
                padding: 48,
                borderRadius: 8,
                background: "var(--bg-2)",
                border: "1px dashed var(--border-2)",
                textAlign: "center",
              }}
            >
              <Eyebrow align="center" style={{ marginBottom: 12 }}>
                {isError
                  ? t("public.blog.catalog.loadErrorTitle")
                  : t("public.blog.catalog.emptyTitle")}
              </Eyebrow>
              <p
                style={{
                  font: "400 14px/1.5 var(--font-sans)",
                  color: "var(--fg-3)",
                  margin: 0,
                  maxWidth: 480,
                  marginInline: "auto",
                }}
              >
                {isError
                  ? t("public.blog.catalog.loadErrorDescription")
                  : t("public.blog.catalog.emptyDescription")}
              </p>
              {!isError ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all");
                    handleClearSearch();
                  }}
                  style={{
                    marginTop: 20,
                    background: "var(--ember-400)",
                    color: "var(--bone-50)",
                    border: "none",
                    font: "600 13px/1 var(--font-sans)",
                    padding: "12px 22px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {t("public.blog.catalog.resetFilters")}
                </button>
              ) : null}
            </div>
          )}
        </Container>
      </section>

      <style>{`
        .cm-blog-featured-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          align-items: stretch;
        }
        .cm-blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 980px) {
          .cm-blog-h1 { font-size: 52px !important; }
          .cm-blog-featured-grid { grid-template-columns: repeat(2, 1fr); }
          .cm-blog-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .cm-blog-h1 { font-size: 40px !important; }
          .cm-blog-featured-grid { grid-template-columns: 1fr; }
          .cm-blog-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 880px) {
          .cm-blog-hero {
            grid-template-columns: 1fr !important;
          }
          .cm-blog-hero__image {
            aspect-ratio: 16/9 !important;
            min-height: 0 !important;
          }
          .cm-blog-hero__content {
            padding: 28px !important;
            gap: 10px !important;
          }
          .cm-blog-hero__title {
            font-size: 22px !important;
            line-height: 1.2 !important;
          }
          .cm-blog-hero__excerpt {
            font-size: 14px !important;
            -webkit-line-clamp: 3 !important;
          }
        }
        @media (max-width: 620px) {
          .cm-blog-hero__image {
            aspect-ratio: 16/10 !important;
          }
          .cm-blog-hero__content {
            padding: 20px !important;
          }
          .cm-blog-hero__title {
            font-size: 19px !important;
          }
          .cm-blog-hero__excerpt {
            -webkit-line-clamp: 2 !important;
          }
          .cm-blog-hero__meta {
            font-size: 10px !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </main>
  );
}

const heroFallbackAvatar = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * FeaturedHeroCard — single editorial hero for the «На этой неделе» section.
 * Wide image-left + content-right layout (stacks on mobile). Differentiated
 * from the catalog grid below: 50/50 split, big bold title, full lede,
 * prominent ember CTA on hover. Author footer matches CalmBlogCard pattern
 * (avatar + name + JBMono date) so the same post stays visually consistent
 * between hero and catalog.
 */
interface FeaturedHeroCardProps {
  post: CalmBlogCardData;
  href: string;
  trendingLabel: string;
  readMoreLabel: string;
}

function FeaturedHeroCard({
  post,
  href,
  trendingLabel,
  readMoreLabel,
}: FeaturedHeroCardProps): React.ReactNode {
  return (
    <a
      href={href}
      className="cm-blog-hero group"
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 0,
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition:
          "border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-2)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="cm-blog-hero__image"
        style={{
          position: "relative",
          aspectRatio: "auto",
          minHeight: 360,
          background: "var(--bone-300)",
        }}
      >
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 880px) 100vw, 60vw"
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
      <div
        className="cm-blog-hero__content"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 40,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <Eyebrow color="var(--ember-500)">{post.categoryLabel}</Eyebrow>
          {post.trending ? (
            <span
              style={{
                font: "500 10px/1 var(--font-mono)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ember-500)",
                background: "var(--ember-50)",
                borderRadius: 999,
                padding: "5px 10px",
              }}
            >
              {trendingLabel}
            </span>
          ) : null}
        </div>
        <h3
          className="cm-blog-hero__title"
          style={{
            font: "700 30px/1.15 var(--font-sans)",
            letterSpacing: "var(--track-snug)",
            color: "var(--ink-400)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {post.title}
        </h3>
        {post.excerpt ? (
          <p
            className="cm-blog-hero__excerpt"
            style={{
              font: "400 15px/1.6 var(--font-sans)",
              color: "var(--fg-2)",
              margin: 0,
              textWrap: "pretty",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.excerpt}
          </p>
        ) : null}
        <div
          className="cm-blog-hero__footer"
          style={{
            marginTop: "auto",
            paddingTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            borderTop: "1px dashed var(--border-1)",
          }}
        >
          <div
            className="cm-blog-hero__author"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              flex: 1,
            }}
          >
            {post.authorAvatar ? (
              <span
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--bone-300)",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={post.authorAvatar}
                  alt={post.authorName}
                  fill
                  sizes="36px"
                  style={{ objectFit: "cover" }}
                />
              </span>
            ) : (
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--ember-300)",
                  color: "var(--bone-50)",
                  font: "700 12px/1 var(--font-sans)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {heroFallbackAvatar(post.authorName)}
              </span>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  font: "600 13px/1.2 var(--font-sans)",
                  color: "var(--fg-1)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {post.authorName}
              </div>
              <div
                className="cm-blog-hero__meta"
                style={{
                  font: "500 10px/1 var(--font-mono)",
                  color: "var(--fg-3)",
                  letterSpacing: "0.04em",
                  marginTop: 3,
                }}
              >
                {post.date} · {post.readTime}
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              font: "600 13px/1 var(--font-sans)",
              color: "var(--ember-500)",
              transition:
                "transform var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)",
              flexShrink: 0,
            }}
            className="group-hover:translate-x-1 group-hover:text-ember-600"
          >
            {readMoreLabel}
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </a>
  );
}
