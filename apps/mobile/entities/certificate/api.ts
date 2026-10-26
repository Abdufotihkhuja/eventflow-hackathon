/**
 * Certificate data hooks. Participants only list/read/download — issuance is
 * async + organizer-triggered (MOBILE_API.md §4).
 */
import { useQuery } from "@tanstack/react-query";

import { accountSdk, publicSdk } from "@shared/api";
import type { Lang } from "@shared/data/events";

type SdkCertificatesQuery = Parameters<
  typeof accountSdk.certificates.getCertificates
>[0];

export interface CertificatesQuery {
  search?: string;
  filter?: "all" | "verified" | "unverified";
  locale?: Lang;
}

export const certificateKeys = {
  all: ["certificates"] as const,
  list: (query?: CertificatesQuery) =>
    ["certificates", "list", query ?? {}] as const,
  stats: ["certificates", "stats"] as const,
  detail: (id: string) => ["certificates", "detail", id] as const,
  verify: (code: string) => ["certificates", "verify", code] as const,
};

export function useCertificatesQuery(
  query?: CertificatesQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: certificateKeys.list(query),
    queryFn: () =>
      accountSdk.certificates.getCertificates(
        query as unknown as SdkCertificatesQuery,
      ),
    enabled: options?.enabled ?? true,
  });
}

export function useCertificatesStatsQuery() {
  return useQuery({
    queryKey: certificateKeys.stats,
    queryFn: () => accountSdk.certificates.getStats(),
  });
}

export function useCertificateQuery(id: string | undefined) {
  return useQuery({
    queryKey: certificateKeys.detail(id ?? ""),
    queryFn: () => accountSdk.certificates.getCertificateById(id as string),
    enabled: Boolean(id),
  });
}

/** Public verification payload for an event certificate (organizer / role /
 *  location enrichment — those fields aren't in the account list DTO). A read
 *  behind a POST endpoint, so it lives in useQuery; the code is immutable →
 *  long staleTime. */
export interface CertificateVerifyResult {
  valid: boolean;
  certificate?: {
    id: string;
    eventName: string | null;
    recipientName: string | null;
    issuedAt: string | null;
    eventDate: string | null;
    organizerName: string | null;
    organizerLogoUrl: string | null;
    recipientRole: string | null;
    eventLocation: string | null;
  };
}

export function useCertificateVerifyQuery(code: string | undefined) {
  return useQuery({
    queryKey: certificateKeys.verify(code ?? ""),
    queryFn: () =>
      publicSdk.certificates.verifyPublic({
        code: code as string,
      }) as Promise<CertificateVerifyResult>,
    enabled: Boolean(code),
    staleTime: 5 * 60_000,
  });
}
