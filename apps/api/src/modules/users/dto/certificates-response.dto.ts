import { ApiProperty } from '@nestjs/swagger';

/**
 * Статистика сертификатов пользователя
 */
export class CertificatesStatsDto {
  @ApiProperty({ description: 'Всего сертификатов', example: 3 })
  totalCertificates: number;

  @ApiProperty({ description: 'Верифицированных сертификатов', example: 3 })
  verifiedCertificates: number;

  @ApiProperty({ description: 'Общее количество часов обучения', example: 104 })
  totalTrainingHours: number;
}

/**
 * Сертификат пользователя
 */
export class UserCertificateDto {
  @ApiProperty({ description: 'ID сертификата' })
  id: string;

  @ApiProperty({ description: 'Название сертификата' })
  title: string;

  @ApiProperty({ description: 'Название провайдера/академии' })
  provider: string;

  @ApiProperty({ description: 'Описание программы', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Дата выдачи' })
  issueDate: Date;

  @ApiProperty({ description: 'Дата истечения', nullable: true })
  expiryDate: Date | null;

  @ApiProperty({ description: 'Часов обучения' })
  trainingHours: number;

  @ApiProperty({
    description: 'Уникальный идентификатор сертификата',
    nullable: true,
  })
  credentialId: string | null;

  @ApiProperty({ description: 'Ссылка для проверки', nullable: true })
  credentialUrl: string | null;

  @ApiProperty({ description: 'Ссылка на PDF файл', nullable: true })
  certificateUrl: string | null;

  @ApiProperty({ description: 'Навыки/теги', type: [String] })
  skills: string[];

  @ApiProperty({ description: 'Верифицирован ли' })
  isVerified: boolean;

  @ApiProperty({ description: 'Цвет карточки', nullable: true })
  color: string | null;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;
}

/**
 * Сертификат с мероприятия (выдан за участие)
 */
export class EventCertificateItemDto {
  @ApiProperty({ description: 'ID сертификата' })
  id: string;

  @ApiProperty({
    description: 'ID регистрации (для скачивания)',
    nullable: true,
  })
  registrationId: string | null;

  @ApiProperty({ description: 'Название мероприятия', nullable: true })
  eventName: string | null;

  @ApiProperty({ description: 'Дата мероприятия', nullable: true })
  eventDate: Date | null;

  @ApiProperty({ description: 'Ссылка на PDF', nullable: true })
  certificateUrl: string | null;

  @ApiProperty({ description: 'Дата выдачи (генерации)', nullable: true })
  generatedAt: Date | null;

  @ApiProperty({ description: 'Код верификации', nullable: true })
  verificationCode: string | null;
}

/**
 * Ответ со списком сертификатов и статистикой
 */
export class CertificatesListResponseDto {
  @ApiProperty({ description: 'Статистика', type: CertificatesStatsDto })
  stats: CertificatesStatsDto;

  @ApiProperty({
    description: 'Профильные сертификаты (добавленные вручную)',
    type: [UserCertificateDto],
  })
  certificates: UserCertificateDto[];

  @ApiProperty({
    description: 'Сертификаты с мероприятий',
    type: [EventCertificateItemDto],
  })
  eventCertificates: EventCertificateItemDto[];
}

/**
 * Query параметры для списка сертификатов
 */
export class CertificatesQueryDto {
  @ApiProperty({ description: 'Поиск по названию', required: false })
  search?: string;

  @ApiProperty({
    description: 'Фильтр по верификации',
    required: false,
    enum: ['all', 'verified', 'unverified'],
  })
  filter?: 'all' | 'verified' | 'unverified';
}
