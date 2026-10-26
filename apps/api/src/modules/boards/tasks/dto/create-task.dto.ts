import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
} from 'class-validator';
import { IsUtcIso8601 } from '../../../../common/validators/utc-iso8601.validator';
import { TaskType, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Реализовать авторизацию' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Детальное описание задачи...' })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ description: 'ID колонки' })
  @IsUUID()
  @IsNotEmpty()
  columnId: string;

  @ApiPropertyOptional({ enum: TaskType, default: TaskType.TASK })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsUtcIso8601()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2025-12-01T00:00:00Z' })
  @IsUtcIso8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  coverColor?: string;

  @ApiPropertyOptional({
    example: ['uuid-1', 'uuid-2'],
    description: 'ID тегов',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    example: ['uuid-1', 'uuid-2'],
    description: 'ID исполнителей',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
