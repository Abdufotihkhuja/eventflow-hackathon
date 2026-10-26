import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMaxSize, IsUUID } from 'class-validator';

export class AssignTagsDto {
  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174001',
      '323e4567-e89b-12d3-a456-426614174002',
    ],
    description: 'Массив ID тегов (максимум 3)',
  })
  @IsArray()
  @ArrayMaxSize(3, { message: 'Можно назначить максимум 3 тега' })
  @IsUUID('4', { each: true })
  tagIds: string[];
}
