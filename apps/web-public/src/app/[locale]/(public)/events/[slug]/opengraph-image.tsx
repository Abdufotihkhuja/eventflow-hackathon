import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  brandLogoWidth,
  getBrandLogo,
  loadLogoDataUri,
} from "@shared/lib/og";

import { ImageResponse } from "next/og";

export const alt = "EVENTFLOW event";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";
const LOGO_HEIGHT = 48;
const ORG_LOGO_SIZE = 56;

interface OgEvent {
  title?: string;
  city?: string;
  startDate?: string;
  organization?: { name?: string; logoUrl?: string };
}

async function fetchEvent(slug: string, locale: string): Promise<OgEvent | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/public/events/by-slug/${encodeURIComponent(slug)}?locale=${locale}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as OgEvent;
  } catch {
    return null;
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<ImageResponse> {
  const { locale: localeParam, slug } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const event = await fetchEvent(slug, locale);
  const orgLogo = await loadLogoDataUri(event?.organization?.logoUrl);

  const title = truncate(event?.title ?? "EVENTFLOW", 110);
  const start = event?.startDate ? new Date(event.startDate) : null;
  const dateStr =
    start && !Number.isNaN(start.getTime())
      ? new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(start)
      : "";
  const meta = [dateStr, event?.city].filter(Boolean).join("   ·   ");
  const org = event?.organization?.name;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: OG_COLORS.bone,
          padding: 80,
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getBrandLogo()}
            height={LOGO_HEIGHT}
            width={brandLogoWidth(LOGO_HEIGHT)}
            alt="EVENTFLOW"
          />
          {meta ? (
            <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.ember, fontWeight: 600 }}>
              {meta}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 58 : 72,
            fontWeight: 800,
            lineHeight: 1.07,
            color: OG_COLORS.ink,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {orgLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogo}
                width={ORG_LOGO_SIZE}
                height={ORG_LOGO_SIZE}
                alt=""
                style={{
                  borderRadius: 12,
                  objectFit: "cover",
                  border: `1px solid ${OG_COLORS.bone}`,
                }}
              />
            ) : null}
            {org ? (
              <div style={{ display: "flex", fontSize: 28, color: OG_COLORS.inkMeta }}>
                {truncate(org, 52)}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.inkSoft, fontWeight: 600 }}>
            eventflow.uz
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
