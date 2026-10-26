import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Currency, Order, OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import { TicketingService } from './ticketing.service';
import { ViaPaymentsService } from '../payments/via-payments.service';

/** Заказ билета глазами покупателя (комиссия платформы НЕ раскрывается). */
export class BuyerTicketOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: String, description: 'Сумма в тийинах строкой (D-3)' })
  amountMinor!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time', description: 'Бронь места до' })
  holdExpiresAt!: string | null;

  @ApiProperty({
    description:
      'Доступна ли онлайн-оплата через VIA для организации события (тумблеры провайдера)',
  })
  viaAvailable!: boolean;

  static fromModel(order: Order, viaAvailable: boolean): BuyerTicketOrderDto {
    const dto = new BuyerTicketOrderDto();
    dto.id = order.id;
    dto.status = order.status;
    dto.amountMinor = order.amountMinor.toString(10);
    dto.currency = order.currency;
    dto.holdExpiresAt = order.holdExpiresAt?.toISOString() ?? null;
    dto.viaAvailable = viaAvailable;
    return dto;
  }
}

/**
 * Чекаут билета (M-4): участник оформляет заказ на СВОЮ PENDING-регистрацию
 * платного события. Оплата: живые провайдеры — внешний гейт (M-5/M-16);
 * до них заказ подтверждает оператор (MANUAL-путь S-4/M-5).
 */
@ApiTags('registrations')
@Controller('registrations/:registrationId/ticket-order')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketCheckoutController {
  constructor(
    private readonly ticketingService: TicketingService,
    private readonly viaPayments: ViaPaymentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Оформить заказ на билет (платное событие)',
    description:
      'Создаёт TICKET_SALE-заказ с бронью места на 15 минут; повторный вызов при ' +
      'живой броне идемпотентно возвращает тот же заказ; оплаченный билет — 409.',
  })
  @ApiOkResponse({ type: BuyerTicketOrderDto })
  async checkout(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<BuyerTicketOrderDto> {
    const order = await this.ticketingService.checkout(registrationId, user);
    const viaAvailable = await this.viaPayments.isAvailableForOrg(
      order.organizationId,
    );
    return BuyerTicketOrderDto.fromModel(order, viaAvailable);
  }
}
