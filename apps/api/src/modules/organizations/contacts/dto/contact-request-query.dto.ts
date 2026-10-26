import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ContactRequestQueryDto {
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
    enum: ContactRequestStatus,
    description: 'Фильтр по статусу',
    example: ContactRequestStatus.NEW,
  })
  @IsOptional()
  @IsEnum(ContactRequestStatus)
  status?: ContactRequestStatus;

  @ApiPropertyOptional({
    description: 'Поиск по имени пользователя или телефону',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
