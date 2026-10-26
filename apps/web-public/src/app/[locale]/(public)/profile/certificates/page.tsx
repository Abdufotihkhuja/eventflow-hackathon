import { ProfileCertificatesSection } from "@widgets/profile/certificates";

import type { Metadata } from "next";

// Private user surface — keep out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ProfileCertificatesPage(): React.ReactNode {
  return <ProfileCertificatesSection />;
}
