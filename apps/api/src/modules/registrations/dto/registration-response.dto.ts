import { ApiProperty } from '@nestjs/swagger';

/**
 * Регистрация участника (строка Prisma `Registration`).
 * Верхнеуровневые scalar-поля типизируются точно (имена совпадают с runtime —
 * напр. `ticketNumber`, `qrCode`). Вложенный `event` (когда он есть, как в
 * /my-registrations) оставлен слабо типизированным, чтобы не дублировать форму
 * события и не разойтись с локализованными ключами.
 */
export class RegistrationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  eventId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'RegistrationStatus (PENDING / APPROVED / REJECTED / CANCELLED / …)' })
  status!: string;

  @ApiProperty({ description: 'ParticipantRole (PARTICIPANT / SPEAKER / MENTOR)' })
  role!: string;

  @ApiProperty({ nullable: true, type: String, description: 'Уникальный код для QR' })
  qrCode!: string | null;

  @ApiProperty({ nullable: true, type: String })
  rejectionReason!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Номер билета EVF-YYMMDD-XXXXXX' })
  ticketNumber!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  ticketIssuedAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  travelStartDate!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  travelEndDate!: Date | null;

  @ApiProperty({ description: 'Дней на подготовку до события' })
  preparationDays!: number;

  @ApiProperty({ nullable: true, type: Number })
  testScore!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  testMaxScore!: number | null;

  @ApiProperty({ nullable: true, type: Boolean })
  testPassed!: boolean | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  testCompletedAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Вложенное событие (присутствует в /my-registrations)',
  })
  event?: Record<string, unknown>;
}

/**
 * Пагинированный список регистраций пользователя (/my-registrations).
 * Каждый элемент `data` встраивает локализованное `event`.
 */
export class PaginatedRegistrationsDto {
  @ApiProperty({ type: [RegistrationDto] })
  data!: RegistrationDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
