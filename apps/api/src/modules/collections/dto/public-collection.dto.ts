import { ApiProperty } from '@nestjs/swagger';

class CollectionEventCountDto {
  @ApiProperty({ description: 'Количество событий в подборке' })
  events!: number;
}

/**
 * Публичная (локализованная) подборка в списке. `name` — алиас `title`
 * под запрошенную локаль; служебные переводы в ответ не попадают.
 */
export class PublicCollectionListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: 'Локализованный алиас title' })
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true, type: String })
  coverImage!: string | null;

  @ApiProperty({ nullable: true, type: String })
  gradientStart!: string | null;

  @ApiProperty({ nullable: true, type: String })
  gradientEnd!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: CollectionEventCountDto })
  _count!: CollectionEventCountDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

/**
 * Публичная подборка с вложенными событиями (detail / by-slug).
 * Вложенные `events` оставлены слабо типизированными намеренно, чтобы не
 * дублировать форму события — это сохраняет изменение минимальным.
 */
export class PublicCollectionWithEventsDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true, type: String })
  coverImage!: string | null;

  @ApiProperty({ nullable: true, type: String })
  gradientStart!: string | null;

  @ApiProperty({ nullable: true, type: String })
  gradientEnd!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    type: 'array',
    description: 'Pivot-строки со встроенным локализованным событием',
    items: { type: 'object', additionalProperties: true },
  })
  events!: Record<string, unknown>[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
