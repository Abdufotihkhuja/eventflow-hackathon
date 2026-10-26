/**
 * Organization blog posts (`/blog-posts`, workspace token).
 *
 * Posts follow the SAME moderated lifecycle as events — an organizer never
 * publishes directly: DRAFT → (submit) → PENDING_REVIEW → APPROVED/REJECTED →
 * PUBLISHED. Screens must not offer a "publish" affordance; the only forward
 * action an organizer has is `submit`.
 *
 * `content` is a BlockNote document, exactly like an event description, so the
 * same plain-text bridge is reused rather than a second parallel one.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";
import { blocksToPlainText, plainTextToBlocks } from "@entities/org-events";

export type BlogPostStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED";

export interface BlogPost {
  id: string;
  title: string;
  slug?: string | null;
  status: BlogPostStatus;
  excerpt?: string | null;
  content?: unknown;
  coverImage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  viewsCount?: number | null;
}

export interface BlogPostPayload {
  title: string;
  content: unknown[];
  slug?: string;
  excerpt?: string;
  coverImage?: string;
}

export const blogKeys = {
  all: ["org-blog"] as const,
  list: (search: string) => ["org-blog", "list", search] as const,
  detail: (id: string) => ["org-blog", "detail", id] as const,
};

function listOf<T>(res: unknown): { data: T[]; total: number } {
  if (Array.isArray(res)) return { data: res as T[], total: res.length };
  const r = res as { data?: unknown; total?: number };
  return { data: Array.isArray(r?.data) ? (r.data as T[]) : [], total: r?.total ?? 0 };
}

export function useBlogPostsQuery(search = "", enabled = true) {
  return useQuery({
    queryKey: blogKeys.list(search),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "50" });
      if (search) qs.set("search", search);
      return listOf<BlogPost>(await apiTransport({ method: "GET", url: `/api/v1/blog-posts?${qs.toString()}` }));
    },
    enabled,
  });
}

export function useBlogPostQuery(id: string | undefined) {
  return useQuery({
    queryKey: blogKeys.detail(id ?? ""),
    queryFn: async (): Promise<BlogPost> =>
      (await apiTransport({ method: "GET", url: `/api/v1/blog-posts/${id}` })) as BlogPost,
    enabled: Boolean(id),
  });
}

export function useSaveBlogPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: BlogPostPayload }): Promise<BlogPost> =>
      (await apiTransport({
        method: id ? "PATCH" : "POST",
        url: id ? `/api/v1/blog-posts/${id}` : "/api/v1/blog-posts",
        data: payload,
      })) as BlogPost,
    onSuccess: () => void qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

/** The only forward action an organizer has — publishing is the moderator's. */
export function useSubmitBlogPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiTransport({ method: "POST", url: `/api/v1/blog-posts/${id}/submit` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

export function useDeleteBlogPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiTransport({ method: "DELETE", url: `/api/v1/blog-posts/${id}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

export { blocksToPlainText, plainTextToBlocks };
