import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Currency,
  Order,
  OrderKind,
  OrderStatus,
  PlanKey,
} from '@prisma/client';

type OrderWithCatalog = Order & {
  plan?: { key: PlanKey } | null;
  addonSku?: { code: string } | null;
};

export class CreateBillingRequestDto {
  @ApiProperty({ enum: OrderKind, description: 'PLAN | COIN_PACK | ADVERTISING (TICKET_SALE — не заявка)' })
  @IsEnum(OrderKind)
  kind!: OrderKind;

  @ApiPropertyOptional({ enum: PlanKey })
  @IsOptional()
  @IsEnum(PlanKey)
  planKey?: PlanKey;

  @ApiPropertyOptional({ description: 'Код SKU для COIN_PACK/ADVERTISING' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  skuCode?: string;
}

export class BillingOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Организация-владелец заказа (для админ-очереди S-2/S-9)' })
  organizationId!: string;

  @ApiProperty({ enum: OrderKind })
  kind!: OrderKind;

  @ApiPropertyOptional({ enum: PlanKey, nullable: true, description: 'Тариф заявки (kind=PLAN)' })
  planKey!: PlanKey | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Код SKU (COIN_PACK/ADVERTISING)' })
  skuCode!: string | null;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: String, description: 'Сумма в минорных единицах строкой (D-3)' })
  amountMinor!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  static fromModel(order: OrderWithCatalog): BillingOrderDto {
    const dto = new BillingOrderDto();
    dto.id = order.id;
    dto.organizationId = order.organizationId;
    dto.kind = order.kind;
    dto.planKey = order.plan?.key ?? null;
    dto.skuCode = order.addonSku?.code ?? null;
    dto.status = order.status;
    dto.amountMinor = order.amountMinor.toString(10);
    dto.currency = order.currency;
    dto.createdAt = order.createdAt.toISOString();
    return dto;
  }
}
