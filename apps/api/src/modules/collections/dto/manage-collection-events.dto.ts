import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AddEventsToCollectionDto {
  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    description: 'ID событий для добавления в подборку',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  eventIds: string[];
}

export class RemoveEventsFromCollectionDto {
  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    description: 'ID событий для удаления из подборки',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  eventIds: string[];
}

export class ReorderCollectionEventsDto {
  @ApiProperty({
    example: ['uuid1', 'uuid2', 'uuid3'],
    description: 'ID событий в новом порядке',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  eventIds: string[];
}
