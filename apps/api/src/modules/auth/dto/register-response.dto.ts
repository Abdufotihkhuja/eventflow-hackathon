import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    example:
      'Регистрация прошла успешно! Добро пожаловать в EventFlow. Теперь вы можете создавать и управлять мероприятиями.',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Требуется подтвердить email перед дальнейшими шагами',
  })
  emailVerificationRequired: boolean;
}
