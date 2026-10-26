import type { ReactNode } from "react";

import type { Metadata } from "next";

/**
 * Onboarding flow — finishes a user's profile after OAuth signup.
 * Private, requires auth, no SERP value. `follow: true` keeps internal
 * link authority flowing without indexing the page itself.
 *
 * Pair with the robots.txt change that stopped Disallow'ing this
 * route — Googlebot can now actually crawl + read this `noindex`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CompleteProfileLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
