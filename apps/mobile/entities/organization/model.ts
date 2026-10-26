/**
 * Organization view-model adapter. The public profile DTO has no cover image or
 * slug — the screen derives a hue-tinted hero from the id and a handle from the
 * name; `logoUrl` is resolved to an absolute URL.
 */
import type { components } from "@eventflow/api-contracts";

import { hueFromId, resolveMediaUrl } from "@shared/lib/format";

export type ApiOrgProfile = components["schemas"]["PublicOrganizationProfileDto"];

export interface OrgVM {
  id: string;
  name: string;
  handle: string;
  logoUrl?: string;
  initials: string;
  hue: number;
  description?: string;
  address?: string;
  website?: string;
  websiteLabel?: string;
  followersCount: number;
  eventsCount: number;
  verified: boolean;
  isFollowing: boolean;
}

function orgInitials(name: string): string {
  return (
    name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "EF"
  );
}

export function toOrgVM(dto: ApiOrgProfile): OrgVM {
  // CONTRACT-GAP: read loosely (the generated type carries optional/loose fields).
  const d = dto as unknown as {
    id: string;
    name?: string;
    companyName?: string;
    description?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    address?: string | null;
    followersCount?: number | null;
    eventsCount?: number | null;
    verificationStatus?: string;
    isFollowing?: boolean;
  };
  const name = d.name || d.companyName || "—";
  const website = d.website
    ? /^https?:\/\//.test(d.website)
      ? d.website
      : `https://${d.website}`
    : undefined;
  return {
    id: d.id,
    name,
    handle: `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24)}`,
    logoUrl: resolveMediaUrl(d.logoUrl),
    initials: orgInitials(name),
    hue: hueFromId(d.id),
    description: d.description?.trim() || undefined,
    address: d.address?.trim() || undefined,
    website,
    websiteLabel: website?.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    followersCount: d.followersCount ?? 0,
    eventsCount: d.eventsCount ?? 0,
    verified: d.verificationStatus === "APPROVED",
    isFollowing: Boolean(d.isFollowing),
  };
}
