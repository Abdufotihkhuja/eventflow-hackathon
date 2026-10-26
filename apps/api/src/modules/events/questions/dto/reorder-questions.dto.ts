import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderQuestionsDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Массив ID вопросов в нужном порядке',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  questionIds: string[];
}
