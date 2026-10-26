import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BlogPostComment, Prisma } from '@prisma/client';
import { MAX_COMMENT_REPLY_DEPTH } from '../blog.constants';

export interface IPaginatedComments {
  data: BlogPostComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ICommentWithAuthor extends BlogPostComment {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  _count: {
    replies: number;
  };
  likesCount: number;
  dislikesCount: number;
  userLike?: boolean | null;
}

/** Строит вложенный include для replies до заданной глубины (для дерева комментариев). */
function buildRepliesInclude(
  depth: number,
): Prisma.BlogPostCommentInclude {
  const base = {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    },
    _count: { select: { replies: true, likes: true } },
  };
  if (depth <= 0) return base as Prisma.BlogPostCommentInclude;
  return {
    ...base,
    replies: {
      include: buildRepliesInclude(depth - 1),
      orderBy: { createdAt: 'asc' },
    },
  } as Prisma.BlogPostCommentInclude;
}

/** Рекурсивно собирает все id комментариев из дерева. */
function collectCommentIds(comments: Array<{ id: string; replies?: unknown[] }>): string[] {
  const ids: string[] = [];
  for (const c of comments) {
    ids.push(c.id);
    if (c.replies?.length) {
      ids.push(
        ...collectCommentIds(c.replies as { id: string; replies?: unknown[] }[]),
      );
    }
  }
  return ids;
}

type BlogCommentTreeNode = BlogPostComment & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  replies?: BlogCommentTreeNode[];
  _count: {
    replies: number;
    likes: number;
  };
};

@Injectable()
export class BlogCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт комментарий
   */
  async create(
    data: Prisma.BlogPostCommentCreateInput,
  ): Promise<BlogPostComment> {
    return this.prisma.blogPostComment.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Возвращает глубину комментария в дереве (0 = корневой, 1 = ответ на корневой и т.д.)
   */
  async getDepth(commentId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = commentId;
    while (currentId) {
      const comment: { parentId: string | null } | null =
        await this.prisma.blogPostComment.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      if (!comment) return 0;
      if (!comment.parentId) return depth;
      depth += 1;
      currentId = comment.parentId;
    }
    return depth;
  }

  /**
   * Находит комментарий по ID
   */
  async findById(id: string): Promise<BlogPostComment | null> {
    return this.prisma.blogPostComment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Получает комментарии статьи (только корневые)
   */
  async findByPost(
    postId: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<IPaginatedComments> {
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostCommentWhereInput = {
      postId,
      parentId: null, // Только корневые комментарии
    };

    const repliesInclude = buildRepliesInclude(MAX_COMMENT_REPLY_DEPTH);

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.blogPostComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          replies: {
            include: repliesInclude,
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { replies: true, likes: true },
          },
        },
      }),
      this.prisma.blogPostComment.count({ where }),
    ]);

    const allIds = comments.flatMap((c) => [
      c.id,
      ...collectCommentIds(
        ((c as unknown as BlogCommentTreeNode).replies ?? []) as Array<{
          id: string;
          replies?: unknown[];
        }>,
      ),
    ]);
    const reactionSnapshot = await this.loadReactionSnapshot(allIds, userId);

    const commentsWithCounts = comments.map((comment) =>
      this.enrichCommentTree(
        comment as unknown as BlogCommentTreeNode,
        reactionSnapshot.counts,
        reactionSnapshot.userLikes,
      ),
    );

    return {
      data: commentsWithCounts as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Обновляет комментарий
   */
  async update(id: string, content: string): Promise<BlogPostComment> {
    return this.prisma.blogPostComment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Удаляет комментарий
   */
  async delete(id: string): Promise<void> {
    await this.prisma.blogPostComment.delete({ where: { id } });
  }

  /**
   * Ставит лайк/дизлайк комментарию
   */
  async toggleLike(
    commentId: string,
    userId: string,
    isLike: boolean,
  ): Promise<void> {
    const existing = await this.prisma.blogPostCommentLike.findUnique({
      where: {
        commentId_userId: { commentId, userId },
      },
    });

    if (existing) {
      if (existing.isLike === isLike) {
        // Убираем реакцию если повторный клик
        await this.prisma.blogPostCommentLike.delete({
          where: {
            commentId_userId: { commentId, userId },
          },
        });
      } else {
        // Меняем реакцию
        await this.prisma.blogPostCommentLike.update({
          where: {
            commentId_userId: { commentId, userId },
          },
          data: { isLike },
        });
      }
    } else {
      // Создаём новую реакцию
      await this.prisma.blogPostCommentLike.create({
        data: {
          commentId,
          userId,
          isLike,
        },
      });
    }
  }

  /**
   * Получает количество комментариев поста
   */
  async countByPost(postId: string): Promise<number> {
    return this.prisma.blogPostComment.count({ where: { postId } });
  }

  private async loadReactionSnapshot(commentIds: string[], userId?: string) {
    if (commentIds.length === 0) {
      return {
        counts: new Map<string, { likes: number; dislikes: number }>(),
        userLikes: new Map<string, boolean>(),
      };
    }

    const [reactions, userReactions] = await Promise.all([
      this.prisma.blogPostCommentLike.findMany({
        where: { commentId: { in: commentIds } },
        select: { commentId: true, isLike: true },
      }),
      userId
        ? this.prisma.blogPostCommentLike.findMany({
            where: { commentId: { in: commentIds }, userId },
            select: { commentId: true, isLike: true },
          })
        : Promise.resolve([]),
    ]);

    const counts = new Map<string, { likes: number; dislikes: number }>();
    const userLikes = new Map<string, boolean>();

    for (const reaction of reactions) {
      const current = counts.get(reaction.commentId) ?? { likes: 0, dislikes: 0 };

      if (reaction.isLike) {
        current.likes += 1;
      } else {
        current.dislikes += 1;
      }

      counts.set(reaction.commentId, current);
    }

    for (const reaction of userReactions) {
      userLikes.set(reaction.commentId, reaction.isLike);
    }

    return { counts, userLikes };
  }

  private enrichCommentTree(
    comment: BlogCommentTreeNode,
    counts: Map<string, { likes: number; dislikes: number }>,
    userLikes: Map<string, boolean>,
  ): ICommentWithAuthor {
    const { replies, ...rest } = comment;
    const reactionCounts = counts.get(comment.id);

    return {
      ...rest,
      likesCount: reactionCounts?.likes ?? 0,
      dislikesCount: reactionCounts?.dislikes ?? 0,
      userLike: userLikes.has(comment.id)
        ? userLikes.get(comment.id) ?? null
        : null,
      replies: (replies ?? []).map((reply) =>
        this.enrichCommentTree(reply, counts, userLikes),
      ),
    } as ICommentWithAuthor;
  }
}
