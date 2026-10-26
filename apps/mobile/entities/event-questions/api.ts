/**
 * Registration questions (org session) — the mobile half of the web cabinet's
 * «Вопросы регистрации».
 *
 * CONTRACT NOTES, all enforced server-side and all easy to get wrong:
 *  · `category` and `type` are separate axes. CLOSED (yes/no) and ALTERNATIVE
 *    (pick from a list) BOTH require `options` — the validator rejects them
 *    without, whatever the `type` says.
 *  · in TEST mode a question needs `points > 0`; ALTERNATIVE needs
 *    `correctOptions` drawn from `options`, CLOSED needs `correctAnswer`.
 *  · RHETORICAL carries `informationalText` and collects no answer at all.
 *
 * Not built here: the file-upload settings (allowed types, size and count
 * limits, a template file to download) and the per-locale translations — both
 * are desk work, and a half-configured upload question is worse than none.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export const QUESTION_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "SELECT", "CHECKBOX", "FILE_UPLOAD"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_CATEGORIES = ["OPEN", "CLOSED", "ALTERNATIVE", "RHETORICAL"] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export interface EventQuestion {
  id: string;
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired?: boolean;
  options?: string[] | null;
  points?: number | null;
  correctAnswer?: string | null;
  correctOptions?: string[] | null;
  informationalText?: string | null;
  sortOrder?: number | null;
}

export interface QuestionInput {
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired?: boolean;
  options?: string[];
  points?: number;
  correctAnswer?: string;
  correctOptions?: string[];
  informationalText?: string;
}

export const questionKeys = {
  all: ["event-questions"] as const,
  list: (eventId: string) => ["event-questions", eventId] as const,
};

function listOf(raw: unknown): EventQuestion[] {
  if (Array.isArray(raw)) return raw as EventQuestion[];
  const data = (raw as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as EventQuestion[]) : [];
}

/** Shared with the section rail's badge — same cache entry, no second fetch. */
export async function fetchQuestions(eventId: string): Promise<EventQuestion[]> {
  const rows = listOf(await apiTransport({ method: "GET", url: `/api/v1/events/${eventId}/questions` }));
  return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function useQuestionsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: questionKeys.list(eventId ?? ""),
    queryFn: () => fetchQuestions(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

export function useCreateQuestionMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionInput) =>
      apiTransport({ method: "POST", url: `/api/v1/events/${eventId}/questions`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: questionKeys.list(eventId) }),
  });
}

export function useUpdateQuestionMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: QuestionInput & { id: string }) =>
      apiTransport({ method: "PATCH", url: `/api/v1/events/${eventId}/questions/${id}`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: questionKeys.list(eventId) }),
  });
}

export function useDeleteQuestionMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiTransport({ method: "DELETE", url: `/api/v1/events/${eventId}/questions/${id}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: questionKeys.list(eventId) }),
  });
}

/** Move one question up or down by rewriting the whole order — that is what
 *  `PATCH /questions/reorder` takes, and one step is all a phone needs.
 *
 *  Applied to the cache first: an arrow tap that waits for a round-trip before
 *  the row moves reads as a dropped tap, and the fix people reach for is
 *  tapping again — which would send a second, different order. */
export function useReorderQuestionsMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionIds: string[]) =>
      apiTransport({
        method: "PATCH",
        url: `/api/v1/events/${eventId}/questions/reorder`,
        data: { questionIds },
      }),
    onMutate: async (questionIds: string[]) => {
      const key = questionKeys.list(eventId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<EventQuestion[]>(key);
      if (snapshot) {
        const byId = new Map(snapshot.map((q) => [q.id, q]));
        const next: EventQuestion[] = [];
        questionIds.forEach((id, i) => {
          const q = byId.get(id);
          if (q) next.push({ ...q, sortOrder: i });
        });
        qc.setQueryData(key, next);
      }
      return snapshot;
    },
    onError: (_e, _ids, snapshot) => {
      if (snapshot) qc.setQueryData(questionKeys.list(eventId), snapshot);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: questionKeys.list(eventId) }),
  });
}

/** Categories that cannot be saved without answer options. */
export function needsOptions(category: QuestionCategory, questionType: QuestionType): boolean {
  return (
    category === "CLOSED" ||
    category === "ALTERNATIVE" ||
    questionType === "SELECT" ||
    questionType === "CHECKBOX"
  );
}
