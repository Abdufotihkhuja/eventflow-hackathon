"use client";

import { useState } from "react";

/**
 * Host-card avatar shown in the registration aside on both
 * `/events/[slug]/register` and `/events/[slug]/register/questions`.
 *
 * Drops to two-letter initials when the logo URL is missing OR when the
 * image fails to load (broken upload, network error). Without the
 * fallback, a stale `logo_url` left an empty square in the host slot.
 *
 * The two pages share `./_styles.css`, so the markup (`cm-reg-card__host-*`)
 * stays consistent between them — extracting the component is what keeps
 * them from drifting again.
 */
export function HostAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | undefined;
}): React.ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  return (
    <div
      className={`cm-reg-card__host-avatar${showImage ? " has-logo" : ""}`}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl as string}
          alt=""
          className="cm-reg-card__host-logo"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}
