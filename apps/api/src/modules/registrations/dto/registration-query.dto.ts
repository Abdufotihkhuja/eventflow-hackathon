import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RegistrationStatus } from '@prisma/client';

const localeTransform = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase().replaceAll('_', '-');
  return normalized ? normalized.split('-')[0] : undefined;
};

/**
 * Виртуальные фильтры для страницы профиля пользователя /profile/events
 */
export enum UserRegistrationFilter {
  ALL = 'ALL', // Все события
  APPROVED = 'APPROVED', // Подтверждённые
  PENDING = 'PENDING', // Ожидают
  ATTENDED = 'ATTENDED', // Посещённые (есть check-in)
  CANCELLED = 'CANCELLED', // Отменённые (CANCELLED + REJECTED)
}

export class RegistrationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  @ApiPropertyOptional({ example: 'Иван' })
  @IsString()
  @IsOptional()
  search?: string;
}

/**
 * DTO для страницы профиля пользователя /profile/events
 */
export class MyRegistrationsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: UserRegistrationFilter,
    description:
      'Фильтр: ALL - все, APPROVED - подтверждённые, PENDING - ожидают, ATTENDED - посещённые, CANCELLED - отменённые',
  })
  @IsEnum(UserRegistrationFilter)
  @IsOptional()
  filter?: UserRegistrationFilter = UserRegistrationFilter.ALL;

  @ApiPropertyOptional({ example: 'Конференция' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
  })
  @IsOptional()
  @Transform(localeTransform)
  @IsIn(['ru', 'uz', 'en'])
  locale?: string;
}
