import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SavedBlogPost, BlogPostStatus } from '@prisma/client';

export interface IPaginatedSavedPosts {
  data: SavedBlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SavedBlogPostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверяет, сохранена ли статья
   */
  async isSaved(postId: string, userId: string): Promise<boolean> {
    const saved = await this.prisma.savedBlogPost.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });
    return !!saved;
  }

  /**
   * Сохраняет статью
   */
  async create(postId: string, userId: string): Promise<SavedBlogPost> {
    return this.prisma.savedBlogPost.create({
      data: {
        postId,
        userId,
      },
      include: {
        post: {
          include: {
            organization: {
              select: { id: true, name: true, logoUrl: true },
            },
          },
        },
      },
    });
  }

  /**
   * Удаляет из сохранённых
   */
  async delete(postId: string, userId: string): Promise<void> {
    await this.prisma.savedBlogPost.delete({
      where: {
        userId_postId: { userId, postId },
      },
    });
  }

  /**
   * Возвращает множество ID постов, сохранённых пользователем (для пакетной подстановки saved в ответы).
   */
  async findSavedPostIdsByUserId(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedBlogPost.findMany({
      where: { userId },
      select: { postId: true },
    });
    return rows.map((r) => r.postId);
  }

  /**
   * Получает сохранённые статьи пользователя
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IPaginatedSavedPosts> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.savedBlogPost.findMany({
        where: {
          userId,
          post: {
            status: BlogPostStatus.PUBLISHED,
          },
        },
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
        include: {
          post: {
            include: {
              organization: {
                select: { id: true, name: true, logoUrl: true },
              },
              tags: {
                include: { tag: true },
              },
            },
          },
        },
      }),
      this.prisma.savedBlogPost.count({
        where: {
          userId,
          post: {
            status: BlogPostStatus.PUBLISHED,
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
