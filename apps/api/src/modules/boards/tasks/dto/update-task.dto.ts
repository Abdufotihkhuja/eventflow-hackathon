import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['columnId'] as const),
) {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional({ example: 4.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  loggedHours?: number;
}
