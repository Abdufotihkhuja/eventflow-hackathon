import { Toaster } from "sonner";

import { createTranslator } from "@eventflow/i18n";
import { SUPPORTED_LOCALES, isSupportedLocale, withLocalePath, type Locale } from "@shared/lib/i18n-routing";
import { Providers } from "@shared/lib/providers";
import { Suspense } from "react";

import { Analytics, AnalyticsNoScript } from "@shared/analytics/analytics";
import { AnalyticsRouteTracker } from "@shared/analytics/analytics-route-tracker";
import { organizationSchema, webSiteSchema } from "@shared/lib/json-ld";
import { SITE_NAME, metadataBase, ogLocale } from "@shared/lib/seo";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope-next",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk-next",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono-next",
  display: "swap",
});

const fontVariableClassName = [
  manrope.variable,
  spaceGrotesk.variable,
  jetbrainsMono.variable,
].join(" ");

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

function resolveLocale(locale: string): Locale {
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return locale;
}

export function generateStaticParams(): Array<{ locale: Locale }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

/**
 * `viewport-fit=cover` обязателен, чтобы iOS Safari пробрасывал
 * `env(safe-area-inset-*)` под челкой/Home Indicator на iPhone X+.
 * Без него sticky-хедеры модалок и нижние таб-бары уезжают под челку.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfbfa",
};

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const t = createTranslator(locale);

  const rootTitle = t("public.metadata.rootTitle");
  const rootDescription = t("public.metadata.rootDescription");

  return {
    metadataBase,
    applicationName: SITE_NAME,
    title: {
      default: rootTitle,
      template: `%s | ${SITE_NAME}`,
    },
    description: rootDescription,
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    openGraph: {
      title: rootTitle,
      description: rootDescription,
      url: withLocalePath("/", locale),
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map(
        ogLocale,
      ),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: rootTitle,
      description: rootDescription,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<LocaleLayoutProps>): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);

  return (
    <html lang={locale} className={`${fontVariableClassName} scroll-smooth`}>
      <body className="font-sans antialiased bg-bone-100 text-ink-400">
        <AnalyticsNoScript />
        <JsonLd data={[organizationSchema(), webSiteSchema(locale)]} />
        <Providers initialLocale={locale}>
          <div className="relative min-h-screen text-foreground">
            {children}
          </div>
        </Providers>
        <Toaster position="top-right" theme="light" closeButton />
        <Analytics />
        <Suspense fallback={null}>
          <AnalyticsRouteTracker />
        </Suspense>
      </body>
    </html>
  );
}
