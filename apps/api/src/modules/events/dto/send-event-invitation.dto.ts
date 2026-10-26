import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendEventInvitationDto {
  @ApiProperty({
    example: 'guest@example.com',
    description: 'Email получателя приглашения',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
