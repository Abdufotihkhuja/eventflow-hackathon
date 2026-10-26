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

const CATEGORY_TRANSLATION_FIELDS = ['name', 'description'] as const;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Бизнес-тренинг', description: 'Название категории' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'biznes-trening',
    description: 'URL-friendly slug (генерируется автоматически если не указан)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
    description: 'URL иконки. Получить: POST /super-admin/categories/icon-upload (multipart, поле icon)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  icon?: string;

  @ApiPropertyOptional({
    example: 'Тренинги для развития бизнес-навыков',
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
    description: 'Plain-text translations for category name and description. Locale keys: ru, uz, en.',
    example: {
      name: { ru: 'Бизнес', uz: 'Biznes', en: 'Business' },
      description: { ru: 'Деловые мероприятия', uz: 'Biznes tadbirlar', en: 'Business events' },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(CATEGORY_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for category name and description.',
    example: {
      name: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(CATEGORY_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
