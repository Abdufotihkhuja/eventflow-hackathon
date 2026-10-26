import { SignupForm } from "@features/auth/signup";
import { normalizeSignupPlan } from "@shared/lib/billing-intent";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { AuthShell } from "@widgets/auth-shell";

import type { Metadata } from "next";

interface SignupPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    /** Plan preselected by a /pricing CTA (P-7): PRO | EXCLUSIVE. */
    plan?: string | string[];
    /** Optional direct entry into the organizer signup wizard. */
    type?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: Pick<SignupPageProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.signupTitle"),
    description: t("public.metadata.signupDescription"),
    alternates: createLocalizedAlternates(locale, "/signup"),
    // Auth page — noindex (see /login for the full rationale).
    robots: { index: false, follow: true },
  };
}

export default async function SignupPage({
  params,
  searchParams,
}: SignupPageProps): Promise<React.JSX.Element> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const homePath = withLocalePath("/", locale);
  const resolvedSearchParams = await searchParams;
  // P-7: /pricing CTA plan context, threaded through the organizer flow.
  const plan = normalizeSignupPlan(resolvedSearchParams.plan);
  const requestedType = Array.isArray(resolvedSearchParams.type)
    ? resolvedSearchParams.type[0]
    : resolvedSearchParams.type;

  return (
    <AuthShell
      logo={{
        src: "/assets/logo.svg",
        alt: t("public.shared.logoAlt"),
        href: homePath,
      }}
      backLink={{
        href: homePath,
        label: t("public.auth.signupPage.backToHome"),
      }}
    >
      <SignupForm
        plan={plan}
        initialAccountType={requestedType === "organizer" ? "organizer" : null}
      />
    </AuthShell>
  );
}
