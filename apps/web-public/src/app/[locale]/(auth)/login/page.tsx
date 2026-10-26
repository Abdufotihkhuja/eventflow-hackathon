import { LoginForm } from "@features/auth/login";
import { OAuthButtons } from "@features/auth/oauth";
import { hasEnabledOAuthProviders } from "@features/auth/oauth/model/provider-config";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { AuthShell } from "@widgets/auth-shell";

import type { Metadata } from "next";

interface LoginPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{ redirect?: string }>;
}

export async function generateMetadata({
  params,
}: Pick<LoginPageProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.loginTitle"),
    description: t("public.metadata.loginDescription"),
    alternates: createLocalizedAlternates(locale, "/login"),
    // Auth UI: keep out of search results. `follow:true` so internal links
    // (back to home / catalog) still pass authority to indexable pages.
    // robots.txt already disallows crawl; this explicit `noindex` is what
    // tells Google to DROP previously-indexed URLs from results (otherwise
    // they linger as "Sign in" sitelinks for years).
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const { redirect } = await searchParams;
  const redirectTo =
    typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/";
  const showOAuthButtons = hasEnabledOAuthProviders();
  const homePath = withLocalePath("/", locale);

  return (
    <AuthShell
      logo={{
        src: "/assets/logo.svg",
        alt: t("public.shared.logoAlt"),
        href: homePath,
      }}
      backLink={{
        href: homePath,
        label: t("public.auth.loginPage.backToHome"),
      }}
      title={t("public.auth.loginPage.heading")}
      description={t("public.auth.loginPage.subtitle")}
      footer={
        showOAuthButtons ? (
          <>
            <div className="relative" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-400/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-ink-50">
                  {t("public.auth.loginPage.socialDivider")}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <OAuthButtons />
            </div>
          </>
        ) : null
      }
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
