import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Max,
  MaxLength,
  Min,
  IsUrl,
  ValidateIf,
  IsBoolean,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../common/validators/utc-iso8601.validator';
import {
  EventType,
  EventAccessType,
  EventFormat,
  Currency,
  RegistrationMode,
  TestEvaluationType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { BLOCKNOTE_LIMITS } from '../../../common/constants/blocknote.constants';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import type {
  RichTranslationMeta,
  RichTranslations,
} from '../../translations/dto/rich-translation.dto';
import {
  IsRichTranslationMeta,
  IsRichTranslations,
} from '../../translations/dto/rich-translation.dto';

// city — НЕ в translations: это select с фиксированным каталогом городов,
// локализация идёт через клиентский dictionary (apps/.../shared/lib/city-catalog.ts).
const EVENT_TRANSLATION_FIELDS = [
  'title',
  'shortDescription',
  'venue',
  'address',
] as const;
const EVENT_RICH_TRANSLATION_FIELDS = ['description'] as const;

export class CreateEventDto {
  @ApiProperty({ example: 'Tech Conference 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description:
      'URL-slug мероприятия (a-z, 0-9, дефис). Если не передан — генерируется из заголовка.',
    example: 'tech-conference-2025',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: `Описание мероприятия в формате BlockNote JSON. Ограничения: макс. ${BLOCKNOTE_LIMITS.MAX_BLOCKS_COUNT} блоков, макс. ${BLOCKNOTE_LIMITS.MAX_NESTING_DEPTH} уровней вложенности, макс. ${BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE} байт`,
    example: [
      {
        id: '1',
        type: 'paragraph',
        props: {},
        content: [
          { type: 'text', text: 'Полное описание мероприятия...', styles: {} },
        ],
        children: [],
      },
    ],
    type: 'array',
  })
  @IsOptional()
  @IsArray({ message: 'Description must be an array of BlockNote blocks' })
  @Transform(
    ({ obj }) => {
      // Берем сырое значение напрямую из исходного объекта до трансформации
      const value = obj.description;
      if (
        value &&
        JSON.stringify(value).length > BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE
      ) {
        throw new Error(
          `Document size exceeds ${BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE} bytes`,
        );
      }
      return value;
    },
    { toClassOnly: true },
  )
  description?: any; // Полная валидация происходит в сервисе после нормализации

  @ApiPropertyOptional({ example: 'Краткое описание для превью' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for event title, shortDescription, and venue. Locale keys: ru, uz, en.',
    example: {
      title: { ru: 'Конференция', uz: 'Konferensiya', en: 'Conference' },
      shortDescription: {
        ru: 'Краткое описание',
        uz: 'Qisqa tavsif',
        en: 'Short description',
      },
      venue: {
        ru: 'Конференц-зал',
        uz: 'Konferensiya zali',
        en: 'Conference hall',
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(EVENT_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for event title, shortDescription, and venue.',
    example: {
      title: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(EVENT_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiPropertyOptional({
    description:
      'Rich BlockNote translations for event description. Locale keys: ru, uz, en.',
    example: {
      description: {
        ru: [
          {
            id: 'block-1',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Описание', styles: {} }],
            children: [],
          },
        ],
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsRichTranslations(EVENT_RICH_TRANSLATION_FIELDS)
  richTranslations?: RichTranslations;

  @ApiPropertyOptional({
    description: 'Rich translation metadata for event description.',
    example: {
      description: {
        ru: { status: 'manual' },
        uz: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsRichTranslationMeta(EVENT_RICH_TRANSLATION_FIELDS)
  richTranslationMeta?: RichTranslationMeta;

  @ApiPropertyOptional({ example: '/uploads/image.jpg' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({
    enum: EventType,
    example: EventType.FREE,
    description: 'Тип оплаты: FREE - бесплатный, PAID - платный',
  })
  @IsEnum(EventType)
  type: EventType;

  @ApiPropertyOptional({
    enum: EventAccessType,
    example: EventAccessType.OPEN,
    description:
      'Тип доступа: OPEN - открытый, REQUEST - по запросу, INVITE_ONLY - по приглашению',
  })
  @IsEnum(EventAccessType)
  @IsOptional()
  accessType?: EventAccessType;

  @ApiProperty({ enum: EventFormat, example: EventFormat.OFFLINE })
  @IsEnum(EventFormat)
  format: EventFormat;

  @ApiProperty({ example: '2025-06-15T10:00:00Z' })
  @IsUtcIso8601()
  startDate: string;

  @ApiProperty({ example: '2025-06-15T18:00:00Z' })
  @IsUtcIso8601()
  endDate: string;

  @ApiPropertyOptional({
    example: '2025-06-14T23:59:59Z',
    nullable: true,
    description:
      'Дедлайн регистрации. null — сбросить дедлайн (регистрация открыта до начала события или ручного закрытия).',
  })
  @ValidateIf((_, value) => value !== null)
  @IsUtcIso8601()
  @IsOptional()
  registrationDeadline?: string | null;

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
      'Широта места проведения (для отображения на карте, напр. Yandex Maps). При update передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(-90, { message: 'Широта должна быть от -90 до 90' })
  @Max(90, { message: 'Широта должна быть от -90 до 90' })
  latitude?: number | null;

  @ApiPropertyOptional({
    example: 69.279737,
    description:
      'Долгота места проведения (для отображения на карте). При update передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(-180, { message: 'Долгота должна быть от -180 до 180' })
  @Max(180, { message: 'Долгота должна быть от -180 до 180' })
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 'ymapsbm1://org/12345',
    description:
      'ID места в Yandex Maps (опционально, для обратного геокодинга). При update передать null чтобы очистить.',
  })
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(255)
  placeId?: string | null;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID опубликованной площадки из каталога аренды. Если передан, координаты и адрес могут быть автоматически подставлены.',
  })
  @ValidateIf((_, v) => v != null)
  @IsUUID('4')
  rentalPlaceId?: string | null;

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
    example: Currency.UZS,
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
    description:
      'Регистрация открыта. Ручной переключатель организатора: если false, регистрация закрыта независимо от дедлайна и лимита участников. По умолчанию true.',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  registrationOpen?: boolean;

  @ApiPropertyOptional({
    enum: RegistrationMode,
    example: RegistrationMode.QUESTIONS,
    description:
      'Режим регистрации: QUESTIONS - уточняющие вопросы, TEST - тестирование с проверкой ответов',
  })
  @IsEnum(RegistrationMode)
  @IsOptional()
  registrationMode?: RegistrationMode;

  @ApiPropertyOptional({
    enum: TestEvaluationType,
    description:
      'Тип оценки теста (только для режима TEST): AUTO_REJECT - автоматический отбор (не прошел = отклонен), EVALUATION - для оценки (все допускаются, но видны результаты)',
  })
  @IsEnum(TestEvaluationType)
  @IsOptional()
  @ValidateIf((o) => o.registrationMode === RegistrationMode.TEST)
  testEvaluationType?: TestEvaluationType;

  @ApiPropertyOptional({
    example: 70,
    description:
      'Минимальный балл для прохождения теста (только для режима TEST)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @ValidateIf((o) => o.registrationMode === RegistrationMode.TEST)
  minTestScore?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Разрешены ли комментарии к мероприятию',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-category-1', 'uuid-category-2'],
    description: 'ID тематик события (можно несколько)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // multipart/form-data передаёт массив JSON-строкой
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
