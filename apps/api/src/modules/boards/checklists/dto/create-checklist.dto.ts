import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateChecklistDto {
  @ApiProperty({ example: 'Этапы выполнения' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
}
