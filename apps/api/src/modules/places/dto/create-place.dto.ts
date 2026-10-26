import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '@prisma/client';
import { BLOCKNOTE_LIMITS } from '../../../common/constants/blocknote.constants';

export class CreatePlaceDto {
  @ApiProperty({ example: 'Loft Hall Tashkent' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'loft-hall-tashkent',
    description:
      'Опциональный slug. Если не передан, генерируется из названия.',
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
    description: `Описание площадки в формате BlockNote JSON. Ограничение по размеру: ${BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE} байт.`,
    type: 'array',
  })
  @IsOptional()
  @IsArray({ message: 'Description must be an array of BlockNote blocks' })
  @Transform(
    ({ obj }: { obj: { description?: unknown } }) => {
      const value = obj.description;
      if (
        value &&
        JSON.stringify(value).length > BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE
      ) {
        throw new Error(
          `Document size exceeds ${BLOCKNOTE_LIMITS.MAX_DOCUMENT_SIZE} bytes`,
        );
      }
      return value as unknown[];
    },
    { toClassOnly: true },
  )
  description?: any;

  @ApiPropertyOptional({
    example: 'Стильная площадка для деловых и частных мероприятий',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for venue title, shortDescription, rental conditions, and address notes. Locale keys: ru, uz, en.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  translations?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Metadata for plain-text venue translations.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  translationMeta?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Rich BlockNote translations for venue description. Locale keys: ru, uz, en.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  richTranslations?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Metadata for rich venue description translations.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  richTranslationMeta?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Цена за час аренды',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerHour?: number;

  @ApiPropertyOptional({
    example: 250000,
    description: 'Цена за сутки аренды',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerDay?: number;

  @ApiPropertyOptional({ enum: Currency, example: Currency.UZS })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({
    example: 'Минимум 2 часа. Оплата за каждый последующий час.',
    description: 'Условия почасовой аренды',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  hourlyConditions?: string;

  @ApiPropertyOptional({
    example: 'Заезд с 14:00, выезд до 12:00 следующего дня.',
    description: 'Условия суточной аренды',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  dailyConditions?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100000)
  capacity?: number;

  @ApiPropertyOptional({
    example: ['parking', 'wi-fi', 'projector'],
    description: 'Список удобств площадки',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ example: 'г. Ташкент, ул. Навои, 12' })
  @IsString()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({
    example: '3 этаж, вход со стороны парковки',
    description: 'Дополнительный адрес/ориентир',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  addressNotes?: string;

  @ApiPropertyOptional({ example: 'Ташкент' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: 41.311151 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 69.279737 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 'ymapsbm1://org/12345' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  placeId?: string;

  @ApiProperty({
    type: [String],
    example: ['/uploads/places/a.jpg', '/uploads/places/b.jpg'],
    description:
      'Список URL фотографий площадки. Сначала загрузить через /places/images/upload.',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(12)
  imageUrls: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'UUID организации-владельца. Доступно только супер-админу при внутренних операциях.',
    required: false,
  })
  @IsUUID('4')
  @IsOptional()
  organizationId?: string;
}
