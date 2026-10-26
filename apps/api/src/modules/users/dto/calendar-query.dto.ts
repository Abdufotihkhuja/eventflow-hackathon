import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ParticipantRole } from '@prisma/client';

const localeTransform = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase().replaceAll('_', '-');
  return normalized ? normalized.split('-')[0] : undefined;
};

export class CalendarQueryDto {
  @ApiProperty({ description: 'Год', example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Месяц (1-12)', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'Фильтр по роли участника',
    enum: ParticipantRole,
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;

  @ApiPropertyOptional({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
  })
  @IsOptional()
  @Transform(localeTransform)
  @IsIn(['ru', 'uz', 'en'])
  locale?: string;
}

export class CalendarEventsQueryDto {
  @ApiProperty({
    description: 'Дата в формате YYYY-MM-DD',
    example: '2025-03-05',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Фильтр по роли участника',
    enum: ParticipantRole,
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;

  @ApiPropertyOptional({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
  })
  @IsOptional()
  @Transform(localeTransform)
  @IsIn(['ru', 'uz', 'en'])
  locale?: string;
}
