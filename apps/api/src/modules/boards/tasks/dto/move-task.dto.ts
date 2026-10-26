import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class MoveTaskDto {
  @ApiProperty({ description: 'ID целевой колонки' })
  @IsUUID()
  @IsNotEmpty()
  columnId: string;

  @ApiPropertyOptional({ example: 0, description: 'Новая позиция в колонке' })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}
