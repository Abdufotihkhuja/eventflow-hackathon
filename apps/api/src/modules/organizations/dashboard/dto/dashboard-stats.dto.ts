import { ApiProperty } from '@nestjs/swagger';

/**
 * Статистика с изменением за период
 */
export class StatWithChangeDto {
  @ApiProperty({ example: 12, description: 'Текущее значение' })
  value: number;

  @ApiProperty({ example: 25, description: 'Изменение в процентах' })
  changePercent: number;

  @ApiProperty({ example: 3, description: 'Абсолютное изменение' })
  changeAbsolute: number;

  @ApiProperty({ example: '30 дней', description: 'Период сравнения' })
  period: string;
}

/**
 * Статистика событий
 */
export class EventsStatsDto {
  @ApiProperty({ type: StatWithChangeDto, description: 'Активные события' })
  active: StatWithChangeDto;

  @ApiProperty({ example: 12, description: 'Всего событий' })
  total: number;

  @ApiProperty({ example: 3, description: 'Черновиков' })
  drafts: number;

  @ApiProperty({ example: 2, description: 'Завершённых' })
  completed: number;
}

/**
 * Статистика тикетов/задач
 */
export class TicketsStatsDto {
  @ApiProperty({ type: StatWithChangeDto, description: 'Открытые тикеты' })
  open: StatWithChangeDto;

  @ApiProperty({ example: 15, description: 'Всего задач' })
  total: number;

  @ApiProperty({ example: 10, description: 'Завершённых задач' })
  completed: number;
}

/**
 * Статистика участников
 */
export class ParticipantsStatsDto {
  @ApiProperty({ example: 128, description: 'Новые участники' })
  newCount: number;

  @ApiProperty({ example: 18, description: 'Изменение MoM в процентах' })
  momChangePercent: number;

  @ApiProperty({ example: 450, description: 'Всего участников' })
  total: number;
}

/**
 * Статистика конверсии
 */
export class ConversionStatsDto {
  @ApiProperty({
    example: 42,
    description: 'Конверсия регистрации в процентах',
  })
  registrationRate: number;

  @ApiProperty({ example: 85, description: 'Процент посещаемости' })
  attendanceRate: number;

  @ApiProperty({ example: 200, description: 'Всего регистраций' })
  totalRegistrations: number;

  @ApiProperty({ example: 170, description: 'Одобренных регистраций' })
  approvedRegistrations: number;
}

/**
 * Полная статистика Dashboard
 */
export class DashboardStatsDto {
  @ApiProperty({ type: EventsStatsDto, description: 'Статистика событий' })
  events: EventsStatsDto;

  @ApiProperty({ type: TicketsStatsDto, description: 'Статистика тикетов' })
  tickets: TicketsStatsDto;

  @ApiProperty({
    type: ParticipantsStatsDto,
    description: 'Статистика участников',
  })
  participants: ParticipantsStatsDto;

  @ApiProperty({
    type: ConversionStatsDto,
    description: 'Статистика конверсии',
  })
  conversion: ConversionStatsDto;
}
