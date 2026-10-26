import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { VerificationCodeType } from '@prisma/client';

export class SendVerificationCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    enum: VerificationCodeType,
    example: VerificationCodeType.EMAIL_VERIFICATION,
    description: 'Тип кода верификации',
  })
  @IsEnum(VerificationCodeType, {
    message: 'Некорректный тип кода верификации',
  })
  @IsNotEmpty({ message: 'Тип кода обязателен' })
  type: VerificationCodeType;
}
