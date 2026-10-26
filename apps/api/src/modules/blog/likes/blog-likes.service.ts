import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BlogLikesRepository } from './blog-likes.repository';
import { BlogRepository } from '../blog.repository';
import { BlogPostStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { BLOG_ERROR_MESSAGES } from '../blog.constants';

@Injectable()
export class BlogLikesService {
  constructor(
    private readonly likesRepository: BlogLikesRepository,
    private readonly blogRepository: BlogRepository,
  ) {}

  /**
   * Ставит лайк статье
   */
  async like(
    postId: string,
    user: ICurrentUser,
  ): Promise<{ success: boolean; likesCount: number }> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Только пользователи могут ставить лайки');
    }

    // Проверяем статью
    const post = await this.blogRepository.findById(postId);
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Проверяем не лайкнул ли уже
    const hasLiked = await this.likesRepository.hasLiked(postId, user.sub);
    if (hasLiked) {
      throw new ConflictException(BLOG_ERROR_MESSAGES.ALREADY_LIKED);
    }

    // Добавляем лайк
    await this.likesRepository.create(postId, user.sub);

    // Обновляем счётчик
    await this.blogRepository.updateLikesCount(postId, true);

    const likesCount = await this.likesRepository.countByPost(postId);

    return { success: true, likesCount };
  }

  /**
   * Убирает лайк со статьи
   */
  async unlike(
    postId: string,
    user: ICurrentUser,
  ): Promise<{ success: boolean; likesCount: number }> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Только пользователи могут убирать лайки');
    }

    // Проверяем статью (должна быть опубликована)
    const post = await this.blogRepository.findById(postId);
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Проверяем лайкнул ли
    const hasLiked = await this.likesRepository.hasLiked(postId, user.sub);
    if (!hasLiked) {
      throw new ConflictException(BLOG_ERROR_MESSAGES.NOT_LIKED);
    }

    // Удаляем лайк
    await this.likesRepository.delete(postId, user.sub);

    // Обновляем счётчик
    await this.blogRepository.updateLikesCount(postId, false);

    const likesCount = await this.likesRepository.countByPost(postId);

    return { success: true, likesCount };
  }

  /**
   * Проверяет, лайкнул ли пользователь статью
   */
  async checkLiked(
    postId: string,
    user: ICurrentUser,
  ): Promise<{ liked: boolean }> {
    if (user.type !== UserType.USER) {
      return { liked: false };
    }

    const liked = await this.likesRepository.hasLiked(postId, user.sub);
    return { liked };
  }
}
