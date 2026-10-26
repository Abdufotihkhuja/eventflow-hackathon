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
  IsArray,
  IsUUID,
  IsHexColor,
  ValidateIf,
} from 'class-validator';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';

const COLLECTION_TRANSLATION_FIELDS = ['title', 'description'] as const;

export class CreateCollectionDto {
  @ApiProperty({ example: 'Куда сходить зимой', description: 'Название подборки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'kuda-sxodit-zimoj',
    description: 'URL-friendly slug (генерируется автоматически если не указан)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
    description:
      'URL обложки. Загрузить: POST /super-admin/collections/cover-upload (multipart, поле cover)',
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Цвет начала градиента (HEX). Если указан — gradientEnd обязателен',
  })
  @IsOptional()
  @ValidateIf((o) => o.gradientEnd)
  @IsNotEmpty({ message: 'При указании gradientEnd необходимо указать gradientStart' })
  @IsHexColor()
  gradientStart?: string;

  @ApiPropertyOptional({
    example: '#06B6D4',
    description: 'Цвет конца градиента (HEX). Если указан — gradientStart обязателен',
  })
  @IsOptional()
  @ValidateIf((o) => o.gradientStart)
  @IsNotEmpty({ message: 'При указании gradientStart необходимо указать gradientEnd' })
  @IsHexColor()
  gradientEnd?: string;

  @ApiPropertyOptional({
    example: 'Лучшие мероприятия для зимних вечеров',
    description: 'Описание подборки',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
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
    description: 'Активна ли подборка',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'ID событий для добавления в подборку',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  eventIds?: string[];

  @ApiPropertyOptional({
    description: 'Plain-text translations for collection title and description. Locale keys: ru, uz, en.',
    example: {
      title: { ru: 'Зимние события', uz: 'Qishki tadbirlar', en: 'Winter events' },
      description: { ru: 'Лучшие события сезона', uz: 'Mavsumning eng yaxshi tadbirlari', en: 'Best events of the season' },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(COLLECTION_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for collection title and description.',
    example: {
      title: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(COLLECTION_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;
}
