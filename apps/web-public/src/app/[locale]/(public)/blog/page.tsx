/**
 * @page /blog
 * @description Страница списка блог-статей
 */

import { BlogPage } from "@/widgets/blog/layout";
import { breadcrumbSchema, itemListSchema } from "@shared/lib/json-ld";
import {
  fetchBlogPostsServer,
  fetchFeaturedPostsServer,
  fetchBlogCategoriesServer,
} from "@shared/lib/server-data";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata } from "@shared/lib/seo";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

interface BlogPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return buildPageMetadata({
    locale,
    path: "/blog",
    title: t("public.metadata.blogTitle"),
    description: t("public.metadata.blogDescription"),
  });
}

export default async function Blog({
  params,
}: BlogPageProps): Promise<React.JSX.Element> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const [initialPosts, initialFeatured, initialCategories] = await Promise.all([
    fetchBlogPostsServer(locale, 1, 9),
    fetchFeaturedPostsServer(locale, 3),
    fetchBlogCategoriesServer(locale),
  ]);

  const itemList = itemListSchema(
    (initialPosts?.posts ?? []).map((post) => ({
      name: post.title,
      path: `/blog/${post.slug}`,
    })),
    locale,
  );
  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.metadata.blogTitle"), path: "/blog" },
    ],
    locale,
  );

  return (
    <>
      <JsonLd data={[breadcrumb, itemList]} />
      <BlogPage
        initialPosts={initialPosts}
        initialFeatured={initialFeatured}
        initialCategories={initialCategories}
      />
    </>
  );
}
