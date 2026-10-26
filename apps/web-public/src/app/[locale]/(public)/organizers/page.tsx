import type { Metadata } from "next";

import { OrganizersPage } from "@widgets/landing/layout";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Organizers(): React.ReactNode {
  return <OrganizersPage />;
}
