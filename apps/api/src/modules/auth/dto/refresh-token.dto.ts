import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ACCOUNT_LOCALES } from '../../../common/constants/locale.constant';
import type { AccountLocale } from '../../../common/constants/locale.constant';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-here' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token обязателен' })
  refreshToken: string;

  /**
   * BL-37: актуальная локаль интерфейса клиента — синхронизируется в
   * `Account.locale` при ротации токенов (смена языка без перелогина).
   */
  @ApiPropertyOptional({ enum: ACCOUNT_LOCALES, example: 'ru' })
  @IsOptional()
  @IsIn(ACCOUNT_LOCALES)
  locale?: AccountLocale;
}
