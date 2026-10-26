import { ProfileEventsSection } from "@widgets/profile/events";

import type { Metadata } from "next";

// Private user surface — keep out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileEventsPage(): React.ReactNode {
  return <ProfileEventsSection />;
}
