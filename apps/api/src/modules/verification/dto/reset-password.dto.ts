import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: '123456', description: '6-значный код верификации' })
  @IsString({ message: 'Код должен быть строкой' })
  @IsNotEmpty({ message: 'Код обязателен' })
  @Length(6, 6, { message: 'Код должен состоять из 6 цифр' })
  @Matches(/^\d{6}$/, { message: 'Код должен содержать только цифры' })
  code: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'Новый пароль',
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  newPassword: string;
}
