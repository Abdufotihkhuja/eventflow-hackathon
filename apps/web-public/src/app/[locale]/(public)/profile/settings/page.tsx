import { ProfileSettingsSection } from "@widgets/profile/settings";

import type { Metadata } from "next";

// Private user surface — keep out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileSettingsPage(): React.ReactNode {
  return <ProfileSettingsSection />;
}
