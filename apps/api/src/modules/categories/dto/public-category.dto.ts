import { ApiProperty } from '@nestjs/swagger';

class CategoryEventCountDto {
  @ApiProperty({ description: 'Количество опубликованных событий' })
  events!: number;
}

/**
 * Публичное (локализованное) представление категории.
 * `name`/`description` уже разрешены под запрошенную локаль; служебные
 * `translations`/`translationMeta` в публичный ответ не попадают.
 */
export class PublicCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true, type: String })
  icon!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: CategoryEventCountDto })
  _count!: CategoryEventCountDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
