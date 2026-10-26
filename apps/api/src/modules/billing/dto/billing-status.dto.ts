import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GenerationWindow,
  PlanKey,
  PlanPurchase,
  PlanPurchaseStatus,
  QrCheckInMode,
  StatsTier,
} from '@prisma/client';

/** Живой пакет организации (снапшот-значения на момент покупки, CR-1). */
export class ActivePlanPurchaseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PlanKey })
  planKey!: PlanKey;

  @ApiProperty({ enum: PlanPurchaseStatus })
  status!: PlanPurchaseStatus;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  activatedAt!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'date-time',
    description: 'Конец 90-дневного периода (§2.1); null у бессрочных грантов',
  })
  expiresAt!: string | null;

  @ApiProperty()
  eventCreditsGranted!: number;

  @ApiProperty()
  eventCreditsRemaining!: number;

  @ApiProperty({ description: 'Комиссия пакета в bps (снапшот; эффективную с учётом оверрайдов отдаёт /billing/entitlements)' })
  commissionBpsSnapshot!: number;

  @ApiProperty()
  aiMinutesMonthly!: number;

  @ApiProperty()
  generationCredits!: number;

  @ApiProperty({ enum: GenerationWindow })
  generationWindow!: GenerationWindow;

  @ApiProperty()
  staffSeats!: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  maxParticipantsPerEvent!: number | null;

  @ApiProperty()
  taskBoardEnabled!: boolean;

  @ApiProperty({ enum: StatsTier })
  statsTier!: StatsTier;

  @ApiProperty({ enum: QrCheckInMode })
  qrMode!: QrCheckInMode;

  static fromModel(p: PlanPurchase): ActivePlanPurchaseDto {
    const dto = new ActivePlanPurchaseDto();
    dto.id = p.id;
    dto.planKey = p.planKeySnapshot;
    dto.status = p.status;
    dto.activatedAt = p.activatedAt?.toISOString() ?? null;
    dto.expiresAt = p.expiresAt?.toISOString() ?? null;
    dto.eventCreditsGranted = p.eventCreditsGranted;
    dto.eventCreditsRemaining = p.eventCreditsRemaining;
    dto.commissionBpsSnapshot = p.commissionBpsSnapshot;
    dto.aiMinutesMonthly = p.aiMinutesMonthlySnapshot;
    dto.generationCredits = p.generationCreditsSnapshot;
    dto.generationWindow = p.generationWindowSnapshot;
    dto.staffSeats = p.staffSeatsSnapshot;
    dto.maxParticipantsPerEvent = p.maxParticipantsSnapshot;
    dto.taskBoardEnabled = p.taskBoardEnabledSnapshot;
    dto.statsTier = p.statsTierSnapshot;
    dto.qrMode = p.qrModeSnapshot;
    return dto;
  }
}

/** Статус биллинга организации (M-3). */
export class BillingStatusDto {
  @ApiProperty({ enum: PlanKey, description: 'Тариф по пакету (без оверрайдов E-1)' })
  tierKey!: PlanKey;

  @ApiProperty({ enum: ['PURCHASE', 'DEFAULT'], description: 'PURCHASE — живой пакет; DEFAULT — START (null-object)' })
  source!: 'PURCHASE' | 'DEFAULT';

  @ApiPropertyOptional({ type: ActivePlanPurchaseDto, nullable: true })
  activePurchase!: ActivePlanPurchaseDto | null;
}
