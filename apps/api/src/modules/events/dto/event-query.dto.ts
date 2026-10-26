import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EventStatus,
  EventType,
  EventAccessType,
  EventFormat,
} from '@prisma/client';

/**
 * Стадия жизни события — то, чем организатор мыслит список, в отличие от
 * `status`, которым мыслит база.
 *
 * LIVE в базе нет вовсе, а PAST — это два разных статуса: COMPLETED и
 * PUBLISHED с истёкшей датой. Пока список отдавался одной широкой страницей,
 * клиент выводил стадию сам; с постраничной загрузкой так больше нельзя —
 * страница может вернуться пустой при том, что дальше совпадения есть. Поэтому
 * стадия считается на сервере, где к статусу есть даты.
 */
export enum EventLifecycle {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  /** Опубликовано и ещё не началось. */
  PUBLISHED = 'PUBLISHED',
  /** Идёт прямо сейчас. */
  LIVE = 'LIVE',
  /** Завершено вручную или закончилось по дате. */
  PAST = 'PAST',
  CANCELLED = 'CANCELLED',
}

/** Поля, по которым разрешена сортировка списка организации. */
export enum EventSortBy {
  CREATED_AT = 'createdAt',
  START_DATE = 'startDate',
  TITLE = 'title',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class EventQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({
    enum: EventType,
    description: 'Тип оплаты: FREE, PAID',
  })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiPropertyOptional({
    enum: EventAccessType,
    description: 'Тип доступа: OPEN, REQUEST, INVITE_ONLY',
  })
  @IsEnum(EventAccessType)
  @IsOptional()
  accessType?: EventAccessType;

  @ApiPropertyOptional({ enum: EventFormat })
  @IsEnum(EventFormat)
  @IsOptional()
  format?: EventFormat;

  @ApiPropertyOptional({ example: 'conference' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Ташкент' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'ID организатора для фильтрации событий',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по тегам (slugs через запятую)',
    example: 'conference,for-professionals,technologies',
  })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiPropertyOptional({
    description: 'ID категории для фильтрации',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Slug категории для фильтрации',
    example: 'biznes-trening',
  })
  @IsString()
  @IsOptional()
  categorySlug?: string;

  @ApiPropertyOptional({
    description: 'ID подборки для фильтрации',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  @IsOptional()
  collectionId?: string;

  @ApiPropertyOptional({
    enum: EventLifecycle,
    description:
      'Стадия жизни события. Учитывается только для списка организации; ' +
      'взаимоисключима со `status` — если передана, `status` игнорируется.',
  })
  @IsEnum(EventLifecycle)
  @IsOptional()
  lifecycle?: EventLifecycle;

  @ApiPropertyOptional({ enum: EventSortBy, default: EventSortBy.CREATED_AT })
  @IsEnum(EventSortBy)
  @IsOptional()
  sortBy?: EventSortBy;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}

export class PublicEventQueryDto extends EventQueryDto {
  // Для публичных запросов status всегда PUBLISHED
}
