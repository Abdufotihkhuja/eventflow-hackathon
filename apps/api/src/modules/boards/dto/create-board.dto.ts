import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ example: 'EventFlow - Разработка' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Основная доска для управления задачами' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'ID мероприятия (опционально)' })
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Настройки кастомизации доски',
    example: { theme: 'light', cardSize: 'medium' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}
