import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventFormat, EventType } from '@prisma/client';

export enum EventTimeFilter {
  UPCOMING = 'upcoming',
  PAST = 'past',
  ALL = 'all',
}

export class PublicEventsQueryDto {
  @ApiProperty({ example: 1, description: 'Номер страницы', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Количество на странице',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    example: 'conference',
    description: 'Поисковый запрос',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 'Ташкент',
    description: 'Фильтр по городу (подстрочный, без регистра)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'tashkent,Ташкент,Toshkent',
    description:
      'Альтернативные написания города через запятую — OR-фильтр (для city landing страниц, где DB хранит смешанные формы: коды, рус., узб.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  cities?: string;

  @ApiProperty({
    enum: EventFormat,
    description: 'Формат события',
    required: false,
  })
  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @ApiProperty({ enum: EventType, description: 'Тип события', required: false })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiProperty({
    enum: EventTimeFilter,
    example: EventTimeFilter.UPCOMING,
    description:
      'Фильтр по времени: upcoming (предстоящие), past (прошедшие), all (все)',
    required: false,
  })
  @IsOptional()
  @IsEnum(EventTimeFilter)
  filter?: EventTimeFilter = EventTimeFilter.UPCOMING;

  @ApiProperty({
    example: true,
    description: 'Фильтр только топовых событий',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({
    example: 'hackathon',
    description: 'Фильтр по slug категории события',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase().replaceAll('_', '-');
    return normalized ? normalized.split('-')[0] : undefined;
  })
  @IsIn(['ru', 'uz', 'en'])
  locale?: string;
}
