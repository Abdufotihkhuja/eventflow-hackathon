import { KeyRound } from "lucide-react";

import { ForgotPasswordForm } from "@features/auth/forgot-password";
import { organizerLoginUrl } from "@shared/config/urls";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { createLocalizedAlternates } from "@shared/lib/seo";
import { AuthShell } from "@widgets/auth-shell";

import type { Metadata } from "next";

interface ForgotPasswordPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    email?: string | string[];
    source?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return {
    title: t("public.metadata.forgotPasswordTitle"),
    description: t("public.metadata.forgotPasswordDescription"),
    alternates: createLocalizedAlternates(locale, "/forgot-password"),
    // Auth page — noindex (see /login for the full rationale).
    robots: { index: false, follow: true },
  };
}

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: ForgotPasswordPageProps): Promise<React.JSX.Element> {
  const { t } = await getServerTranslator((await params).locale);
  const resolvedSearchParams = await searchParams;
  const emailParam = Array.isArray(resolvedSearchParams.email)
    ? resolvedSearchParams.email[0]
    : resolvedSearchParams.email;
  const sourceParam = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const source = sourceParam === "workspace" ? "workspace" : "public";
  const workspaceBackUrl = new URL(organizerLoginUrl);
  if (emailParam) {
    workspaceBackUrl.searchParams.set("email", emailParam);
  }

  return (
    <AuthShell
      icon={KeyRound}
      width="sm"
      backLink={{
        href: source === "workspace" ? workspaceBackUrl.toString() : "/login",
        label: t("public.auth.forgotPasswordPage.backToLogin"),
      }}
      title={t("public.auth.forgotPasswordPage.heading")}
      description={t("public.auth.forgotPasswordPage.subtitle")}
    >
      <ForgotPasswordForm defaultEmail={emailParam} source={source} />
    </AuthShell>
  );
}
