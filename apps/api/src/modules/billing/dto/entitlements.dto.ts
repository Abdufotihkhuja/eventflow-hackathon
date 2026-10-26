import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EntitlementKey,
  GenerationWindow,
  PlanKey,
  QrCheckInMode,
  StatsTier,
} from '@prisma/client';

/** Счётчик окна потребления (E-14, display-only — решает сервер). */
export class UsageMeterDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null = безлимит/не метерится' })
  limit!: number | null;

  @ApiProperty()
  used!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  periodKey!: string | null;
}

export class EventCreditsDto {
  @ApiProperty()
  granted!: number;

  @ApiProperty()
  remaining!: number;
}

/**
 * Эффективные энтайтлменты организации (E-14): UX-подсказка для кабинета.
 * НИКОГДА не используется клиентом как решение — энфорсмент серверный (E-2).
 */
export class EntitlementsDto {
  @ApiProperty({ enum: PlanKey })
  tierKey!: PlanKey;

  @ApiProperty({ enum: ['PURCHASE', 'DEFAULT'] })
  source!: 'PURCHASE' | 'DEFAULT';

  @ApiProperty({ description: 'S-19: false = тарифная система выключена (легаси-режим)' })
  enforcementEnabled!: boolean;

  @ApiProperty()
  suspended!: boolean;

  @ApiProperty({ description: 'Эффективная комиссия в bps (с учётом оверрайдов)' })
  commissionBps!: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  staffSeats!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  maxParticipantsPerEvent!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Override-лимит на число событий; null = безлимит' })
  maxEvents!: number | null;

  @ApiProperty()
  taskBoardEnabled!: boolean;

  @ApiProperty({ enum: StatsTier })
  statsTier!: StatsTier;

  @ApiProperty({ enum: QrCheckInMode })
  qrMode!: QrCheckInMode;

  @ApiProperty({ enum: GenerationWindow })
  generationWindow!: GenerationWindow;

  @ApiPropertyOptional({ type: EventCreditsDto, nullable: true })
  eventCredits!: EventCreditsDto | null;

  @ApiProperty({ type: UsageMeterDto })
  generations!: UsageMeterDto;

  @ApiProperty({ type: UsageMeterDto, description: 'AI-минуты в СЕКУНДАХ (CR-26); фронт делит на 60' })
  aiSeconds!: UsageMeterDto;

  @ApiProperty({ enum: EntitlementKey, isArray: true, description: 'Ключи, заданные per-org оверрайдами (прозрачность C-2)' })
  overridesApplied!: EntitlementKey[];
}
