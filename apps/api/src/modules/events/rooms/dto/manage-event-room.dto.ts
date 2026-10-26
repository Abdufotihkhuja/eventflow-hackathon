import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { BusinessTranslations } from '../../../translations/dto/business-translation.dto';
import { IsBusinessTranslations } from '../../../translations/dto/business-translation.dto';

export const EVENT_ROOM_NAME_MAX_LENGTH = 160;
export const EVENT_ROOM_TRANSLATION_FIELDS = ['name'] as const;

export class CreateEventRoomDto {
  @ApiProperty({
    example: 'Главный зал',
    maxLength: EVENT_ROOM_NAME_MAX_LENGTH,
    description:
      'Scalar fallback name. If translations.name has values, scalar is recomputed from the first non-empty locale.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_ROOM_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Локализация name: { name: { ru?, uz?, en? } }. Скаляр name остаётся как fallback.',
    example: { name: { ru: 'Главный зал', uz: 'Asosiy zal', en: 'Main hall' } },
  })
  @IsOptional()
  @IsBusinessTranslations(EVENT_ROOM_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;
}

export class UpdateEventRoomDto {
  @ApiPropertyOptional({
    example: 'Главный зал',
    maxLength: EVENT_ROOM_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_ROOM_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Локализация name.',
    example: { name: { ru: 'Главный зал', uz: 'Asosiy zal', en: 'Main hall' } },
  })
  @IsOptional()
  @IsBusinessTranslations(EVENT_ROOM_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;
}
