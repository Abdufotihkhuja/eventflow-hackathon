import type { ReactNode } from "react";

import type { Metadata } from "next";

/**
 * Organisation onboarding setup — multi-step form gated behind an
 * authenticated session with a verified email. Private flow, no SERP
 * value; `follow: true` keeps the CTA edges intact.
 *
 * Pair with the robots.txt change that stopped Disallow'ing this
 * route — Googlebot can now actually crawl the page and read this tag.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function OrganizationSetupLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
