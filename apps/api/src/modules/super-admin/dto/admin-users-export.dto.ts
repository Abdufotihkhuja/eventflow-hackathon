import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  EXPORT_LOCALES,
  USER_EXPORT_FIELD_KEYS,
  type ExportLocale,
} from '../users-export.fields';

/**
 * Запрос выгрузки пользователей в XLSX.
 *
 * Фильтры повторяют AdminUsersQueryDto (без page/limit — выгрузка идёт по всей
 * выборке), плюс набор колонок. `fields` — вайтлист из каталога выгрузки:
 * произвольные имена полей в файл не попадают.
 */
export class AdminUsersExportQueryDto {
  @ApiPropertyOptional({ description: 'Поиск по email или имени' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Фильтр по верификации email' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Фильтр по состоянию',
    enum: ['active', 'archived', 'all'],
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'archived', 'all'])
  status?: 'active' | 'archived' | 'all';

  @ApiPropertyOptional({
    description:
      'Колонки выгрузки (через запятую). Пустой список — набор по умолчанию.',
    isArray: true,
    enum: USER_EXPORT_FIELD_KEYS,
  })
  @IsOptional()
  @Transform(({ value }): string[] | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = Array.isArray(value) ? value : String(value).split(',');
    return list.map((item) => String(item).trim()).filter(Boolean);
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(USER_EXPORT_FIELD_KEYS.length)
  @IsIn(USER_EXPORT_FIELD_KEYS, { each: true })
  fields?: string[];

  @ApiPropertyOptional({
    description: 'Локаль заголовков файла',
    enum: EXPORT_LOCALES,
    default: 'ru',
  })
  @IsOptional()
  @IsIn(EXPORT_LOCALES)
  locale?: ExportLocale;
}
