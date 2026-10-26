import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokensResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...' })
  refreshToken: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Флаг, указывающий что пользователь только что зарегистрирован (для OAuth)',
  })
  isNewUser?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Флаг, указывающий что онбординг завершен',
  })
  isOnboardingCompleted?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Флаг, указывающий что требуется подтверждение email',
  })
  emailVerificationRequired?: boolean;
}
