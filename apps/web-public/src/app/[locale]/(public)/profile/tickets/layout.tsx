import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Server layout for `/profile/tickets/[eventId]` (which is itself a client
 * component, so it can't export metadata directly). Tickets are a private
 * user surface — keep them out of search.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileTicketsLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  return children;
}
