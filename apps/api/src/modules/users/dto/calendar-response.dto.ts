import { ApiProperty } from '@nestjs/swagger';
import { ParticipantRole, EventFormat } from '@prisma/client';

/**
 * Тип дня в календаре
 */
export enum CalendarDayType {
  EVENT = 'EVENT', // День события
  TRAVEL = 'TRAVEL', // День перелёта/дороги
  PREPARATION = 'PREPARATION', // День подготовки
}

/**
 * Активность на дату
 */
export class CalendarDayActivityDto {
  @ApiProperty({ description: 'ID регистрации' })
  registrationId: string;

  @ApiProperty({ description: 'ID события' })
  eventId: string;

  @ApiProperty({ description: 'Slug события для URL' })
  eventSlug: string;

  @ApiProperty({ description: 'Название события' })
  eventTitle: string;

  @ApiProperty({ description: 'Роль участника', enum: ParticipantRole })
  role: ParticipantRole;

  @ApiProperty({
    description: 'Тип активности на этот день',
    enum: CalendarDayType,
  })
  dayType: CalendarDayType;
}

/**
 * День календаря
 */
export class CalendarDayDto {
  @ApiProperty({ description: 'Дата (YYYY-MM-DD)', example: '2025-03-05' })
  date: string;

  @ApiProperty({ description: 'Номер дня', example: 5 })
  day: number;

  @ApiProperty({
    description: 'Активности на этот день',
    type: [CalendarDayActivityDto],
  })
  activities: CalendarDayActivityDto[];

  @ApiProperty({ description: 'Есть события как спикер' })
  hasSpeakerEvents: boolean;

  @ApiProperty({ description: 'Есть события как участник' })
  hasParticipantEvents: boolean;

  @ApiProperty({ description: 'Есть события как ментор' })
  hasMentorEvents: boolean;

  @ApiProperty({ description: 'Есть перелёты/дорога' })
  hasTravel: boolean;

  @ApiProperty({ description: 'Есть дни подготовки' })
  hasPreparation: boolean;
}

/**
 * Ответ календаря на месяц
 */
export class CalendarMonthResponseDto {
  @ApiProperty({ description: 'Год' })
  year: number;

  @ApiProperty({ description: 'Месяц (1-12)' })
  month: number;

  @ApiProperty({ description: 'Количество событий' })
  eventsCount: number;

  @ApiProperty({ description: 'Количество перелётов' })
  travelsCount: number;

  @ApiProperty({
    description: 'Дни месяца с активностями',
    type: [CalendarDayDto],
  })
  days: CalendarDayDto[];
}

/**
 * Событие в списке для выбранного дня
 */
export class CalendarEventItemDto {
  @ApiProperty({ description: 'ID регистрации' })
  registrationId: string;

  @ApiProperty({ description: 'ID события' })
  eventId: string;

  @ApiProperty({ description: 'Slug события для URL' })
  eventSlug: string;

  @ApiProperty({ description: 'Название события' })
  title: string;

  @ApiProperty({ description: 'Краткое описание' })
  shortDescription: string | null;

  @ApiProperty({ description: 'Роль участника', enum: ParticipantRole })
  role: ParticipantRole;

  @ApiProperty({
    description: 'Тип активности на этот день',
    enum: CalendarDayType,
  })
  dayType: CalendarDayType;

  @ApiProperty({ description: 'Формат события', enum: EventFormat })
  format: EventFormat;

  @ApiProperty({ description: 'Дата начала события' })
  startDate: Date;

  @ApiProperty({ description: 'Дата окончания события' })
  endDate: Date;

  @ApiProperty({ description: 'Место проведения' })
  venue: string | null;

  @ApiProperty({ description: 'Город' })
  city: string | null;

  @ApiProperty({ description: 'Название организации' })
  organizationName: string;
}

/**
 * Ответ со списком событий на дату
 */
export class CalendarEventsResponseDto {
  @ApiProperty({ description: 'Дата' })
  date: string;

  @ApiProperty({ description: 'Количество событий' })
  count: number;

  @ApiProperty({ description: 'События', type: [CalendarEventItemDto] })
  events: CalendarEventItemDto[];
}
