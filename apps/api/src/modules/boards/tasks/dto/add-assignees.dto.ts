import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class AddAssigneesDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2'],
    description: 'ID участников для назначения',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  memberIds: string[];
}
