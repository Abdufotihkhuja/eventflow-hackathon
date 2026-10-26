/**
 * Org-scoped certificates for one event (`events/:eventId/certificates`).
 *
 * The attendee-side `entities/certificate` reads the SIGNED-IN USER's own
 * certificates; this is the issuing side and runs on the workspace token behind
 * `PERMISSIONS.CERTIFICATES_*`. Kept as a separate entity for exactly that
 * reason — the two must never share a cache key.
 *
 * Wrapper-free through `apiTransport`, like `translateFields` and the
 * attendance report: the generated SDK has no certificates methods and the
 * contract packages are frozen.
 *
 * Generation is ASYNCHRONOUS by design: `POST generate` may answer either
 * `{ status: "completed", … }` (small batches finish inline) or
 * `{ status: "queued", jobId }`, which then has to be polled via
 * `generation-status/:jobId`. Screens must handle BOTH — assuming one shape is
 * how a progress bar ends up stuck at 0 %.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export interface OrgCertificate {
  id: string;
  registrationId: string;
  templateId: string | null;
  certificateUrl: string | null;
  issuedAt: string | null;
  downloadCount: number;
  recipientName: string | null;
  recipientEmail: string | null;
  generationStatus: string | null;
  /** True when the template changed after this certificate was generated. */
  isStale: boolean;
}

export interface OrgCertificateList {
  certificates: OrgCertificate[];
  total: number;
  page: number;
  limit: number;
}

/** A certificate template — the "constructor" surface (design 4.16). */
export interface CertificateTemplate {
  id: string;
  name?: string | null;
  recipientRole?: string | null;
  sizePreset?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  templateUrl?: string | null;
}

/** Either answer `POST generate` can give. */
export type GenerateResult =
  | { status: "completed"; generated: number; failed: number; skipped: number }
  | { status: "queued"; jobId: string };

export interface GenerationStatus {
  status: string;
  total?: number;
  processed?: number;
  generated?: number;
  failed?: number;
}

export const orgCertKeys = {
  all: ["org-certificates"] as const,
  list: (eventId: string, page: number, search: string) =>
    ["org-certificates", "list", eventId, page, search] as const,
  templates: (eventId: string) => ["org-certificates", "templates", eventId] as const,
  job: (eventId: string, jobId: string) => ["org-certificates", "job", eventId, jobId] as const,
};

export function useEventCertificatesQuery(
  eventId: string | undefined,
  opts?: { page?: number; search?: string },
) {
  const page = opts?.page ?? 1;
  const search = opts?.search ?? "";
  return useQuery({
    queryKey: orgCertKeys.list(eventId ?? "", page, search),
    queryFn: async (): Promise<OrgCertificateList> => {
      const qs = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) qs.set("search", search);
      const res = await apiTransport<Partial<OrgCertificateList>>({
        method: "GET",
        url: `/api/v1/events/${eventId}/certificates?${qs.toString()}`,
      });
      return {
        certificates: res?.certificates ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? page,
        limit: res?.limit ?? 50,
      };
    },
    enabled: Boolean(eventId),
  });
}

export function useCertificateTemplatesQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: orgCertKeys.templates(eventId ?? ""),
    queryFn: async (): Promise<CertificateTemplate[]> => {
      const res = await apiTransport<CertificateTemplate[] | { templates?: CertificateTemplate[] }>({
        method: "GET",
        url: `/api/v1/events/${eventId}/certificates/templates`,
      });
      if (Array.isArray(res)) return res;
      return res?.templates ?? [];
    },
    enabled: Boolean(eventId),
  });
}

/** Poll a queued generation job. Disabled until a jobId exists, and stops
 *  polling once the job is no longer running. */
export function useGenerationStatusQuery(eventId: string | undefined, jobId: string | null) {
  return useQuery({
    queryKey: orgCertKeys.job(eventId ?? "", jobId ?? ""),
    queryFn: async (): Promise<GenerationStatus> => {
      const res = await apiTransport<Partial<GenerationStatus>>({
        method: "GET",
        url: `/api/v1/events/${eventId}/certificates/generation-status/${jobId}`,
      });
      return { status: res?.status ?? "unknown", ...res };
    },
    enabled: Boolean(eventId && jobId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && ["completed", "failed", "error"].includes(s) ? false : 2000;
    },
  });
}

export function useGenerateCertificatesMutation(eventId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      registrationIds?: string[];
      forceRegenerate?: boolean;
    }): Promise<GenerateResult> => {
      const res = await apiTransport<Record<string, unknown>>({
        method: "POST",
        url: `/api/v1/events/${eventId}/certificates/generate`,
        data: input,
      });
      if (res?.status === "queued" && typeof res.jobId === "string") {
        return { status: "queued", jobId: res.jobId };
      }
      return {
        status: "completed",
        generated: Number(res?.generated ?? 0),
        failed: Number(res?.failed ?? 0),
        skipped: Number(res?.skipped ?? 0),
      };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: orgCertKeys.all }),
  });
}
