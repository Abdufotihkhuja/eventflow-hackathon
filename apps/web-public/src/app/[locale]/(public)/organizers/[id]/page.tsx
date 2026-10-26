import { OrganizerPublicPage } from "@widgets/organizer-public";

import { createTranslator } from "@eventflow/i18n";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import { breadcrumbSchema, organizerProfileSchema } from "@shared/lib/json-ld";
import { buildPageMetadata, createLocalizedAlternates } from "@shared/lib/seo";
import { resolveMediaUrl } from "@shared/lib/utils";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

interface OrganizerProfile {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  city?: string;
  country?: string;
}

interface OrganizerPageProps {
  params: Promise<{ locale: string; id: string }>;
}

async function fetchOrganizer(
  id: string,
  locale: string,
): Promise<OrganizerProfile | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/organizations/${encodeURIComponent(id)}/public?locale=${locale}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as OrganizerProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: OrganizerPageProps): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const org = await fetchOrganizer(id, locale);
  const path = `/organizers/${id}`;

  if (!org?.name) {
    return { alternates: createLocalizedAlternates(locale, path) };
  }

  return buildPageMetadata({
    locale,
    path,
    title: org.name,
    description:
      org.description?.trim() ||
      [org.name, org.city].filter(Boolean).join(" · "),
    type: "website",
  });
}

export default async function OrganizerPage({
  params,
}: OrganizerPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, id } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const org = await fetchOrganizer(id, locale);

  const orgLd = org?.name
    ? organizerProfileSchema({
        locale,
        path: `/organizers/${id}`,
        name: org.name,
        description: org.description,
        logo: resolveMediaUrl(org.logoUrl),
        website: org.website,
        city: org.city,
        country: org.country,
      })
    : null;

  const breadcrumb = org?.name
    ? breadcrumbSchema(
        [
          { name: createTranslator(locale)("public.navigation.home"), path: "/" },
          { name: org.name, path: `/organizers/${id}` },
        ],
        locale,
      )
    : null;

  return (
    <>
      {orgLd ? <JsonLd data={[orgLd, breadcrumb]} /> : null}
      <OrganizerPublicPage organizationId={id} />
    </>
  );
}
