import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ACCOUNT_LOCALES } from '../../../common/constants/locale.constant';
import type { AccountLocale } from '../../../common/constants/locale.constant';

export class MemberLoginDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;

  @ApiProperty({
    example: '123456789',
    description: 'ИНН организации (до 20 символов)',
  })
  @IsString()
  @IsNotEmpty({ message: 'ИНН организации обязателен' })
  @Length(1, 20, { message: 'ИНН должен содержать от 1 до 20 символов' })
  inn: string;

  /** BL-37: локаль интерфейса клиента — сохраняется в `Account.locale`. */
  @ApiPropertyOptional({ enum: ACCOUNT_LOCALES, example: 'ru' })
  @IsOptional()
  @IsIn(ACCOUNT_LOCALES)
  locale?: AccountLocale;
}
