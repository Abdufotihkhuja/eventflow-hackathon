import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';

export class SaveArticleDto {
  @ApiProperty({
    description: 'Ссылка на оригинальную статью',
    example: 'https://blog.eventflow.com/articles/seasonal-trends-2024',
  })
  @IsUrl()
  articleUrl: string;

  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Сезонные тренды и инсайты для увеличения...',
  })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    description: 'Краткое описание статьи',
    example: 'Праздничный сезон наполнен возможностями. С ростом...',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'URL изображения обложки',
    example: 'https://blog.eventflow.com/images/seasonal-trends.jpg',
  })
  @IsUrl()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Категория статьи',
    example: 'TIPS-GUIDES',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Дата публикации статьи (ISO 8601)',
    example: '2024-11-10T10:00:00Z',
  })
  @IsUtcIso8601()
  @IsOptional()
  publishedAt?: string;

  @ApiPropertyOptional({
    description: 'Время чтения в минутах',
    example: 5,
    minimum: 1,
    maximum: 120,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(120)
  readingTime?: number;

  @ApiPropertyOptional({
    description: 'Имя автора статьи',
    example: 'Иван Петров',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  authorName?: string;
}

export class SavedArticleResponseDto {
  @ApiProperty({ description: 'ID сохранённой записи' })
  id: string;

  @ApiProperty({ description: 'Slug статьи для URL' })
  slug: string;

  @ApiProperty({ description: 'Ссылка на статью' })
  articleUrl: string;

  @ApiProperty({ description: 'Заголовок' })
  title: string;

  @ApiProperty({ description: 'Краткое описание', nullable: true })
  excerpt: string | null;

  @ApiProperty({ description: 'Изображение обложки', nullable: true })
  coverImage: string | null;

  @ApiProperty({ description: 'Категория', nullable: true })
  category: string | null;

  @ApiProperty({ description: 'Дата публикации', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ description: 'Время чтения (мин)', nullable: true })
  readingTime: number | null;

  @ApiProperty({ description: 'Автор', nullable: true })
  authorName: string | null;

  @ApiProperty({ description: 'Дата сохранения' })
  savedAt: Date;
}

export class SavedArticlesQueryDto {
  @ApiPropertyOptional({ description: 'Страница', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Записей на странице', default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Поиск по заголовку и описанию' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Фильтр по категории' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class SavedArticlesListDto {
  @ApiProperty({ description: 'Общее количество сохранённых статей' })
  total: number;

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Размер страницы' })
  limit: number;

  @ApiProperty({
    description: 'Список статей',
    type: [SavedArticleResponseDto],
  })
  articles: SavedArticleResponseDto[];
}
