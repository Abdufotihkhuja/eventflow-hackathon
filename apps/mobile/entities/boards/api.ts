/**
 * Kanban boards (`/boards`, `/boards/:id/columns`, `/boards/:id/tasks`).
 *
 * The board IS the task manager on this platform — there is no global task
 * list, tasks only exist inside a board column. Everything here runs on the
 * workspace token.
 *
 * Wrapper-free through `apiTransport`, like the other org entities added in
 * this pass: the generated SDK carries no boards methods.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface BoardSummary {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface BoardColumn {
  id: string;
  name: string;
  color?: string | null;
  position: number;
  wipLimit?: number | null;
  isDefault?: boolean;
}

export interface BoardTaskAssignee {
  id?: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface BoardTask {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  position: number;
  dueDate?: string | null;
  isCompleted: boolean;
  assignees?: BoardTaskAssignee[];
  /** Present on some payloads; used for the checklist progress pill. */
  checklists?: { items?: { isCompleted?: boolean }[] }[];
}

export const boardKeys = {
  all: ["boards"] as const,
  list: () => ["boards", "list"] as const,
  columns: (boardId: string) => ["boards", "columns", boardId] as const,
  tasks: (boardId: string) => ["boards", "tasks", boardId] as const,
};

/** Unwrap the two envelope shapes the API uses (`[]` or `{ data: [] }`). */
function listOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

export function useBoardsQuery(enabled = true) {
  return useQuery({
    queryKey: boardKeys.list(),
    queryFn: async (): Promise<BoardSummary[]> =>
      listOf<BoardSummary>(await apiTransport({ method: "GET", url: "/api/v1/boards" })),
    enabled,
  });
}

export function useBoardColumnsQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardKeys.columns(boardId ?? ""),
    queryFn: async (): Promise<BoardColumn[]> => {
      const cols = listOf<BoardColumn>(
        await apiTransport({ method: "GET", url: `/api/v1/boards/${boardId}/columns` }),
      );
      return [...cols].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    },
    enabled: Boolean(boardId),
  });
}

export function useBoardTasksQuery(boardId: string | undefined) {
  return useQuery({
    queryKey: boardKeys.tasks(boardId ?? ""),
    queryFn: async (): Promise<BoardTask[]> =>
      listOf<BoardTask>(
        // No `limit` — the endpoint returns the whole board and its DTO rejects
        // unknown query params (400 "property limit should not exist").
        await apiTransport({ method: "GET", url: `/api/v1/boards/${boardId}/tasks` }),
      ),
    enabled: Boolean(boardId),
  });
}

/**
 * Move a task to another column.
 *
 * Optimistic on purpose: on a phone the move is a deliberate swipe/tap and the
 * card must land immediately — waiting a round-trip makes the board feel
 * broken. The previous task list is snapshotted and restored if the PATCH
 * fails, so a failed move never leaves a card in the wrong column.
 */
export function useMoveTaskMutation(boardId: string | undefined) {
  const qc = useQueryClient();
  const key = boardKeys.tasks(boardId ?? "");
  return useMutation({
    mutationFn: async ({ taskId, columnId }: { taskId: string; columnId: string }) =>
      apiTransport({
        method: "PATCH",
        url: `/api/v1/boards/${boardId}/tasks/${taskId}/move`,
        data: { columnId },
      }),
    onMutate: async ({ taskId, columnId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardTask[]>(key);
      qc.setQueryData<BoardTask[]>(key, (old) =>
        (old ?? []).map((t) => (t.id === taskId ? { ...t, columnId } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateTaskMutation(boardId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: Partial<BoardTask> }) =>
      apiTransport({
        method: "PATCH",
        url: `/api/v1/boards/${boardId}/tasks/${taskId}`,
        data: patch,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: boardKeys.tasks(boardId ?? "") }),
  });
}
