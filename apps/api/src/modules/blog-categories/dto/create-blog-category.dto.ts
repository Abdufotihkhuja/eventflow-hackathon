import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  Matches,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';

const BLOG_CATEGORY_TRANSLATION_FIELDS = ['name', 'description'] as const;

export class CreateBlogCategoryDto {
  @ApiProperty({
    example: 'Советы и гиды',
    description: 'Название категории блога',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'tips-guides',
    description: 'URL-friendly slug (генерируется автоматически если не указан)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Практические советы и руководства для организаторов',
    description: 'Описание категории',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Порядок сортировки',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Активна ли категория',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for blog category name and description. Locale keys: ru, uz, en.',
    example: {
      name: { ru: 'Советы и гиды', uz: 'Maslahatlar', en: 'Tips & Guides' },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(BLOG_CATEGORY_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for blog category name and description.',
    example: {
      name: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(BLOG_CATEGORY_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
