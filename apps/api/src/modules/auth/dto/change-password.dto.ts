import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Пароль должен содержать минимум одну заглавную букву, одну строчную и одну цифру',
  })
  newPassword: string;

  @ApiProperty({ example: 'newPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Подтверждение пароля обязательно' })
  @Match('newPassword', { message: 'Пароли не совпадают' })
  confirmPassword: string;
}
