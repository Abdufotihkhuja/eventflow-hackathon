import { ApiProperty } from '@nestjs/swagger';

/**
 * Публичное (локализованное) подробное представление события.
 *
 * Сервис возвращает спред всех scalar-полей `Event` плюс резолвнутые под локаль
 * `title`/`shortDescription`/`venue`/`city`/`description`, вложенные
 * `organization`/`speakers[]`/`agendaItems[]`/`categories[]`/`rooms[]`/
 * `registrationQuestions[]`, скаляр `registrationsCount` и опциональный
 * `myRegistration`. Глубокие/локализуемые/рекурсивные формы намеренно оставлены
 * слабо типизированными (`additionalProperties: true`), чтобы не дублировать
 * дерево и не разойтись с runtime-ключами — типизируются только верхнеуровневые
 * поля, которые читает мобильное приложение (MOBILE_API.md §2.1).
 */
export class PublicEventDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  shortDescription!: string | null;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'BlockNote document JSON (Block[]) или null',
  })
  description!: Record<string, unknown> | unknown[] | null;

  @ApiProperty({ description: 'EventType (FREE / PAID)' })
  type!: string;

  @ApiProperty({ description: 'EventAccessType (OPEN / INVITE_ONLY / PRIVATE)' })
  accessType!: string;

  @ApiProperty({ nullable: true, type: String, description: 'Decimal как строка или null' })
  price!: string | null;

  @ApiProperty({ nullable: true, type: String })
  coverImage!: string | null;

  @ApiProperty({ nullable: true, type: String })
  venue!: string | null;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  city!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Decimal как строка или null' })
  latitude!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Decimal как строка или null' })
  longitude!: string | null;

  @ApiProperty({ nullable: true, type: String })
  onlineUrl!: string | null;

  @ApiProperty({ format: 'date-time' })
  startDate!: Date;

  @ApiProperty({ format: 'date-time' })
  endDate!: Date;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  registrationDeadline!: Date | null;

  @ApiProperty({ description: 'EventFormat (OFFLINE / ONLINE / HYBRID)' })
  format!: string;

  @ApiProperty({ description: 'EventStatus (PUBLISHED / COMPLETED / …)' })
  status!: string;

  @ApiProperty({ nullable: true, type: Number })
  maxParticipants!: number | null;

  @ApiProperty({ description: 'Число одобренных регистраций' })
  registrationsCount!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Организатор (id, name, companyName, logoUrl, …)',
  })
  organization!: Record<string, unknown>;

  @ApiProperty({
    type: 'array',
    description: 'Спикеры события (полная форма Speaker)',
    items: { type: 'object', additionalProperties: true },
  })
  speakers!: Record<string, unknown>[];

  @ApiProperty({
    type: 'array',
    description: 'Пункты программы (локализованная форма agenda-item)',
    items: { type: 'object', additionalProperties: true },
  })
  agendaItems!: Record<string, unknown>[];

  @ApiProperty({
    type: 'array',
    description: 'Категории события (id, slug, name)',
    items: { type: 'object', additionalProperties: true },
  })
  categories!: Record<string, unknown>[];

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Регистрация текущего пользователя { id, status, eventId } или null',
  })
  myRegistration!: Record<string, unknown> | null;
}
