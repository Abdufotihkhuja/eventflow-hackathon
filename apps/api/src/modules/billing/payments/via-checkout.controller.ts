import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { ICurrentUser } from '../../../common/interfaces';
import {
  ViaPaymentsService,
  type ViaPaymentConfirmation,
  type ViaPaymentStart,
} from './via-payments.service';

export class StartViaPaymentDto {
  @ApiPropertyOptional({
    enum: ['en', 'ru', 'uz'],
    description: 'Локаль страницы возврата покупателя',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'ru', 'uz'])
  locale?: string;
}

export class ViaPaymentStartDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty({ description: 'Идентификатор инвойса VIA' })
  invoiceId!: string;

  @ApiProperty({ description: 'Hosted-страница оплаты VIA для редиректа' })
  paymentUrl!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  holdExpiresAt!: string | null;

  static fromResult(result: ViaPaymentStart): ViaPaymentStartDto {
    const dto = new ViaPaymentStartDto();
    dto.orderId = result.orderId;
    dto.invoiceId = result.invoiceId;
    dto.paymentUrl = result.paymentUrl;
    dto.holdExpiresAt = result.holdExpiresAt;
    return dto;
  }
}

export class ViaPaymentConfirmationDto {
  @ApiProperty()
  orderId!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  eventId!: string | null;

  @ApiProperty({ enum: OrderStatus })
  orderStatus!: OrderStatus;

  @ApiProperty({
    enum: ['DRAFT', 'OPEN', 'PAID', 'EXPIRED', 'CANCEL', 'UNKNOWN'],
    description: 'Статус инвойса по данным VIA (серверная проверка)',
  })
  invoiceStatus!: string;

  @ApiProperty()
  paid!: boolean;

  static fromResult(result: ViaPaymentConfirmation): ViaPaymentConfirmationDto {
    const dto = new ViaPaymentConfirmationDto();
    dto.orderId = result.orderId;
    dto.eventId = result.eventId;
    dto.orderStatus = result.orderStatus;
    dto.invoiceStatus = result.invoiceStatus;
    dto.paid = result.paid;
    return dto;
  }
}

/**
 * Онлайн-оплата билета через VIA (M-5). Покупательская поверхность поверх
 * идемпотентного чекаута M-4: старт возвращает hosted-ссылку VIA, а факт
 * оплаты подтверждается ТОЛЬКО серверным опросом статуса инвойса —
 * браузерный возврат покупателя доказательством не является.
 */
@ApiTags('registrations')
@Controller('registrations/:registrationId/ticket-order/via')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ViaCheckoutController {
  constructor(private readonly viaPayments: ViaPaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Начать оплату билета через VIA',
    description:
      'Создаёт (или идемпотентно переиспользует) VIA-инвойс для живого ' +
      'PENDING_PAYMENT-заказа и возвращает платёжную ссылку. 403 VIA_UNAVAILABLE — ' +
      'провайдер выключен для организации события; 409 TICKET_ALREADY_PAID — билет оплачен.',
  })
  @ApiOkResponse({ type: ViaPaymentStartDto })
  async start(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() dto: StartViaPaymentDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ViaPaymentStartDto> {
    const result = await this.viaPayments.startPayment(
      registrationId,
      user,
      dto.locale,
    );
    return ViaPaymentStartDto.fromResult(result);
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Проверить и подтвердить оплату VIA (серверная сверка)',
    description:
      'Опрашивает статус инвойса у VIA; при PAID и полном совпадении суммы/заказа ' +
      'идемпотентно подтверждает заказ и регистрацию.',
  })
  @ApiOkResponse({ type: ViaPaymentConfirmationDto })
  async confirm(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: ICurrentUser,
  ): Promise<ViaPaymentConfirmationDto> {
    const result = await this.viaPayments.confirmPayment(registrationId, user);
    return ViaPaymentConfirmationDto.fromResult(result);
  }
}
