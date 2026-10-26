import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Опасный административный override статуса события.
 * expected* поля защищают от перезаписи более свежего изменения.
 */
export class AdminSetEventStatusDto {
  @ApiProperty({ enum: EventStatus, example: EventStatus.COMPLETED })
  @IsEnum(EventStatus)
  status!: EventStatus;

  @ApiProperty({ enum: EventStatus, example: EventStatus.PUBLISHED })
  @IsEnum(EventStatus)
  expectedStatus!: EventStatus;

  @ApiProperty({ example: '2026-08-17T13:17:00.000Z' })
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string;

  @ApiProperty({
    minLength: 5,
    maxLength: 500,
    example: 'Исправление ошибочного статуса после обращения организатора',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
