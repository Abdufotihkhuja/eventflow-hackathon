import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSpeakerInvitationDto {
  @ApiProperty({
    example: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
    description: 'Токен приглашения из email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Токен приглашения обязателен' })
  token: string;

  @ApiPropertyOptional({
    example: 'К сожалению, в указанные даты у меня другие обязательства',
    description: 'Причина отклонения приглашения (опционально)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, {
    message: 'Причина отклонения не должна превышать 500 символов',
  })
  reason?: string;
}
