import { SITE_NAME } from "@shared/lib/seo";

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — events, registrations, and organizer tools`,
    short_name: SITE_NAME,
    description:
      "Discover events, register, and manage attendance with QR tickets.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#fbfbfa",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/assets/email-logo.png", sizes: "480x107", type: "image/png" },
    ],
  };
}
