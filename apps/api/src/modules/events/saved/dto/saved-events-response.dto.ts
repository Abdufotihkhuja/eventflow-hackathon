import { ApiProperty } from '@nestjs/swagger';

/**
 * Сохранённое мероприятие (строка `SavedEvent` + встроенное `event`).
 * Верхнеуровневые поля закладки типизируются точно; вложенное локализованное
 * `event` оставлено слабо типизированным, чтобы не дублировать форму события.
 */
export class SavedEventItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty({ format: 'date-time' })
  savedAt!: Date;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Локализованное событие (с organization и _count.registrations)',
  })
  event!: Record<string, unknown>;
}

/**
 * Пагинированный список сохранённых мероприятий (/account/me/saved-events).
 */
export class PaginatedSavedEventsDto {
  @ApiProperty({ type: [SavedEventItemDto] })
  data!: SavedEventItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
