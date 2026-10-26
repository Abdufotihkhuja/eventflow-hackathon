import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderSpeakersDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Массив ID спикеров в нужном порядке',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  speakerIds: string[];
}
