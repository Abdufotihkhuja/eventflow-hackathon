import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsEnum,
  IsString,
  MaxLength,
  IsDateString,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BlogPostStatus } from '@prisma/client';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../blog.constants';

export enum BlogPostSortBy {
  CREATED_AT = 'createdAt',
  PUBLISHED_AT = 'publishedAt',
  LIKES = 'likesCount',
  VIEWS = 'viewsCount',
  READING_TIME = 'readingTime',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class BlogPostQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Количество записей на странице',
    default: DEFAULT_PAGE_LIMIT,
    maximum: MAX_PAGE_LIMIT,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  @Type(() => Number)
  @IsOptional()
  limit?: number = DEFAULT_PAGE_LIMIT;

  @ApiPropertyOptional({
    description: 'Поиск по заголовку и описанию',
    example: 'конференция',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по тегу',
    example: 'uuid-of-tag',
  })
  @IsUUID('4')
  @IsOptional()
  tagId?: string;

  @ApiPropertyOptional({
    description: 'Сортировка по полю',
    enum: BlogPostSortBy,
    default: BlogPostSortBy.PUBLISHED_AT,
  })
  @IsEnum(BlogPostSortBy)
  @IsOptional()
  sortBy?: BlogPostSortBy = BlogPostSortBy.PUBLISHED_AT;

  @ApiPropertyOptional({
    description: 'Порядок сортировки',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class OrganizationBlogPostsQueryDto extends BlogPostQueryDto {
  @ApiPropertyOptional({
    description: 'Фильтр по статусу',
    enum: BlogPostStatus,
  })
  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;
}

export class PublicBlogPostsQueryDto extends BlogPostQueryDto {
  @ApiPropertyOptional({
    description: 'Фильтр по организации',
    example: 'uuid-of-organization',
  })
  @IsUUID('4')
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по категории блога',
    example: 'uuid-of-blog-category',
  })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по нескольким тегам (статьи с любым из тегов)',
    example: ['uuid-of-tag-1', 'uuid-of-tag-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }): string[] => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    description: 'Опубликовано после (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  publishedAfter?: string;

  @ApiPropertyOptional({
    description: 'Опубликовано до (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  publishedBefore?: string;

  @ApiPropertyOptional({
    description: 'Минимальное время чтения (в минутах)',
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  minReadingTime?: number;

  @ApiPropertyOptional({
    description: 'Максимальное время чтения (в минутах)',
    example: 30,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  maxReadingTime?: number;

  @ApiPropertyOptional({
    description: 'Locale for localized public business fields',
    enum: ['ru', 'uz', 'en'],
  })
  @IsIn(['ru', 'uz', 'en'])
  @IsOptional()
  locale?: string;
}
