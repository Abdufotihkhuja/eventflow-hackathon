import { ApiProperty } from '@nestjs/swagger';

/**
 * Элемент списка событий организатора (`GET /events/organizations/:id/events`).
 *
 * Скалярные поля события типизируются точно по модели Prisma `Event`. Богатые
 * вложенные/рекурсивные структуры (`organization`, `categories`, `_count`)
 * оставлены слабо типизированными через `additionalProperties: true`, по образцу
 * `CommentDto` и `SavedEventItemDto`, чтобы не дублировать дерево Prisma-строки
 * и сохранить аддитивность контракта.
 */
export class OrganizationEventItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  coverImage?: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  format!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ format: 'date-time' })
  startDate!: Date;

  @ApiProperty({ format: 'date-time' })
  endDate!: Date;

  @ApiProperty({ required: false, nullable: true, type: String })
  venue?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  city?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  price?: string | null;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false, nullable: true, type: Number })
  maxParticipants?: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Организатор (id, companyName, logoUrl)',
  })
  organization!: Record<string, unknown>;

  @ApiProperty({
    type: 'array',
    description: 'Слаги категорий события',
    items: { type: 'object', additionalProperties: true },
  })
  categories!: unknown[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: '_count (например, registrations)',
  })
  _count!: Record<string, unknown>;
}

/**
 * Пагинированный список событий организатора
 * (`GET /events/organizations/:id/events`).
 */
export class PaginatedOrganizationEventsDto {
  @ApiProperty({ type: [OrganizationEventItemDto] })
  data!: OrganizationEventItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
