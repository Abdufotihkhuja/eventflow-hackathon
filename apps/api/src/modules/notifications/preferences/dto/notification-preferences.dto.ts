import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { PREFERENCE_KEYS } from '../../catalog';
import type { PreferenceKey } from '../../catalog';

/** Изменяемые ключи матрицы (CONTRACT_DIFF §2) — единственные, что PATCH примет. */
export const PREFERENCE_KEY_VALUES: readonly PreferenceKey[] =
  Object.values(PREFERENCE_KEYS);

export const PREFERENCE_CHANNELS = ['push', 'email'] as const;
export type PreferenceChannel = (typeof PREFERENCE_CHANNELS)[number];

/**
 * Псевдо-ключ transactional-строки матрицы: GET отдаёт её с `locked: true`,
 * чтобы UI показал «эти уведомления отключить нельзя». В PATCH ключ не входит
 * в PREFERENCE_KEY_VALUES → любой такой change отбивается 400 по построению.
 */
export const TRANSACTIONAL_MATRIX_KEY = 'transactional';

export class NotificationPreferenceItemDto {
  @ApiProperty({
    description:
      'Ключ матрицы (PreferenceKey) либо псевдо-ключ transactional-строки',
    example: 'event_reminders',
    enum: [TRANSACTIONAL_MATRIX_KEY, ...PREFERENCE_KEY_VALUES],
  })
  key!: string;

  @ApiProperty({ description: 'Эффективное значение push-канала' })
  push!: boolean;

  @ApiProperty({ description: 'Эффективное значение email-канала' })
  email!: boolean;

  @ApiProperty({
    description:
      'true — строку нельзя менять (transactional-уведомления не отключаются)',
  })
  locked!: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({
    type: [NotificationPreferenceItemDto],
    description:
      'ПОЛНАЯ матрица: все ключи каталога с эффективными значениями ' +
      '(строка БД или дефолт on) — клиент никогда не мёржит дефолты сам',
  })
  preferences!: NotificationPreferenceItemDto[];
}

export class PreferenceChangeDto {
  @ApiProperty({ enum: PREFERENCE_KEY_VALUES, example: 'event_reminders' })
  @IsIn(PREFERENCE_KEY_VALUES, {
    message:
      'key must be one of the editable preference keys (transactional rows are locked)',
  })
  key!: PreferenceKey;

  @ApiProperty({ enum: PREFERENCE_CHANNELS })
  @IsIn(PREFERENCE_CHANNELS)
  channel!: PreferenceChannel;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: [PreferenceChangeDto],
    description: 'Частичное обновление: только изменяемые ячейки матрицы',
  })
  @IsArray()
  @ArrayMinSize(1)
  // Матрица конечна: ключи × каналы; запас на дубли в одном запросе.
  @ArrayMaxSize(PREFERENCE_KEY_VALUES.length * PREFERENCE_CHANNELS.length)
  @ValidateNested({ each: true })
  @Type(() => PreferenceChangeDto)
  changes!: PreferenceChangeDto[];
}
