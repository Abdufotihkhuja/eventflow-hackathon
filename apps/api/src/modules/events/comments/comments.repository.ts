import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, EventComment } from '@prisma/client';

export interface ICommentWithRelations extends EventComment {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  } | null;
  authorOrganization?: {
    id: string;
    companyName: string;
    logoUrl: string | null;
  } | null;
  replies?: ICommentWithRelations[];
  _count: {
    replies: number;
    likes: number;
  };
  likesCount?: number;
  dislikesCount?: number;
  userLikeStatus?: boolean | null;
}

export interface IPaginatedComments {
  data: ICommentWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EventCommentUncheckedCreateInput,
  ): Promise<EventComment> {
    return this.prisma.eventComment.create({ data });
  }

  async findById(id: string): Promise<EventComment | null> {
    return this.prisma.eventComment.findUnique({ where: { id } });
  }

  async findByEventId(
    eventId: string,
    page: number,
    limit: number,
    userId?: string,
  ): Promise<IPaginatedComments> {
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, Math.floor(Number(limit)) || 20),
    );
    const skip = (pageNum - 1) * limitNum;

    const topWhere: Prisma.EventCommentWhereInput = {
      eventId,
      parentId: null,
    };

    // 1) Page of top-level comments + total count.
    const [topComments, total] = await this.prisma.$transaction([
      this.prisma.eventComment.findMany({
        where: topWhere,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
      this.prisma.eventComment.count({ where: topWhere }),
    ]);

    const topIds = topComments.map((c) => c.id);

    // 2) Load every comment for the event in one shot (top-levels + all descendants).
    //    Prisma include can't follow recursive relations, so we flatten and rebuild in JS.
    //    Per-event datasets are small enough; if we grow we can scope by topIds + iterative BFS.
    const flatComments = topIds.length
      ? await this.prisma.eventComment.findMany({
          where: { eventId },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            authorOrganization: {
              select: { id: true, companyName: true, logoUrl: true },
            },
            _count: { select: { replies: true, likes: true } },
          },
        })
      : [];

    // 3) Build parentId → children map, then assemble forest rooted at this page's topIds.
    const byId = new Map<
      string,
      ICommentWithRelations & { replies: ICommentWithRelations[] }
    >();
    for (const c of flatComments) {
      byId.set(c.id, {
        ...(c as unknown as ICommentWithRelations),
        replies: [],
      });
    }
    for (const c of flatComments) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(byId.get(c.id)!);
      }
    }

    // Top-level page preserves the desc-by-createdAt order from step 1.
    const data = topIds
      .map((id) => byId.get(id))
      .filter((c): c is ICommentWithRelations & { replies: ICommentWithRelations[] } =>
        Boolean(c),
      );

    const reactionSnapshot = await this.loadReactionSnapshot(
      this.collectCommentIds(data),
      userId,
    );
    const enrichedData = data.map((comment) =>
      this.enrichComment(comment, reactionSnapshot),
    );

    return {
      data: enrichedData as ICommentWithRelations[],
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async update(
    id: string,
    data: Prisma.EventCommentUpdateInput,
  ): Promise<EventComment> {
    return this.prisma.eventComment.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.eventComment.delete({ where: { id } });
  }

  async toggleLike(
    commentId: string,
    userId: string,
    isLike: boolean,
  ): Promise<void> {
    const existing = await this.prisma.eventCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      if (existing.isLike === isLike) {
        // Если уже есть такая же реакция - удаляем
        await this.prisma.eventCommentLike.delete({
          where: { commentId_userId: { commentId, userId } },
        });
      } else {
        // Иначе меняем реакцию
        await this.prisma.eventCommentLike.update({
          where: { commentId_userId: { commentId, userId } },
          data: { isLike },
        });
      }
    } else {
      // Создаём новую реакцию
      await this.prisma.eventCommentLike.create({
        data: { commentId, userId, isLike },
      });
    }
  }

  async getLikesCounts(commentId: string): Promise<{
    likes: number;
    dislikes: number;
  }> {
    const [likes, dislikes] = await Promise.all([
      this.prisma.eventCommentLike.count({
        where: { commentId, isLike: true },
      }),
      this.prisma.eventCommentLike.count({
        where: { commentId, isLike: false },
      }),
    ]);

    return { likes, dislikes };
  }

  private collectCommentIds(comments: ICommentWithRelations[]): string[] {
    const out: string[] = [];
    const walk = (list: ICommentWithRelations[] | undefined): void => {
      if (!list) return;
      for (const c of list) {
        out.push(c.id);
        walk(c.replies);
      }
    };
    walk(comments);
    return out;
  }

  private async loadReactionSnapshot(commentIds: string[], userId?: string) {
    if (commentIds.length === 0) {
      return {
        counts: new Map<string, { likes: number; dislikes: number }>(),
        userStatuses: new Map<string, boolean>(),
      };
    }

    const [reactions, userReactions] = await Promise.all([
      this.prisma.eventCommentLike.findMany({
        where: { commentId: { in: commentIds } },
        select: { commentId: true, isLike: true },
      }),
      userId
        ? this.prisma.eventCommentLike.findMany({
            where: { commentId: { in: commentIds }, userId },
            select: { commentId: true, isLike: true },
          })
        : Promise.resolve([]),
    ]);

    const counts = new Map<string, { likes: number; dislikes: number }>();
    const userStatuses = new Map<string, boolean>();

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
      userStatuses.set(reaction.commentId, reaction.isLike);
    }

    return { counts, userStatuses };
  }

  private enrichComment(
    comment: ICommentWithRelations,
    reactionSnapshot: {
      counts: Map<string, { likes: number; dislikes: number }>;
      userStatuses: Map<string, boolean>;
    },
  ): ICommentWithRelations {
    const counts = reactionSnapshot.counts.get(comment.id);

    return {
      ...comment,
      likesCount: counts?.likes ?? 0,
      dislikesCount: counts?.dislikes ?? 0,
      userLikeStatus: reactionSnapshot.userStatuses.get(comment.id) ?? null,
      replies: (comment.replies ?? []).map((reply) =>
        this.enrichComment(reply, reactionSnapshot),
      ),
    };
  }
}
