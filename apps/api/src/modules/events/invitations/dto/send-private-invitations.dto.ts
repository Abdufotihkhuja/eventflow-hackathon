import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from 'class-validator';

export const MAX_INVITATIONS_PER_REQUEST = 50;

export class SendPrivateInvitationsDto {
  @ApiProperty({
    type: [String],
    example: ['guest@example.com'],
    description: `Recipient emails, 1 to ${MAX_INVITATIONS_PER_REQUEST} per request`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_INVITATIONS_PER_REQUEST)
  @IsEmail({}, { each: true })
  emails: string[];
}
