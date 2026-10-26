import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderAgendaDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Массив ID пунктов программы в нужном порядке',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];
}
