import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import {
  CoinMetric,
  Currency,
  EntitlementKey,
  PaymentProvider,
  PaymentTransaction,
  PaymentTxStatus,
  PlanKey,
} from '@prisma/client';
import { BillingStatusDto } from '../dto/billing-status.dto';
import { EntitlementsDto } from '../dto/entitlements.dto';
import { BillingOrderDto } from '../dto/billing-request.dto';
import { IsMinorAmountString } from '../../../common/validators/minor-amount.validator';

export class ActivatePlanDto {
  @ApiProperty({ enum: PlanKey })
  @IsEnum(PlanKey)
  planKey!: PlanKey;

  @ApiPropertyOptional({
    enum: ['RESET', 'CARRY_OVER'],
    description:
      'ОБЯЗАТЕЛЕН при смене тарифа с живым пакетом (§2.4): RESET — остаток сгорает; CARRY_OVER — переносится 1:1',
  })
  @IsOptional()
  @IsIn(['RESET', 'CARRY_OVER'])
  creditMode?: 'RESET' | 'CARRY_OVER';

  @ApiPropertyOptional({ description: 'Заказ-основание (заявка M-13 или ручная продажа)' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class SetEnforcementDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class AdminOverrideDto {
  @ApiProperty({ enum: EntitlementKey })
  key!: EntitlementKey;

  @ApiPropertyOptional({ type: Number, nullable: true })
  valueInt!: number | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  valueBool!: boolean | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  valueString!: string | null;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  expiresAt!: string | null;
}

export class AdminOrgBillingDto {
  @ApiProperty({ type: BillingStatusDto })
  status!: BillingStatusDto;

  @ApiProperty({ type: EntitlementsDto })
  entitlements!: EntitlementsDto;

  @ApiProperty({ type: [AdminOverrideDto] })
  overrides!: AdminOverrideDto[];

  @ApiProperty({ type: [BillingOrderDto] })
  orders!: BillingOrderDto[];
}

export class ExtendPlanDto {
  @ApiProperty({ minimum: 1, maximum: 365, description: 'На сколько дней продлить период' })
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ExpirePlanDto {
  @ApiProperty({ description: 'Причина обязательна (политика mandatory-reason)' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class AdjustCreditsDto {
  @ApiProperty({ description: 'Дельта кредитов (±), не 0' })
  @IsInt()
  @NotEquals(0)
  @Min(-1000)
  @Max(1000)
  delta!: number;

  @ApiProperty({ description: 'Причина обязательна' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class RecordPaymentDto {
  @ApiPropertyOptional({ description: 'Заказ-основание (заявка M-13)' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ type: String, description: 'Сумма в тийинах строкой (D-3)' })
  @IsMinorAmountString()
  amountMinor!: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({ description: 'Внешний референс платежа — ОБЯЗАТЕЛЕН (D-5)' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  externalRef!: string;

  @ApiProperty({ enum: ['PLAN_FEE', 'COIN_PACK', 'ADVERTISING'] })
  @IsIn(['PLAN_FEE', 'COIN_PACK', 'ADVERTISING'])
  revenueType!: 'PLAN_FEE' | 'COIN_PACK' | 'ADVERTISING';
}

export class ReversePaymentDto {
  @ApiProperty({ description: 'Причина обязательна (D-5: исправления только реверсом)' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class PaymentTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty()
  providerTxnId!: string;

  @ApiProperty({ enum: PaymentTxStatus })
  status!: PaymentTxStatus;

  @ApiProperty({ type: String })
  amountMinor!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  static fromModel(t: PaymentTransaction): PaymentTransactionDto {
    const dto = new PaymentTransactionDto();
    dto.id = t.id;
    dto.orderId = t.orderId;
    dto.provider = t.provider;
    dto.providerTxnId = t.providerTxnId;
    dto.status = t.status;
    dto.amountMinor = t.amountMinor.toString(10);
    dto.currency = t.currency;
    dto.createdAt = t.createdAt.toISOString();
    return dto;
  }
}

export class ConfirmTicketOrderDto {
  @ApiProperty({ description: 'Внешний референс оплаты — ОБЯЗАТЕЛЕН (D-5)' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  externalRef!: string;
}

export class RecordPayoutDto {
  @ApiProperty({ type: String, description: 'Сумма выплаты в тийинах строкой (D-3)' })
  @IsMinorAmountString()
  amountMinor!: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({ description: 'Референс банковской платёжки — обязателен' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  externalRef!: string;
}

export class PayoutOwedRowDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ type: String })
  grossMinor!: string;

  @ApiProperty({ type: String })
  commissionMinor!: string;

  @ApiProperty({ type: String })
  paidOutMinor!: string;

  @ApiProperty({ type: String, description: 'К выплате (может быть отрицательным при переплате)' })
  owedMinor!: string;
}

export class SetOverrideDto {
  @ApiProperty({ enum: EntitlementKey })
  @IsEnum(EntitlementKey)
  key!: EntitlementKey;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  valueInt?: number;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  @IsOptional()
  @IsBoolean()
  valueBool?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  valueString?: string;

  @ApiProperty({ description: 'Причина ОБЯЗАТЕЛЬНА (OQ-7/B-2)' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class RevokeOverrideDto {
  @ApiProperty({ description: 'Причина ОБЯЗАТЕЛЬНА' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CompGrantDto {
  @ApiProperty({ enum: CoinMetric, description: 'AI_SECONDS (секунды!) или GENERATION_UNITS' })
  @IsEnum(CoinMetric)
  metric!: CoinMetric;

  @ApiProperty({ minimum: 1, maximum: 1000000 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @ApiProperty({ description: 'Причина ОБЯЗАТЕЛЬНА' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class SuspendOrgDto {
  @ApiProperty({ description: 'Причина ОБЯЗАТЕЛЬНА (политика D-1 группы D)' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UpdatePlanPriceDto {
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Цена в тийинах строкой; null — снять цену' })
  @IsOptional()
  @IsMinorAmountString()
  priceAmountMinor?: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  usdAnchorCents?: number;

  @ApiPropertyOptional({ description: 'Видимость в каталоге' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Продаваемость' })
  @IsOptional()
  @IsBoolean()
  isPurchasable?: boolean;
}

export class FulfillFeaturedDto {
  @ApiProperty({ description: 'Продвигаемое событие организации' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({ minimum: 1, maximum: 52 })
  @IsInt()
  @Min(1)
  @Max(52)
  weeks!: number;

  @ApiPropertyOptional({ description: 'Оплаченный ADVERTISING-заказ (заявка M-13)' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: '$0 comp-размещение (goodwill/грандфазер)' })
  @IsOptional()
  @IsBoolean()
  isComp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
