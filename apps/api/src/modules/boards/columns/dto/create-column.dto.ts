import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ example: 'В работе' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 5, description: 'Work In Progress лимит' })
  @IsInt()
  @Min(1)
  @IsOptional()
  wipLimit?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Колонка "Готово" - помечает задачи выполненными',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
