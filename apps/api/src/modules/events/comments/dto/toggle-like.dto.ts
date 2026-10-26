import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleLikeDto {
  @ApiProperty({
    example: true,
    description: 'true - лайк, false - дизлайк',
  })
  @IsBoolean()
  isLike: boolean;
}
