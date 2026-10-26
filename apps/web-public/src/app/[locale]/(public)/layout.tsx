import type { ReactNode } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { getServerTranslator } from "@shared/lib/server-i18n";
import { LandingFooter } from "@widgets/landing/footer";
import { LandingHeader } from "@widgets/landing/header";

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const { t } = await getServerTranslator(locale);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Link href="#main-content" className="skip-link">
        {t("public.navigation.skipToContent")}
      </Link>
      <LandingHeader />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
