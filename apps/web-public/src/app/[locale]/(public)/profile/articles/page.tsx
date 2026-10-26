import { ProfileArticlesSection } from "@widgets/profile/articles";

import type { Metadata } from "next";

// Private user surface — keep out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileArticlesPage(): React.ReactNode {
  return <ProfileArticlesSection />;
}
