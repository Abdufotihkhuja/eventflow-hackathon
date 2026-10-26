import { siteUrl } from "@shared/lib/seo";

import type { MetadataRoute } from "next";

/**
 * Robots policy.
 *
 * IMPORTANT: we deliberately do NOT Disallow private user-flow pages
 * (login / signup / profile / register / unsubscribe / verify-email /
 * auth callback / certificates verify / etc.) here. Each of those pages
 * carries its own `robots: { index: false }` metatag — that's what
 * actually keeps them out of the SERP.
 *
 * Disallowing them in robots.txt is *worse* than no rule at all: it
 * stops Googlebot from fetching the page, so it never reads the
 * `noindex` meta. If any external link points at the URL, Google then
 * indexes it as a content-less URL ("Indexed though blocked by
 * robots.txt" in Search Console). The fix is the inverse of the
 * intuitive one — let crawl through so the `noindex` actually fires.
 *
 * `/api/*` stays Disallow'd: that's the backend API surface, there's
 * no HTML / no meta tag to read, and no SEO value in crawling JSON.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
