import { ProfileDashboardSection } from "@widgets/profile/dashboard";

import type { Metadata } from "next";

// Private user surface — keep out of search results. `follow: true` lets
// internal nav still pass authority to indexable pages. (robots.txt already
// disallows crawl; this explicit `noindex` is what tells Google to *drop*
// previously-indexed copies.)
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Profile(): React.ReactNode {
  return <ProfileDashboardSection />;
}
