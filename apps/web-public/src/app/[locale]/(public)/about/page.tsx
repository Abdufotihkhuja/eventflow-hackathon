import { AboutPage } from "@widgets/landing/layout";
import { breadcrumbSchema } from "@shared/lib/json-ld";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata } from "@shared/lib/seo";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

interface AboutPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return buildPageMetadata({
    locale,
    path: "/about",
    title: t("public.metadata.aboutTitle"),
    description: t("public.metadata.aboutDescription"),
  });
}

export default async function About({
  params,
}: AboutPageProps): Promise<React.ReactNode> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.metadata.aboutTitle"), path: "/about" },
    ],
    locale,
  );

  return (
    <>
      <JsonLd data={breadcrumb} />
      <AboutPage />
    </>
  );
}
