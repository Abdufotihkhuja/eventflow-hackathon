/**
 * Хуки для работы с комментариями статей блога
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  blogCommentsService,
  BLOG_COMMENTS_QUERY_KEYS,
  type BlogComment,
  type CreateBlogCommentDto,
} from "@shared/api/blogCommentsService";
import { parseUtcIso } from "@shared/lib/date";

export interface BlogCommentNode extends BlogComment {
  replies: BlogCommentNode[];
}

function buildCommentTree(items: BlogComment[]): BlogCommentNode[] {
  const byId = new Map<string, BlogCommentNode>();
  items.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: BlogCommentNode[] = [];
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

export function useBlogComments(postId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BLOG_COMMENTS_QUERY_KEYS.list(postId),
    queryFn: () => blogCommentsService.getComments(postId),
    enabled: Boolean(postId) && enabled,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateBlogCommentDto) =>
      blogCommentsService.createComment(postId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: BLOG_COMMENTS_QUERY_KEYS.all,
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
    }) => blogCommentsService.likeComment(postId, commentId, isLike),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: BLOG_COMMENTS_QUERY_KEYS.all,
      });
    },
  });

  const tree =
    query.data?.items != null
      ? buildCommentTree(query.data.items)
      : ([] as BlogCommentNode[]);

  return {
    tree,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    createMutation,
    likeMutation,
  };
}
