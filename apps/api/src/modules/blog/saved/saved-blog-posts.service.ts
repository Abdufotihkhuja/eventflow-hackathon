import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  SavedBlogPostsRepository,
  IPaginatedSavedPosts,
} from './saved-blog-posts.repository';
import { BlogRepository } from '../blog.repository';
import { SavedBlogPostsQueryDto } from './dto';
import { SavedBlogPost, BlogPostStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { BLOG_ERROR_MESSAGES } from '../blog.constants';

@Injectable()
export class SavedBlogPostsService {
  constructor(
    private readonly savedRepository: SavedBlogPostsRepository,
    private readonly blogRepository: BlogRepository,
  ) {}

  /**
   * Сохраняет статью
   */
  async save(postId: string, user: ICurrentUser): Promise<SavedBlogPost> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут сохранять статьи',
      );
    }

    // Проверяем статью
    const post = await this.blogRepository.findById(postId);
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Проверяем не сохранена ли уже
    const isSaved = await this.savedRepository.isSaved(postId, user.sub);
    if (isSaved) {
      throw new ConflictException(BLOG_ERROR_MESSAGES.ALREADY_SAVED);
    }

    return this.savedRepository.create(postId, user.sub);
  }

  /**
   * Удаляет из сохранённых
   */
  async unsave(
    postId: string,
    user: ICurrentUser,
  ): Promise<{ success: boolean }> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут удалять из сохранённых',
      );
    }

    // Проверяем сохранена ли
    const isSaved = await this.savedRepository.isSaved(postId, user.sub);
    if (!isSaved) {
      throw new ConflictException(BLOG_ERROR_MESSAGES.NOT_SAVED);
    }

    await this.savedRepository.delete(postId, user.sub);

    return { success: true };
  }

  /**
   * Получает сохранённые статьи пользователя
   */
  async findUserSaved(
    query: SavedBlogPostsQueryDto,
    user: ICurrentUser,
  ): Promise<IPaginatedSavedPosts> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи имеют сохранённые статьи',
      );
    }

    return this.savedRepository.findByUser(user.sub, query.page, query.limit);
  }

  /**
   * Проверяет, сохранена ли статья
   */
  async checkSaved(
    postId: string,
    user: ICurrentUser,
  ): Promise<{ saved: boolean }> {
    if (user.type !== UserType.USER) {
      return { saved: false };
    }

    const saved = await this.savedRepository.isSaved(postId, user.sub);
    return { saved };
  }
}
