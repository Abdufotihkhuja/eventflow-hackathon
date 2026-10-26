import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';
import {
  EventType,
  EventAccessType,
  EventFormat,
  Currency,
} from '@prisma/client';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';

const ADMIN_EVENT_TRANSLATION_FIELDS = ['title', 'shortDescription'] as const;

/**
 * DTO для редактирования события супер-админом.
 * Не содержит status - статус события не меняется через этот DTO.
 * Для модерации используйте approve/reject endpoints.
 */
export class AdminUpdateEventDto {
  @ApiPropertyOptional({ example: 'Tech Conference 2025' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Полное описание мероприятия...' })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ example: 'Краткое описание для превью' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for event title and shortDescription. Locale keys: ru, uz, en.',
    example: {
      title: { ru: 'Конференция', uz: 'Konferensiya', en: 'Conference' },
      shortDescription: {
        ru: 'Краткое описание',
        uz: 'Qisqa tavsif',
        en: 'Short description',
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(ADMIN_EVENT_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for event title and shortDescription.',
    example: {
      title: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(ADMIN_EVENT_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiPropertyOptional({ example: '/uploads/image.jpg' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({
    enum: EventType,
    description: 'Тип оплаты: FREE - бесплатный, PAID - платный',
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

  @ApiPropertyOptional({ example: '2025-06-15T10:00:00Z' })
  @IsUtcIso8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-06-15T18:00:00Z' })
  @IsUtcIso8601()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: '2025-06-14T23:59:59Z' })
  @IsUtcIso8601()
  @IsOptional()
  registrationDeadline?: string;

  @ApiPropertyOptional({ example: 'Конференц-зал "Узбекистан"' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  venue?: string;

  @ApiPropertyOptional({ example: 'г. Ташкент, ул. Навои, 1' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Ташкент' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 41.311151,
    description:
      'Широта места проведения (для отображения на карте). Передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(-90, { message: 'Широта должна быть от -90 до 90' })
  @Max(90, { message: 'Широта должна быть от -90 до 90' })
  latitude?: number | null;

  @ApiPropertyOptional({
    example: 69.279737,
    description:
      'Долгота места проведения (для отображения на карте). Передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(-180, { message: 'Долгота должна быть от -180 до 180' })
  @Max(180, { message: 'Долгота должна быть от -180 до 180' })
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 'ymapsbm1://org/12345',
    description: 'ID места в Yandex Maps. Передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(500)
  placeId?: string | null;

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123456789' })
  @IsUrl()
  @IsOptional()
  onlineUrl?: string;

  @ApiPropertyOptional({ example: 100000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    enum: Currency,
    example: Currency.USD,
    description:
      'Валюта: UZS - узбекский сум, USD - доллар США, EUR - евро, RUB - российский рубль',
  })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Разрешены ли комментарии участников к мероприятию',
  })
  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'Недостаточно информации',
    description: 'Причина отклонения (только для информации)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  rejectionReason?: string;
}
