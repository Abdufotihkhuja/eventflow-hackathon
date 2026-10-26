import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class AttendanceQueryDto {
  @ApiPropertyOptional({ example: '2025-06-15' })
  @IsDateString()
  @IsOptional()
  date?: string;
}
