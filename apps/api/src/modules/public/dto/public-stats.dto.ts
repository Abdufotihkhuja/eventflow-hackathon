import { ApiProperty } from '@nestjs/swagger';

/**
 * Статистика с изменением
 */
export class PublicStatItemDto {
  @ApiProperty({ example: 12, description: 'Текущее значение' })
  value: number;

  @ApiProperty({ example: 3, description: 'Изменение за период' })
  change: number;

  @ApiProperty({ example: 'за неделю', description: 'Описание периода' })
  period: string;
}

/**
 * Статистика участников с процентом
 */
export class PublicParticipantsStatDto {
  @ApiProperty({ example: 128, description: 'Количество участников' })
  value: number;

  @ApiProperty({ example: 18, description: 'Изменение в процентах (MoM)' })
  changePercent: number;

  @ApiProperty({ example: 'MoM', description: 'Тип изменения' })
  changeType: string;
}

/**
 * Статистика конверсии
 */
export class PublicConversionStatDto {
  @ApiProperty({ example: 42, description: 'Конверсия в процентах' })
  value: number;

  @ApiProperty({ example: 'по всем событиям', description: 'Описание' })
  description: string;
}

/**
 * Публичная статистика платформы
 */
export class PlatformStatsDto {
  @ApiProperty({ type: PublicStatItemDto, description: 'Активные события' })
  activeEvents: PublicStatItemDto;

  @ApiProperty({
    type: PublicParticipantsStatDto,
    description: 'Новые участники',
  })
  newParticipants: PublicParticipantsStatDto;

  @ApiProperty({
    type: PublicConversionStatDto,
    description: 'Конверсия регистрации',
  })
  registrationConversion: PublicConversionStatDto;

  @ApiProperty({ example: 50, description: 'Всего организаций' })
  totalOrganizations: number;

  @ApiProperty({ example: 1500, description: 'Всего участников' })
  totalParticipants: number;

  @ApiProperty({ example: 200, description: 'Всего событий' })
  totalEvents: number;
}

/**
 * Публичная статистика организации
 */
export class OrganizationPublicStatsDto {
  @ApiProperty({ example: 'uuid', description: 'ID организации' })
  id: string;

  @ApiProperty({
    example: 'EventFlow Inc.',
    description: 'Название организации',
  })
  name: string;

  @ApiProperty({
    example: 'https://...',
    description: 'Логотип',
    required: false,
  })
  logoUrl?: string;

  @ApiProperty({ type: PublicStatItemDto, description: 'Активные события' })
  activeEvents: PublicStatItemDto;

  @ApiProperty({
    type: PublicParticipantsStatDto,
    description: 'Новые участники',
  })
  newParticipants: PublicParticipantsStatDto;

  @ApiProperty({
    type: PublicConversionStatDto,
    description: 'Конверсия регистрации',
  })
  registrationConversion: PublicConversionStatDto;

  @ApiProperty({ example: 15, description: 'Всего событий организации' })
  totalEvents: number;

  @ApiProperty({ example: 450, description: 'Всего участников' })
  totalParticipants: number;
}

/**
 * Тематика события для публичной страницы (slug + локализованное название)
 */
export class PublicEventCategoryDto {
  @ApiProperty({ example: 'hackathon', description: 'Slug тематики' })
  slug: string;

  @ApiProperty({ example: 'Хакатоны', description: 'Локализованное название' })
  name: string;
}

/**
 * Краткая информация о событии для публичной страницы
 */
export class PublicEventItemDto {
  @ApiProperty({ example: 'uuid', description: 'ID события' })
  id: string;

  @ApiProperty({
    example: 'tech-conference-2025',
    description: 'SEO-friendly slug для URL',
  })
  slug: string;

  @ApiProperty({ example: 'Tech Conference 2025', description: 'Название' })
  title: string;

  @ApiProperty({
    example: 'Описание события...',
    description: 'Краткое описание',
    required: false,
  })
  shortDescription?: string;

  @ApiProperty({
    example: 'https://...',
    description: 'Обложка',
    required: false,
  })
  coverImage?: string;

  @ApiProperty({ example: '2025-06-15T10:00:00Z', description: 'Дата начала' })
  startDate: Date;

  @ApiProperty({
    example: '2025-06-15T18:00:00Z',
    description: 'Дата окончания',
  })
  endDate: Date;

  @ApiProperty({ example: 'ONLINE', description: 'Формат события' })
  format: string;

  @ApiProperty({ example: 'FREE', description: 'Тип события' })
  type: string;

  @ApiProperty({
    example: 'PUBLISHED',
    description: 'Статус события (PUBLISHED, COMPLETED)',
  })
  status: string;

  @ApiProperty({ example: 'Ташкент', description: 'Город', required: false })
  city?: string;

  @ApiProperty({
    type: () => [PublicEventCategoryDto],
    description: 'Тематики события (slug + локализованное название)',
  })
  categories: PublicEventCategoryDto[];

  @ApiProperty({
    example: 100,
    description: 'Максимум участников',
    required: false,
  })
  maxParticipants?: number;

  @ApiProperty({ example: 45, description: 'Текущее количество регистраций' })
  registrationsCount: number;

  @ApiProperty({
    example: false,
    description: 'Топовое событие (отмечено супер-админом)',
  })
  isFeatured: boolean;

  @ApiProperty({
    example: 'Технопарк, зал «Олимп»',
    description: 'Название места проведения (offline/hybrid)',
    required: false,
  })
  venue?: string;

  @ApiProperty({
    example: 240000,
    description: 'Цена билета в минимальной валютной единице события',
    required: false,
  })
  price?: number;

  @ApiProperty({
    example: 'UZS',
    description: 'Валюта цены билета',
  })
  currency: string;

  @ApiProperty({
    example: 41.311081,
    description: 'Широта места проведения (для карты)',
    required: false,
  })
  latitude?: number;

  @ApiProperty({
    example: 69.240562,
    description: 'Долгота места проведения (для карты)',
    required: false,
  })
  longitude?: number;

  @ApiProperty({ description: 'Информация об организации' })
  organization: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

/**
 * Список публичных событий с пагинацией
 */
export class PublicEventsListDto {
  @ApiProperty({ type: [PublicEventItemDto], description: 'Список событий' })
  items: PublicEventItemDto[];

  @ApiProperty({ example: 50, description: 'Всего событий' })
  total: number;

  @ApiProperty({ example: 1, description: 'Текущая страница' })
  page: number;

  @ApiProperty({ example: 10, description: 'Событий на странице' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Всего страниц' })
  totalPages: number;
}
