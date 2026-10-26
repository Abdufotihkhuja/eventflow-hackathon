import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Server layout for `/events/[slug]/register` (which is itself a client
 * component). Registration flow — high-intent, but not content meant for
 * organic search. `noindex,follow` so internal links still pass authority
 * to the surrounding catalog and event detail pages.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function EventRegisterLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  return children;
}
