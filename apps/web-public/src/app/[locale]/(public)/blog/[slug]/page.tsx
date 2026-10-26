/**
 * @page /blog/[slug]
 * @description Страница отдельной блог-статьи
 */

import { notFound } from "next/navigation";

import { BlogArticle } from "@/widgets/blog/detail";

import {
  adaptPostFromRaw,
  blogService,
  type ApiBlogPostRaw,
} from "@/shared/api/blogService";

import { articleSchema, breadcrumbSchema } from "@shared/lib/json-ld";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates, siteUrl } from "@shared/lib/seo";
import { DeletedContentScreen } from "@shared/ui";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

/** Ответ API при 410 Gone */
interface DeletedContentResponse {
  statusCode: 410;
  deleted: true;
  deletionReason?: string;
  deletedAt: string;
}

type FetchBlogResult =
  | {
      type: "found";
      post: Awaited<ReturnType<typeof adaptPostFromRaw>>;
      /**
       * Locales for which the post has real translations (per API). Used to
       * `noindex` mismatched URLs — see the matching note on /events/[slug].
       */
      availableLocales: string[];
    }
  | { type: "not_found" }
  | { type: "deleted"; deletionReason?: string; deletedAt: string };

/**
 * Получение статьи по slug с сервера (GET /api/v1/blog/by-slug/:slug).
 * Обрабатывает 404 и 410 Gone (удалённый контент).
 */
async function fetchBlogPostForPage(
  slug: string,
  locale?: string
): Promise<FetchBlogResult> {
  try {
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";
    const response = await fetch(
      `${API_BASE_URL}/api/v1/blog/by-slug/${encodeURIComponent(slug)}${query}`,
      { next: { revalidate: 60 } }
    );

    if (response.status === 410) {
      const data = (await response.json()) as DeletedContentResponse;
      return {
        type: "deleted",
        deletionReason: data.deletionReason,
        deletedAt: data.deletedAt,
      };
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { type: "not_found" };
      }
      throw new Error(`Failed to fetch blog post: ${response.status}`);
    }

    const raw = (await response.json()) as ApiBlogPostRaw & {
      availableLocales?: unknown;
    };
    const post = adaptPostFromRaw(raw);
    const availableLocales = Array.isArray(raw.availableLocales)
      ? raw.availableLocales.filter((l): l is string => typeof l === "string")
      : [];
    return { type: "found", post, availableLocales };
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return { type: "not_found" };
  }
}

interface BlogPostPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

// Генерация метаданных для SEO
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const { locale, t } = await getServerTranslator(localeParam);
  const result = await fetchBlogPostForPage(slug, locale);
  const alternates = createLocalizedAlternates(locale, `/blog/${slug}`);

  if (result.type === "not_found" || result.type === "deleted") {
    return {
      title: t("public.metadata.articleNotFoundTitle"),
      alternates,
      robots: { index: false, follow: false },
    };
  }

  const post = result.post;
  // SEO: noindex this URL when the post has translations for other locales
  // but not for the requested one — the page would render fallback content
  // inside a mismatched `<html lang>` shell. Empty availableLocales = scalar
  // only (locale unknown), so we leave indexable.
  const indexable =
    result.availableLocales.length === 0 ||
    result.availableLocales.includes(locale);

  // When the organizer uploaded a real cover photo, use it as the og:image
  // so social shares (Telegram / Facebook / Twitter previews) render the
  // article hero instead of our brand-template card. Falls back to the
  // file-convention `opengraph-image.tsx` when no upload exists.
  const customCover = uploadedCoverUrl(post.coverImage);

  return {
    title: post.title,
    description: post.excerpt,
    alternates,
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      ...(customCover
        ? { images: [{ url: customCover, width: 1200, height: 630 }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      ...(customCover ? { images: [customCover] } : {}),
    },
  };
}

/**
 * Returns the cover URL only when it was uploaded by the organizer.
 * `resolveCoverImage` in the adapter falls back to `/images/blog-banner.jpg`
 * when no upload exists; we don't want that filler appearing as the
 * social-share image. Also skips built-in `template:*` placeholders.
 */
function uploadedCoverUrl(cover: string | undefined | null): string | undefined {
  if (!cover) return undefined;
  if (cover.startsWith("template:")) return undefined;
  if (cover.endsWith("/images/blog-banner.jpg")) return undefined;
  if (cover === "/images/blog-banner.jpg") return undefined;
  if (cover.startsWith("http")) return cover;
  return `${siteUrl}${cover}`;
}

// Генерация статических путей для статей (optional, для оптимизации)
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { posts } = await blogService.getPosts({}, 1, 50);
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps): Promise<React.JSX.Element> {
  const { locale: localeParam, slug } = await params;
  const { locale, t } = await getServerTranslator(localeParam);
  const result = await fetchBlogPostForPage(slug, locale);

  if (result.type === "not_found") {
    notFound();
  }

  if (result.type === "deleted") {
    return (
      <DeletedContentScreen
        message={result.deletionReason}
        contentType="article"
        deletedAt={result.deletedAt}
      />
    );
  }

  const post = result.post;
  const path = `/blog/${slug}`;
  const cover = post.coverImage
    ? post.coverImage.startsWith("http")
      ? post.coverImage
      : `${siteUrl}${post.coverImage}`
    : undefined;

  // BlogPost may have either an explicit Person byline (when `authorId` is
  // set on the API record) or fall back to the Organization. The adapter
  // tags `post.author.type` accordingly; we mirror that into the schema so
  // Google sees `Person` (and the bio + photo) for editorial bylines and
  // a richer `Organization` node for org-authored posts.
  const authorIsPerson = post.author?.type === "Person";
  const articleLd = articleSchema({
    locale,
    path,
    title: post.title,
    description: post.excerpt,
    image: cover,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    authorType: post.author?.type,
    authorName: post.author?.name,
    authorLogo: post.author?.avatar,
    authorBio: post.author?.bio,
    authorUrl:
      !authorIsPerson && post.author?.id
        ? `${siteUrl}/${locale}/organizers/${post.author.id}`
        : undefined,
  });

  const breadcrumbLd = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.metadata.blogTitle"), path: "/blog" },
      { name: post.title, path },
    ],
    locale,
  );

  return (
    <>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <BlogArticle post={post} />
    </>
  );
}
