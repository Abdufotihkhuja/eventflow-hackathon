import { createLocalizedAlternates } from "@shared/lib/seo";
import { getServerTranslator } from "@shared/lib/server-i18n";

import type { Metadata } from "next";

interface CheckInLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: Pick<CheckInLayoutProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.checkIn.metaTitle"),
    description: t("public.checkIn.metaDescription"),
    alternates: createLocalizedAlternates(locale, "/check-in"),
    // Страница открывается по QR-коду с личным eventId и требует входа —
    // в поисковой выдаче ей делать нечего. `follow: true` оставляет
    // внутренним ссылкам (афиша, профиль) возможность передавать вес.
    robots: { index: false, follow: true },
  };
}

export default function CheckInLayout({
  children,
}: CheckInLayoutProps): React.ReactNode {
  return children;
}
