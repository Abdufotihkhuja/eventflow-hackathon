import { ApiProperty } from '@nestjs/swagger';

/**
 * Комментарий к событию. Вложенные `user`/`authorOrganization`/`replies`
 * оставлены слабо типизированными намеренно (рекурсивная форма), чтобы
 * не дублировать дерево ответов — изменение остаётся минимальным.
 */
export class CommentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  userId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  authorOrganizationId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  parentId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Автор-пользователь (id, firstName, lastName, avatarUrl) или null',
  })
  user!: Record<string, unknown> | null;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Автор-организация (id, companyName, logoUrl) или null',
  })
  authorOrganization!: Record<string, unknown> | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  _count!: { replies: number; likes: number };

  @ApiProperty({ required: false })
  likesCount?: number;

  @ApiProperty({ required: false })
  dislikesCount?: number;

  @ApiProperty({ required: false, nullable: true, type: Boolean })
  userLikeStatus?: boolean | null;

  @ApiProperty({
    type: 'array',
    description: 'Вложенные ответы (та же форма)',
    items: { type: 'object', additionalProperties: true },
  })
  replies!: Record<string, unknown>[];
}

export class PaginatedCommentsDto {
  @ApiProperty({ type: [CommentDto] })
  data!: CommentDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CommentLikeCountsDto {
  @ApiProperty()
  likes!: number;

  @ApiProperty()
  dislikes!: number;
}
