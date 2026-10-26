import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Match } from '../../../common/decorators';

export class RegisterUserDto {
  @ApiProperty({ example: 'Abdufotihkhuja' })
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  firstName: string;

  @ApiProperty({ example: 'Ravshankhujaev' })
  @IsString()
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  lastName: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: 'Qwer123$' })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;

  @ApiProperty({ example: 'Qwer123$' })
  @IsString()
  @IsNotEmpty({ message: 'Подтверждение пароля обязательно' })
  @Match('password', { message: 'Пароли не совпадают' })
  passwordConfirm: string;
}
