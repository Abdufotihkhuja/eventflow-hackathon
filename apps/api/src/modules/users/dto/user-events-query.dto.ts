import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Фильтры для страницы "Мои события" (/profile/events)
 */
export enum UserEventFilter {
  ALL = 'ALL', // Все события
  APPROVED = 'APPROVED', // Подтверждённые
  PENDING = 'PENDING', // Ожидают подтверждения
  ATTENDED = 'ATTENDED', // Посещённые (есть check-in)
  CANCELLED = 'CANCELLED', // Отменённые (CANCELLED + REJECTED)
}

export class UserEventsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Количество элементов на странице',
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: UserEventFilter,
    description:
      'Фильтр событий: ALL - все, APPROVED - подтверждённые, PENDING - ожидают, ATTENDED - посещённые, CANCELLED - отменённые',
  })
  @IsEnum(UserEventFilter)
  @IsOptional()
  filter?: UserEventFilter = UserEventFilter.ALL;

  @ApiPropertyOptional({
    example: 'Конференция',
    description: 'Поиск по названию события',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ru', 'uz', 'en'],
    description: 'Locale for localized public business fields',
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
