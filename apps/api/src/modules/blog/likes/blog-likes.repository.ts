import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BlogLikesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверяет, лайкнул ли пользователь статью
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.blogPostLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });
    return !!like;
  }

  /**
   * Добавляет лайк
   */
  async create(postId: string, userId: string): Promise<void> {
    await this.prisma.blogPostLike.create({
      data: {
        postId,
        userId,
      },
    });
  }

  /**
   * Удаляет лайк
   */
  async delete(postId: string, userId: string): Promise<void> {
    await this.prisma.blogPostLike.delete({
      where: {
        postId_userId: { postId, userId },
      },
    });
  }

  /**
   * Получает количество лайков статьи
   */
  async countByPost(postId: string): Promise<number> {
    return this.prisma.blogPostLike.count({
      where: { postId },
    });
  }
}
