import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  BlogCommentsRepository,
  IPaginatedComments,
} from './blog-comments.repository';
import { BlogRepository } from '../blog.repository';
import {
  CreateBlogCommentDto,
  UpdateBlogCommentDto,
  BlogCommentsQueryDto,
} from './dto';
import { BlogPostComment, BlogPostStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import {
  BLOG_ERROR_MESSAGES,
  MAX_COMMENT_REPLY_DEPTH,
} from '../blog.constants';

@Injectable()
export class BlogCommentsService {
  constructor(
    private readonly commentsRepository: BlogCommentsRepository,
    private readonly blogRepository: BlogRepository,
  ) {}

  /**
   * Создаёт комментарий
   * @throws ForbiddenException если комментарии отключены
   * @throws BadRequestException если родительский комментарий не найден
   */
  async create(
    postId: string,
    dto: CreateBlogCommentDto,
    user: ICurrentUser,
  ): Promise<BlogPostComment> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут оставлять комментарии',
      );
    }

    // Проверяем статью
    const post = await this.blogRepository.findById(postId);
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    // Проверяем что комментарии включены
    if (!post.commentsEnabled) {
      throw new ForbiddenException(BLOG_ERROR_MESSAGES.COMMENTS_DISABLED);
    }

    // Проверяем родительский комментарий если указан
    if (dto.parentId) {
      const parent = await this.commentsRepository.findById(dto.parentId);
      if (!parent || (parent as any).postId !== postId) {
        throw new BadRequestException('Родительский комментарий не найден');
      }
      // Вложенность ответов — до 4 уровней (корень + 4 уровня внутрь)
      const parentDepth = await this.commentsRepository.getDepth(dto.parentId);
      if (parentDepth >= MAX_COMMENT_REPLY_DEPTH) {
        throw new BadRequestException(
          BLOG_ERROR_MESSAGES.MAX_REPLY_DEPTH_EXCEEDED(MAX_COMMENT_REPLY_DEPTH),
        );
      }
    }

    const comment = await this.commentsRepository.create({
      content: dto.content,
      post: { connect: { id: postId } },
      user: { connect: { id: user.sub } },
      ...(dto.parentId && { parent: { connect: { id: dto.parentId } } }),
    });

    // Инкрементируем счётчик комментариев
    await this.blogRepository.updateCommentsCount(postId, true);

    return comment;
  }

  /**
   * Получает комментарии статьи
   */
  async findByPost(
    postId: string,
    query: BlogCommentsQueryDto,
    user?: ICurrentUser,
  ): Promise<IPaginatedComments> {
    // Проверяем статью
    const post = await this.blogRepository.findById(postId);
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.POST_NOT_FOUND);
    }

    return this.commentsRepository.findByPost(
      postId,
      query.page,
      query.limit,
      user?.type === UserType.USER ? user.sub : undefined,
    );
  }

  /**
   * Обновляет комментарий
   */
  async update(
    postId: string,
    commentId: string,
    dto: UpdateBlogCommentDto,
    user: ICurrentUser,
  ): Promise<BlogPostComment> {
    const comment = await this.commentsRepository.findById(commentId);
    if (!comment || (comment as any).postId !== postId) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }

    // Проверяем владельца
    if ((comment as any).userId !== user.sub) {
      throw new ForbiddenException(BLOG_ERROR_MESSAGES.CANNOT_EDIT_COMMENT);
    }

    return this.commentsRepository.update(commentId, dto.content);
  }

  /**
   * Удаляет комментарий
   */
  async delete(
    postId: string,
    commentId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const comment = await this.commentsRepository.findById(commentId);
    if (!comment || (comment as any).postId !== postId) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }

    // Проверяем владельца
    if ((comment as any).userId !== user.sub) {
      throw new ForbiddenException(BLOG_ERROR_MESSAGES.CANNOT_DELETE_COMMENT);
    }

    await this.commentsRepository.delete(commentId);

    // Декрементируем счётчик (комментарий + его ответы)
    await this.blogRepository.updateCommentsCount(postId, false);
  }

  /**
   * Ставит лайк/дизлайк комментарию
   */
  async toggleLike(
    postId: string,
    commentId: string,
    isLike: boolean,
    user: ICurrentUser,
  ): Promise<{ success: boolean }> {
    // Проверяем что пользователь — USER
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Только пользователи могут ставить лайки');
    }

    const comment = await this.commentsRepository.findById(commentId);
    if (!comment || (comment as any).postId !== postId) {
      throw new NotFoundException(BLOG_ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }

    await this.commentsRepository.toggleLike(commentId, user.sub, isLike);

    return { success: true };
  }
}
