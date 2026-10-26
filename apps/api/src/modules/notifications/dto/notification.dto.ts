import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, Prisma } from '@prisma/client';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Уведомление наружу.
 *
 * Никакого готового текста: наружу уходят ТИП и подстановки, фразу собирает
 * клиент на своём языке. Лента активности на дашборде отдаёт предформатированную
 * русскую строку — и мобильный клиент вынужден её игнорировать, иначе узбекский
 * интерфейс показывает русский. Не повторяем.
 */
export class NotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiPropertyOptional({
    example: 'event',
    description: 'Тип сущности, к которой ведёт уведомление',
  })
  entityType?: string | null;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  entityId?: string | null;

  @ApiPropertyOptional({
    description: 'Подстановки для локализованной строки на клиенте',
    example: { eventTitle: 'Tashkent Tech Week 2026', personName: 'Дилшод' },
  })
  payload?: Prisma.JsonValue | null;

  @ApiPropertyOptional({ example: '2026-07-29T10:00:00.000Z' })
  readAt?: Date | null;

  @ApiProperty({ example: '2026-07-29T10:00:00.000Z' })
  createdAt!: Date;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationDto] })
  data!: NotificationDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 7, description: 'Сколько из них не прочитано' })
  unread!: number;
}

export class NotificationQueryDto {
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
}

export class UnreadCountDto {
  @ApiProperty({ example: 7 })
  count!: number;
}

export class MarkReadDto {
  @ApiPropertyOptional({
    description:
      'Что отметить прочитанным. Пусто = вся лента организации целиком.',
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsOptional()
  ids?: string[];
}
