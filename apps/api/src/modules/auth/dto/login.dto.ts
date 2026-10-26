import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ACCOUNT_LOCALES } from '../../../common/constants/locale.constant';
import type { AccountLocale } from '../../../common/constants/locale.constant';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;

  /**
   * BL-37: локаль интерфейса клиента. При успешном входе сохраняется в
   * `Account.locale` — язык писем и killed-push. Аддитивное поле: старые
   * клиенты его не шлют, локаль аккаунта тогда не трогается.
   */
  @ApiPropertyOptional({ enum: ACCOUNT_LOCALES, example: 'ru' })
  @IsOptional()
  @IsIn(ACCOUNT_LOCALES)
  locale?: AccountLocale;
}
