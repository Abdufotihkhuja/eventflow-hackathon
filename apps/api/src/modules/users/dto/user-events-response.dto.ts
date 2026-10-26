import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EventFormat,
  EventStatus,
  RegistrationStatus,
  ParticipantRole,
} from '@prisma/client';

/**
 * Статистика для быстрого обзора на странице "Мои события"
 */
export class UserEventsStatsDto {
  @ApiProperty({ example: 12, description: 'Общее количество событий' })
  totalEvents: number;

  @ApiProperty({
    example: 8,
    description: 'Количество подтверждённых регистраций',
  })
  approvedEvents: number;

  @ApiProperty({ example: 2, description: 'Количество ожидающих регистраций' })
  pendingEvents: number;

  @ApiProperty({ example: 5, description: 'Количество посещённых событий' })
  attendedEvents: number;

  @ApiProperty({ example: 2, description: 'Количество отменённых регистраций' })
  cancelledEvents: number;

  @ApiProperty({
    example: 3,
    description: 'Количество сертификатов пользователя',
  })
  certificatesCount: number;
}

/**
 * Информация о посещении события
 */
export class UserEventAttendanceDto {
  @ApiProperty({ description: 'ID записи о посещении' })
  id: string;

  @ApiProperty({ description: 'Дата и время чек-ина' })
  checkInAt: Date;

  @ApiProperty({ description: 'Дата чек-ина' })
  checkInDate: Date;
}

/**
 * Информация о сертификате события
 */
export class UserEventCertificateDto {
  @ApiProperty({ description: 'ID сертификата' })
  id: string;

  @ApiPropertyOptional({ description: 'URL сертификата' })
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'Дата генерации' })
  generatedAt?: Date;
}

/**
 * Информация о событии в регистрации пользователя
 */
export class UserEventInfoDto {
  @ApiProperty({ description: 'ID события' })
  id: string;

  @ApiProperty({ description: 'Slug события для URL' })
  slug: string;

  @ApiProperty({
    example: 'Tech Conference 2025',
    description: 'Название события',
  })
  title: string;

  @ApiPropertyOptional({ description: 'Обложка события' })
  coverImage?: string;

  @ApiPropertyOptional({ description: 'Краткое описание' })
  shortDescription?: string;

  @ApiProperty({ description: 'Дата начала события' })
  startDate: Date;

  @ApiProperty({ description: 'Дата окончания события' })
  endDate: Date;

  @ApiProperty({ enum: EventFormat, description: 'Формат события' })
  format: EventFormat;

  @ApiPropertyOptional({ description: 'Место проведения' })
  venue?: string;

  @ApiPropertyOptional({ description: 'Город' })
  city?: string;

  @ApiProperty({ enum: EventStatus, description: 'Статус события' })
  status: EventStatus;

  @ApiProperty({ description: 'Название организации' })
  organizationName: string;
}

/**
 * Элемент списка событий пользователя
 */
export class UserEventItemDto {
  @ApiProperty({ description: 'ID регистрации' })
  id: string;

  @ApiProperty({ enum: RegistrationStatus, description: 'Статус регистрации' })
  status: RegistrationStatus;

  @ApiProperty({ enum: ParticipantRole, description: 'Роль участника' })
  role: ParticipantRole;

  @ApiPropertyOptional({ description: 'QR-код для чек-ина' })
  qrCode?: string;

  @ApiPropertyOptional({ description: 'Причина отклонения' })
  rejectionReason?: string;

  @ApiProperty({ description: 'Дата регистрации' })
  createdAt: Date;

  @ApiProperty({ type: UserEventInfoDto, description: 'Информация о событии' })
  event: UserEventInfoDto;

  @ApiProperty({
    type: [UserEventAttendanceDto],
    description: 'Записи о посещении',
  })
  attendances: UserEventAttendanceDto[];

  @ApiPropertyOptional({
    type: UserEventCertificateDto,
    description: 'Сертификат',
  })
  certificate?: UserEventCertificateDto;

  @ApiProperty({ example: false, description: 'Был ли чек-ин на событии' })
  isAttended: boolean;

  @ApiProperty({ example: false, description: 'Прошло ли событие' })
  isPastEvent: boolean;
}

/**
 * Ответ со списком событий пользователя
 */
export class UserEventsResponseDto {
  @ApiProperty({ type: [UserEventItemDto], description: 'Список событий' })
  data: UserEventItemDto[];

  @ApiProperty({ example: 25, description: 'Общее количество' })
  total: number;

  @ApiProperty({ example: 1, description: 'Текущая страница' })
  page: number;

  @ApiProperty({ example: 10, description: 'Элементов на странице' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Всего страниц' })
  totalPages: number;
}

/**
 * Ответ со списком событий и статистикой
 */
export class UserEventsWithStatsResponseDto extends UserEventsResponseDto {
  @ApiProperty({ type: UserEventsStatsDto, description: 'Статистика событий' })
  stats: UserEventsStatsDto;
}
