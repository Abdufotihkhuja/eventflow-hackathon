import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ACCOUNT_LOCALES } from '../../../common/constants/locale.constant';
import type { AccountLocale } from '../../../common/constants/locale.constant';

export class WebRefreshDto {
  @ApiPropertyOptional({ enum: ACCOUNT_LOCALES })
  @IsOptional()
  @IsIn(ACCOUNT_LOCALES)
  locale?: AccountLocale;
}
