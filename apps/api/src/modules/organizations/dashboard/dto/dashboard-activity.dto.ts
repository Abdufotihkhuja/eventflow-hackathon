import { ApiProperty } from '@nestjs/swagger';

/**
 * Тип активности в команде
 */
export enum TeamActivityType {
  REGISTRATION = 'REGISTRATION', // Новая регистрация на событие
  EVENT_CREATED = 'EVENT_CREATED', // Создано новое событие
  EVENT_PUBLISHED = 'EVENT_PUBLISHED', // Событие опубликовано
  TASK_CREATED = 'TASK_CREATED', // Создана новая задача
  TASK_COMPLETED = 'TASK_COMPLETED', // Задача завершена
  MEMBER_JOINED = 'MEMBER_JOINED', // Новый участник команды
}

/**
 * Элемент активности
 */
export class ActivityItemDto {
  @ApiProperty({ example: 'uuid', description: 'ID активности' })
  id: string;

  @ApiProperty({
    enum: TeamActivityType,
    example: TeamActivityType.REGISTRATION,
    description: 'Тип активности',
  })
  type: TeamActivityType;

  @ApiProperty({
    example: '+1 регистрация на Eventflow Meetup 2025',
    description: 'Описание активности',
  })
  description: string;

  @ApiProperty({
    example: 'Eventflow Meetup 2025',
    description: 'Название связанной сущности',
  })
  entityName: string;

  @ApiProperty({
    example: 'uuid',
    description: 'ID связанной сущности',
    required: false,
  })
  entityId?: string;

  @ApiProperty({
    example: '2025-01-06T10:30:00Z',
    description: 'Время активности',
  })
  createdAt: Date;

  @ApiProperty({
    example: '5 мин назад',
    description: 'Время в человекочитаемом формате',
  })
  timeAgo: string;
}

/**
 * Ответ командной активности
 */
export class DashboardActivityDto {
  @ApiProperty({
    type: [ActivityItemDto],
    description: 'Список активностей за последние 24 часа',
  })
  items: ActivityItemDto[];

  @ApiProperty({ example: 15, description: 'Всего активностей за 24 часа' })
  totalCount: number;

  @ApiProperty({
    example: '2025-01-06T10:00:00Z',
    description: 'Начало периода (24 часа назад)',
  })
  periodStart: Date;

  @ApiProperty({
    example: '2025-01-07T10:00:00Z',
    description: 'Конец периода (сейчас)',
  })
  periodEnd: Date;
}
