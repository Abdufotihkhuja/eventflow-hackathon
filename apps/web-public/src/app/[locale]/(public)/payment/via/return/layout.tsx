import { createLocalizedAlternates } from "@shared/lib/seo";
import { getServerTranslator } from "@shared/lib/server-i18n";

import type { Metadata } from "next";

interface ViaReturnLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: Pick<ViaReturnLayoutProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("checkout.ticket.via.returnMetaTitle"),
    description: t("checkout.ticket.via.returnMetaDescription"),
    alternates: createLocalizedAlternates(locale, "/payment/via/return"),
    // Персональная страница возврата с платёжной страницы — не для индекса.
    robots: { index: false, follow: true },
  };
}

export default function ViaReturnLayout({
  children,
}: ViaReturnLayoutProps): React.ReactNode {
  return children;
}
