import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnsubscribeQueryDto {
  @ApiProperty({ description: 'Signed unsubscribe token from the email link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token!: string;
}
