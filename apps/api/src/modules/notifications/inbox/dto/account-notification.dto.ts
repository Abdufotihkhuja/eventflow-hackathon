import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Контрактный enum участнического инбокса (CONTRACT_DIFF §5).
 *
 * В БД `AccountNotification.type` — String (добавление типа без миграции);
 * контрактная граница — этот список: он попадает в openapi как enum
 * `AccountNotificationType`, по нему типизируются SDK и мобильный словарь.
 */
export const ACCOUNT_NOTIFICATION_TYPES = [
  'REGISTRATION_CREATED',
  'REGISTRATION_APPROVED',
  'REGISTRATION_REJECTED',
  'REGISTRATION_CANCELLED',
  'REGISTRATION_REVOKED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'HOLD_EXPIRED',
  'TICKET_ISSUED',
  'TICKET_REFUNDED',
  'CHECKED_IN',
  'EVENT_REMINDER',
  'EVENT_STARTING',
  'EVENT_CANCELLED',
  'REGISTRATION_CLOSING',
  'FEW_SEATS_LEFT',
  'EVENT_SUMMARY',
  'CERTIFICATE_ISSUED',
] as const;

export type AccountNotificationType =
  (typeof ACCOUNT_NOTIFICATION_TYPES)[number];

/**
 * Строка инбокса участника наружу.
 *
 * Та же философия, что у организаторской ленты: наружу уходят ТИП и
 * подстановки, фразу собирает клиент на своём языке — готовый текст в
 * ответе означал бы русский текст в узбекском интерфейсе.
 */
export class AccountNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({
    enum: ACCOUNT_NOTIFICATION_TYPES,
    enumName: 'AccountNotificationType',
  })
  type!: AccountNotificationType;

  @ApiPropertyOptional({
    example: 'event',
    description: 'Тип сущности, к которой ведёт уведомление',
  })
  entityType?: string | null;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  entityId?: string | null;

  @ApiPropertyOptional({
    description: 'Подстановки для локализованной строки на клиенте',
    example: { eventTitle: 'Tashkent Tech Week 2026', registrationId: '…' },
  })
  payload?: Prisma.JsonValue | null;

  @ApiPropertyOptional({ example: '2026-08-02T10:00:00.000Z' })
  readAt?: Date | null;

  @ApiProperty({ example: '2026-08-02T10:00:00.000Z' })
  createdAt!: Date;
}

export class AccountNotificationListDto {
  @ApiProperty({ type: [AccountNotificationDto] })
  data!: AccountNotificationDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 7, description: 'Сколько из них не прочитано' })
  unread!: number;
}

export class AccountNotificationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: true,
    description: 'unread=true — только непрочитанные (CONTRACT_DIFF §3)',
  })
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsOptional()
  unread?: boolean;
}

export class AccountUnreadCountDto {
  @ApiProperty({ example: 7 })
  count!: number;
}

export class AccountMarkReadDto {
  @ApiPropertyOptional({
    description: 'Что отметить прочитанным. Пусто = весь инбокс целиком.',
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsOptional()
  ids?: string[];
}
