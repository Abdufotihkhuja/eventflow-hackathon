/**
 * Хуки для работы с комментариями событий
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  eventCommentsService,
  EVENT_COMMENTS_QUERY_KEYS,
  type EventComment,
  type CreateEventCommentDto,
} from "@shared/api/eventCommentsService";
import { parseUtcIso } from "@shared/lib/date";

export interface EventCommentNode extends EventComment {
  replies: EventCommentNode[];
}

function buildCommentTree(items: EventComment[]): EventCommentNode[] {
  const byId = new Map<string, EventCommentNode>();
  items.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: EventCommentNode[] = [];
  items.forEach((c) => {
    const node = byId.get(c.id);
    if (!node) return;
    if (!c.parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(c.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    }
  });
  roots.sort(
    (a, b) =>
      parseUtcIso(a.createdAt).getTime() - parseUtcIso(b.createdAt).getTime()
  );
  roots.forEach((r) => {
    r.replies.sort(
      (a, b) =>
        parseUtcIso(a.createdAt).getTime() -
        parseUtcIso(b.createdAt).getTime()
    );
  });
  return roots;
}

export function useEventComments(eventId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: EVENT_COMMENTS_QUERY_KEYS.list(eventId),
    queryFn: () => eventCommentsService.getComments(eventId),
    enabled: Boolean(eventId) && enabled,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateEventCommentDto) =>
      eventCommentsService.createComment(eventId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: EVENT_COMMENTS_QUERY_KEYS.all,
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: ({
      commentId,
      isLike,
    }: {
      commentId: string;
      isLike: boolean;
    }) => eventCommentsService.likeComment(eventId, commentId, isLike),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: EVENT_COMMENTS_QUERY_KEYS.all,
      });
    },
  });

  const tree =
    query.data?.items != null
      ? buildCommentTree(query.data.items)
      : ([] as EventCommentNode[]);

  return {
    tree,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    createMutation,
    likeMutation,
  };
}
