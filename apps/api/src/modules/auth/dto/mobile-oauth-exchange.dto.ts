import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class MobileOAuthExchangeDto {
  @ApiProperty({ description: 'Single-use native OAuth exchange code' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  code: string;
}
