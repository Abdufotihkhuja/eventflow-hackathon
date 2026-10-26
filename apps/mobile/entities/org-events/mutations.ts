/**
 * Org event mutations (W7): create, edit, submit-for-review, cancel, complete —
 * all on the workspace session token via the sdk-workspace `events.*` wrappers
 * (built in W6-2; consumed, never edited). Every mutation invalidates BOTH the
 * org-events list/detail keys and the org-dashboard keys, since a new/changed
 * event shifts the dashboard KPIs and activity feed.
 *
 * Contract truths baked in (backend-recon):
 *   • There is NO publish endpoint — DRAFT → submit-review (403 unless the org
 *     is verified) → moderation → PUBLISHED. No unpublish; only cancel/complete.
 *   • `description` is BlockNote JSON (an array of blocks). The mobile form
 *     ships a single plain-text paragraph — `plainTextToBlocks` wraps it exactly
 *     like web-workspace's rich-text field (`{ type:'paragraph', content:[…] }`).
 *   • Cover image: there is no sdk-workspace `uploads` wrapper, so the multipart
 *     `POST /uploads/image` runs straight through the shared `apiTransport`
 *     (carries the active org token). It returns `{ url }`, which becomes the
 *     event's `coverImage` string — the create/edit endpoints take JSON, not
 *     multipart.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiTransport, workspaceSdk } from "@shared/api";
import { orgDashboardKeys } from "@entities/org-dashboard";

import { orgEventsKeys } from "./api";
import { toOrgEventRow, type OrgEventRow } from "./model";

/** One BlockNote paragraph block wrapping the plain-text description — the same
 *  shape web-workspace's rich-text editor emits for a plain string (its
 *  `blocks = [{ type:'paragraph', content:value }]` fallback). We emit the
 *  fully-expanded inline form the API's example documents, so the block passes
 *  validation regardless of server-side normalization. Empty text → `[]`
 *  (the field is optional; an empty paragraph array is what "no description"
 *  serializes to). */
export function plainTextToBlocks(text: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Preserve author line breaks as separate paragraph blocks.
  return trimmed.split(/\n{2,}|\n/).map((line, i) => ({
    id: `p-${i}`,
    type: "paragraph",
    props: {},
    content: line
      ? [{ type: "text", text: line, styles: {} }]
      : [],
    children: [],
  }));
}

/** Recover plain text from a BlockNote description (for edit prefill). Walks
 *  paragraph blocks' inline text runs; unknown block shapes are skipped. */
export function blocksToPlainText(description: unknown): string {
  if (!Array.isArray(description)) return "";
  const lines: string[] = [];
  for (const block of description) {
    const b = block as { content?: unknown };
    if (!Array.isArray(b?.content)) {
      lines.push("");
      continue;
    }
    const text = b.content
      .map((run) => {
        const r = run as { text?: unknown };
        return typeof r?.text === "string" ? r.text : "";
      })
      .join("");
    lines.push(text);
  }
  return lines.join("\n").trim();
}

/** `EventAccessType` from the Prisma schema, in the order the wizard shows it. */
export type EventAccessType = "OPEN" | "REQUEST" | "INVITE_ONLY" | "PRIVATE";

/** The three content locales the platform speaks (`APP_LOCALES`). */
export const EVENT_LOCALES = ["ru", "uz", "en"] as const;
export type EventLocale = (typeof EVENT_LOCALES)[number];

/** Which plain-text event fields carry per-locale translations
 *  (`EVENT_TRANSLATION_FIELDS` on the API). `description` is NOT here — it is a
 *  BlockNote document and travels in `richTranslations` instead. */
export const TRANSLATABLE_FIELDS = ["title", "shortDescription", "venue"] as const;
export type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

/** `{ title: { ru: "…", uz: "…" }, … }` — field → locale → text. */
export type EventTranslations = Partial<Record<TranslatableField, Partial<Record<EventLocale, string>>>>;

/** Shape the create/edit endpoints accept (reduced subset of CreateEventDto —
 *  the mobile form only exposes these fields; the rest keep server defaults). */
export interface EventFormPayload {
  title: string;
  description: unknown[];
  /** Preview blurb (≤500 chars) — shown on cards and the public page. */
  shortDescription?: string;
  /** Per-locale copies of title / shortDescription / venue. The host locale's
   *  own text stays in the top-level fields; this map holds the OTHER two. */
  translations?: EventTranslations;
  type: "FREE" | "PAID";
  format: "OFFLINE" | "ONLINE" | "HYBRID";
  /** All four `EventAccessType` values the API accepts — the wizard's "Доступ
   *  к событию" step exposes them; it used to be hard-pinned to OPEN. */
  accessType: EventAccessType;
  startDate: string;
  endDate: string;
  /** ISO instant, or null to clear (registration stays open until the event
   *  starts). Omit the key entirely to leave the server's value alone. */
  registrationDeadline?: string | null;
  registrationOpen: boolean;
  commentsEnabled: boolean;
  venue?: string;
  address?: string;
  city?: string;
  /** Venue point picked on the map — feeds the public event map. */
  latitude?: number;
  longitude?: number;
  /** Meeting link for ONLINE / HYBRID. The old mobile form collected this and
   *  then silently dropped it on submit — it is wired through now. */
  onlineUrl?: string;
  price?: number;
  currency?: "UZS" | "USD" | "EUR" | "RUB";
  maxParticipants?: number;
  coverImage?: string;
  categoryIds?: string[];
  slug?: string;
}

/** Upload a cover image on the active (org) token → returns the stored URL.
 *  Wrapper-free: sdk-workspace has no `uploads` method, and packages are frozen
 *  in W7 — the shared transport already handles `FormData` + auth, so this is
 *  the honest single-call path. `file` is a browser `File` (web) or an RN
 *  file descriptor `{ uri, name, type }` (native). */
export async function uploadCoverImage(
  file: File | { uri: string; name: string; type: string },
): Promise<string> {
  const form = new FormData();
  // RN's FormData accepts the `{ uri, name, type }` descriptor; the DOM's
  // accepts a File. Both satisfy the multipart `file` field the endpoint reads.
  form.append("file", file as unknown as Blob);
  const res = await apiTransport<{ url?: string }>({
    method: "POST",
    url: "/api/v1/uploads/image",
    data: form,
  });
  if (!res?.url) throw new Error("Upload failed");
  return res.url;
}

/** Machine-translate plain business fields (`POST /translations/batch`).
 *  Wrapper-free for the same reason as `uploadCoverImage`: the generated SDK has
 *  no translations method and the packages are frozen, while the shared
 *  transport already carries auth. `contentType` is `plain_text` — the only
 *  value the API's `TRANSLATION_CONTENT_TYPES` accepts today.
 *
 *  Returns field → locale → text for everything that came back translated;
 *  failures are simply absent, so a partial provider outage degrades to "some
 *  locales filled" rather than an error the user cannot act on. */
export async function translateFields(
  sourceLocale: EventLocale,
  targetLocales: EventLocale[],
  items: { fieldKey: TranslatableField; text: string }[],
): Promise<EventTranslations> {
  const targets = targetLocales.filter((l) => l !== sourceLocale);
  const payload = items.filter((i) => i.text.trim().length > 0);
  if (targets.length === 0 || payload.length === 0) return {};

  const res = await apiTransport<{
    results?: {
      fieldKey?: string;
      targetLocale?: string;
      status?: string;
      translatedText?: string | null;
    }[];
  }>({
    method: "POST",
    url: "/api/v1/translations/batch",
    data: {
      sourceLocale,
      targetLocales: targets,
      items: payload.map((i) => ({ fieldKey: i.fieldKey, text: i.text.trim(), contentType: "plain_text" })),
    },
  });

  const out: EventTranslations = {};
  for (const r of res?.results ?? []) {
    const field = r.fieldKey as TranslatableField | undefined;
    const locale = r.targetLocale as EventLocale | undefined;
    if (!field || !locale || !r.translatedText) continue;
    if (!TRANSLATABLE_FIELDS.includes(field)) continue;
    (out[field] ??= {})[locale] = r.translatedText;
  }
  return out;
}

/** Slug helpers (org token). `suggestSlug` derives a unique slug from a title;
 *  `checkSlug` verifies availability (excludeId when editing). */
export async function suggestSlug(title: string, excludeId?: string): Promise<string> {
  const res = await workspaceSdk.events.suggestSlug({ title, excludeId });
  return res.slug;
}

export async function checkSlug(slug: string, excludeId?: string): Promise<boolean> {
  const res = await workspaceSdk.events.checkSlug({ slug, excludeId });
  return res.available;
}

/** Invalidate every surface a mutated event touches. `orgEventsKeys.all` is the
 *  `["org-events"]` prefix, so it refetches the list, the compact `detail` row,
 *  AND the fuller `editable` payload in one call; the dashboard (KPIs +
 *  activity) shifts too. */
function useInvalidateOrg(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: orgEventsKeys.all });
    void qc.invalidateQueries({ queryKey: orgDashboardKeys.all });
  };
}

export function useCreateEventMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async (payload: EventFormPayload): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.createEvent(payload as never)),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEventMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<EventFormPayload>;
    }): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.updateEvent(id, payload as never)),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitReviewMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async (id: string): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.submitForReview(id)),
    onSuccess: () => invalidate(),
  });
}

export function useCancelEventMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async (id: string): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.cancelEvent(id)),
    onSuccess: () => invalidate(),
  });
}

/**
 * Удаление события (design 4.4 §long-press).
 *
 * `DELETE /events/:id` не проверяет статус — снесёт и опубликованное, вместе с
 * регистрациями. Экран поэтому предлагает удаление ТОЛЬКО для черновика, а
 * живому событию — отмену: у продукта для этого есть отдельная операция, и
 * участники должны узнать, а не обнаружить пустоту по ссылке.
 */
export function useDeleteEventMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await workspaceSdk.events.deleteEvent(id);
    },
    onSuccess: () => invalidate(),
  });
}

export function useCompleteEventMutation() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: async (id: string): Promise<OrgEventRow> =>
      toOrgEventRow(await workspaceSdk.events.completeEvent(id)),
    onSuccess: () => invalidate(),
  });
}
