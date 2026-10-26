import { createTranslator } from "@eventflow/i18n";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import {
  OG_COLORS,
  OG_CONTENT_TYPE,
  OG_SIZE,
  brandLogoWidth,
  getBrandLogo,
} from "@shared/lib/og";

import { ImageResponse } from "next/og";

export const alt = "EVENTFLOW — events, registrations, and organizer tools";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Drop the leading "EVENTFLOW <sep>" from the localized root title — the
 * logo already carries the brand, so the headline stays clean. */
function headlineFrom(rootTitle: string): string {
  const stripped = rootTitle.replace(/^EVENTFLOW\s*[-—|:]\s*/i, "").trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

const LOGO_HEIGHT = 56;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ImageResponse> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getBrandLogo()}
          height={LOGO_HEIGHT}
          width={brandLogoWidth(LOGO_HEIGHT)}
          alt="EVENTFLOW"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.08,
              color: OG_COLORS.ink,
              maxWidth: 1000,
            }}
          >
            {headlineFrom(t("public.metadata.rootTitle"))}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: OG_COLORS.inkSoft,
              lineHeight: 1.35,
              maxWidth: 940,
            }}
          >
            {t("public.metadata.rootDescription")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            background: OG_COLORS.ember,
            borderRadius: 9999,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
