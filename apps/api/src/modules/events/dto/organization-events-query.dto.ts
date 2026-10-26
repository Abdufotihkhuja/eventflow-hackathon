import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum OrganizationEventsStatus {
  UPCOMING = 'upcoming',
  PAST = 'past',
}

export class OrganizationEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Количество записей на странице',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: OrganizationEventsStatus,
    description:
      'Фильтр по времени: upcoming (предстоящие) или past (прошедшие)',
    example: OrganizationEventsStatus.UPCOMING,
  })
  @IsOptional()
  @IsEnum(OrganizationEventsStatus)
  status?: OrganizationEventsStatus;
}
