import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    example: 'Искусственный интеллект',
    description: 'Название тега',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
