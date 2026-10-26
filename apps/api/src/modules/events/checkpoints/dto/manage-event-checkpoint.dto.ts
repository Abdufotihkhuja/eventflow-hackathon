import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const EVENT_CHECKPOINT_NAME_MAX_LENGTH = 160;

export class CreateEventCheckpointDto {
  @ApiProperty({
    example: 'Регистрация участников',
    maxLength: EVENT_CHECKPOINT_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_CHECKPOINT_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    example: '2026-08-06T04:00:00.000Z',
    description: 'Начало окна (ISO 8601, абсолютный момент времени).',
  })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({
    example: '2026-08-06T07:00:00.000Z',
    description:
      'Конец окна (ISO 8601). Окно полуоткрытое: [startsAt, endsAt) — соседние чекпоинты могут стыковаться встык.',
  })
  @IsDateString()
  endsAt!: string;
}

export class UpdateEventCheckpointDto {
  @ApiPropertyOptional({ maxLength: EVENT_CHECKPOINT_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_CHECKPOINT_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: '2026-08-06T04:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-08-06T07:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
