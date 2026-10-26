import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";

import type { Metadata } from "next";

interface CertificateVerifyLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: Pick<CertificateVerifyLayoutProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.certificatesVerifyTitle"),
    description: t("public.metadata.certificatesVerifyDescription"),
    alternates: createLocalizedAlternates(locale, "/certificates/verify"),
    // Certificate verification renders a tokenised result tied to a
    // single recipient — no SERP value, and indexing the page leaks
    // the holder's name bound to the verification URL. `follow: true`
    // lets internal navigation links out of the page still pass
    // authority.
    // Pair with the robots.txt change that stopped Disallow'ing this
    // route — Googlebot can now actually crawl + read this tag.
    robots: { index: false, follow: true },
  };
}

export default function CertificateVerifyLayout({
  children,
}: CertificateVerifyLayoutProps): React.ReactNode {
  return children;
}
