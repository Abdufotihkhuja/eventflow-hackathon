import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({ example: 'Написать юнит тесты' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;
}
