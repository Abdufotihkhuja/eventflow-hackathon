import type { ReactNode } from "react";

import type { Metadata } from "next";

/**
 * OAuth callback is a transient redirect handler — the page itself
 * never has stable user-facing content (it just consumes tokens from
 * the URL and forwards on). Keep it out of the SERP. `follow: true`
 * is harmless here since there are no outbound discovery links.
 *
 * Pair with the robots.txt change that stopped Disallow'ing this
 * route — Googlebot can now actually fetch the page and read this tag.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthCallbackLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
