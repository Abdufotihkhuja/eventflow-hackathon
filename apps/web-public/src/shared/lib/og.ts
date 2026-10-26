import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveMediaUrl } from "./utils";

/** Standard Open Graph card dimensions. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** Bone-and-ink editorial palette (mirrors globals.css tokens). */
export const OG_COLORS = {
  bone: "#fbfbfa",
  ink: "#0e0e0d",
  inkSoft: "#4a4a47",
  inkMeta: "#6f6f6c",
  ember: "#ea580c",
} as const;

/** Natural aspect ratio of the EVENTFLOW wordmark logo (480×107 px). */
export const BRAND_LOGO_RATIO = 480 / 107;

let cachedBrandLogo: string | null = null;

/**
 * The EVENTFLOW logo as a base64 data URI, read once from `public/assets`.
 * Satori renders raster data URIs reliably (unlike the complex brand SVG).
 */
export function getBrandLogo(): string {
  if (!cachedBrandLogo) {
    const buffer = readFileSync(
      join(process.cwd(), "public", "assets", "email-logo.png"),
    );
    cachedBrandLogo = `data:image/png;base64,${buffer.toString("base64")}`;
  }
  return cachedBrandLogo;
}

/** Width for the brand logo at a given height, preserving aspect ratio. */
export function brandLogoWidth(height: number): number {
  return Math.round(height * BRAND_LOGO_RATIO);
}

/**
 * Fetches a remote raster image and returns it as a base64 data URI, or null
 * if unavailable or not a supported raster type. Pre-fetching here (instead of
 * letting Satori fetch) keeps one bad URL from failing the whole image.
 */
export async function loadRemoteImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g|webp)$/.test(type)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Resolves an organizer/media logo path to a raster data URI, or null. */
export async function loadLogoDataUri(
  logoUrl: string | null | undefined,
): Promise<string | null> {
  const resolved = resolveMediaUrl(logoUrl);
  if (!resolved) return null;
  return loadRemoteImage(resolved);
}
