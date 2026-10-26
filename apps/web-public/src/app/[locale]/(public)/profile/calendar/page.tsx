import { ProfileCalendarSection } from "@widgets/profile/calendar";

import type { Metadata } from "next";

// Private user surface — keep out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileCalendarPage(): React.ReactNode {
  return <ProfileCalendarSection />;
}
