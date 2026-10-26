import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, EventFormat, EventType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AdminEventsQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Количество на странице', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Поиск по названию' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Статус события',
    enum: EventStatus,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Формат события',
    enum: EventFormat,
  })
  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @ApiPropertyOptional({
    description: 'Тип события (платный/бесплатный)',
    enum: EventType,
  })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ description: 'ID организации' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
