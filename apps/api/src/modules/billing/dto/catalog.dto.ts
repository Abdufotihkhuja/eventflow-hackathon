import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdBillingUnit,
  AddonSku,
  AddonSkuKind,
  CoinMetric,
  GenerationWindow,
  Plan,
  PlanKey,
  QrCheckInMode,
  StatsTier,
} from '@prisma/client';

/**
 * DTO каталога (M-1). Деньги — строки минорных единиц (D-3, string-on-wire);
 * отображаемых названий нет — фронтенды берут строки из i18n по key/code (CR-19).
 */
export class PlanDto {
  @ApiProperty({ enum: PlanKey })
  key!: PlanKey;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Цена пакета в тийинах UZS строкой; null — цена не установлена',
  })
  priceAmountMinor!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  usdAnchorCents!: number | null;

  @ApiProperty()
  isPurchasable!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  eventCredits!: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  validityDays!: number | null;

  @ApiProperty()
  commissionBps!: number;

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

  @ApiProperty()
  sortOrder!: number;

  static fromModel(plan: Plan): PlanDto {
    const dto = new PlanDto();
    dto.key = plan.key;
    dto.priceAmountMinor = plan.priceAmountMinor?.toString(10) ?? null;
    dto.usdAnchorCents = plan.usdAnchorCents;
    dto.isPurchasable = plan.isPurchasable;
    dto.isActive = plan.isActive;
    dto.eventCredits = plan.eventCredits;
    dto.validityDays = plan.validityDays;
    dto.commissionBps = plan.commissionBps;
    dto.aiMinutesMonthly = plan.aiMinutesMonthly;
    dto.generationCredits = plan.generationCredits;
    dto.generationWindow = plan.generationWindow;
    dto.staffSeats = plan.staffSeats;
    dto.maxParticipantsPerEvent = plan.maxParticipantsPerEvent;
    dto.taskBoardEnabled = plan.taskBoardEnabled;
    dto.statsTier = plan.statsTier;
    dto.qrMode = plan.qrMode;
    dto.sortOrder = plan.sortOrder;
    return dto;
  }
}

export class AddonSkuDto {
  @ApiProperty({ description: 'Стабильный код SKU (ключ i18n): COIN_AI_100MIN, AD_FEATURED_WEEK, …' })
  code!: string;

  @ApiProperty({ enum: AddonSkuKind })
  kind!: AddonSkuKind;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Цена (для AD_PRODUCT — базовая/floor) в тийинах строкой; null — не установлена',
  })
  priceAmountMinor!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  usdAnchorCents!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ enum: CoinMetric, nullable: true })
  coinMetric!: CoinMetric | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  coinQuantity!: number | null;

  @ApiPropertyOptional({ enum: AdBillingUnit, nullable: true })
  adBillingUnit!: AdBillingUnit | null;

  @ApiProperty()
  sortOrder!: number;

  static fromModel(sku: AddonSku): AddonSkuDto {
    const dto = new AddonSkuDto();
    dto.code = sku.code;
    dto.kind = sku.kind;
    dto.priceAmountMinor = sku.priceAmountMinor?.toString(10) ?? null;
    dto.usdAnchorCents = sku.usdAnchorCents;
    dto.isActive = sku.isActive;
    dto.coinMetric = sku.coinMetric;
    dto.coinQuantity = sku.coinQuantity;
    dto.adBillingUnit = sku.adBillingUnit;
    dto.sortOrder = sku.sortOrder;
    return dto;
  }
}

export class BillingCatalogDto {
  @ApiProperty({ type: [PlanDto] })
  plans!: PlanDto[];

  @ApiProperty({ type: [AddonSkuDto] })
  addons!: AddonSkuDto[];
}
