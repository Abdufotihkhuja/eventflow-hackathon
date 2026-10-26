import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RegistrationStatus } from '@prisma/client';

import { UZ_REGION_KEYS, type UzRegionKey } from '../lib/uz-regions';

/**
 * Sentinel for "no region in profile" — distinct from a valid region key so we can SQL it as
 * `WHERE region IS NULL OR region = ''` rather than mis-matching a literal string.
 */
export const REGION_UNKNOWN = '__unknown__' as const;
export type AnalyticsRegionFilter = UzRegionKey | typeof REGION_UNKNOWN;
const REGION_FILTER_VALUES: readonly string[] = [...UZ_REGION_KEYS, REGION_UNKNOWN];

/**
 * Узкая, типобезопасная классификация по полу для аналитики.
 * UNKNOWN — пол не указан в профиле пользователя. OTHER не входит в Prisma enum, оставляем заглушку
 * на будущее, чтобы UI мог рендерить отдельную колонку, когда схема расширится.
 */
export enum AnalyticsGenderFilter {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

export enum AnalyticsAgeGroup {
  UNDER_18 = 'UNDER_18',
  AGE_18_21 = 'AGE_18_21',
  AGE_22_25 = 'AGE_22_25',
  AGE_26_30 = 'AGE_26_30',
  AGE_31_35 = 'AGE_31_35',
  AGE_36_45 = 'AGE_36_45',
  AGE_46_PLUS = 'AGE_46_PLUS',
  UNKNOWN = 'UNKNOWN',
}

export enum AnalyticsTestStatusFilter {
  NOT_STARTED = 'NOT_STARTED',
  COMPLETED = 'COMPLETED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

/**
 * Query-параметры для GET /events/:eventId/analytics.
 * Все параметры опциональны; пустые/невалидные значения тихо игнорируются на уровне сервиса.
 */
export class EventAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Нижняя граница диапазона регистраций (включительно)',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Верхняя граница диапазона регистраций (включительно)',
    example: '2026-05-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: RegistrationStatus })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiPropertyOptional({ enum: AnalyticsGenderFilter })
  @IsOptional()
  @IsEnum(AnalyticsGenderFilter)
  gender?: AnalyticsGenderFilter;

  @ApiPropertyOptional({ enum: AnalyticsAgeGroup })
  @IsOptional()
  @IsEnum(AnalyticsAgeGroup)
  ageGroup?: AnalyticsAgeGroup;

  @ApiPropertyOptional({ enum: AnalyticsTestStatusFilter })
  @IsOptional()
  @IsEnum(AnalyticsTestStatusFilter)
  testStatus?: AnalyticsTestStatusFilter;

  @ApiPropertyOptional({
    description:
      'Canonical Uzbekistan region key (matched against User.region via aliases), or "__unknown__" for users with no region set.',
    enum: REGION_FILTER_VALUES,
  })
  @IsOptional()
  @IsIn(REGION_FILTER_VALUES)
  region?: AnalyticsRegionFilter;

  @ApiPropertyOptional({
    description:
      'Search по имени/фамилии/email участника. Сервер делает безопасный contains (ILIKE).',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
