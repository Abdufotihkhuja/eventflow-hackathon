import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Тело для массового одобрения/отклонения регистраций. Раньше эндпоинты
 * принимали inline-тип `{ ids: string[] }`, который ValidationPipe не проверял
 * (можно было прислать не-массив/огромный массив → 500 или нагрузка на БД).
 */
export class BulkRegistrationIdsDto {
  @ApiProperty({ type: [String], description: 'ID регистраций (UUID)' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids: string[];
}

export class BulkRejectRegistrationsDto extends BulkRegistrationIdsDto {
  @ApiPropertyOptional({ description: 'Причина отклонения' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
