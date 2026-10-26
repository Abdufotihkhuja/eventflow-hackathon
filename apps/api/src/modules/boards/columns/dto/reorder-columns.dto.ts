import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class ReorderColumnsDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Массив ID колонок в новом порядке',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  columnIds: string[];
}
