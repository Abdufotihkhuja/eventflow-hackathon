import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentTxStatus,
  Prisma,
  RevenueChannel,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TicketingService } from '../ticketing/ticketing.service';
import { PaymeAdapter } from './payme.adapter';

/**
 * Обработка платёжных колбэков (M-5): адаптер разбирает протокол, ядро
 * идемпотентно фиксирует транзакцию (unique provider+txnId) и подтверждает
 * заказ. Логи — БЕЗ PII: только orderId/txnId/статус (инвариант №7).
 */
@Injectable()
export class PaymentWebhooksService {
  private readonly logger = new Logger(PaymentWebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymeAdapter: PaymeAdapter,
    private readonly ticketingService: TicketingService,
  ) {}

  async handlePayme(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<'NOT_CONFIGURED' | { result: { success: true } }> {
    if (!this.paymeAdapter.isConfigured()) return 'NOT_CONFIGURED';

    const verdict = this.paymeAdapter.parseWebhook(headers, body);
    if (!verdict.providerTxnId || !verdict.orderId) {
      // Протокольные вызовы без транзакции (Check*) — отвечаем успехом протокола.
      return { result: { success: true } };
    }

    // Идемпотентная фиксация: повторный колбэк с тем же txnId — no-op.
    try {
      await this.prisma.paymentTransaction.create({
        data: {
          orderId: verdict.orderId,
          provider: PaymentProvider.PAYME,
          providerTxnId: verdict.providerTxnId,
          status: verdict.confirmed
            ? PaymentTxStatus.CONFIRMED
            : PaymentTxStatus.CREATED,
          amountMinor: verdict.amountMinor ?? 0n,
          payloadScrubbed: verdict.scrubbed,
          confirmedAt: verdict.confirmed ? new Date() : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Payme: повторный колбэк txn=${verdict.providerTxnId} — идемпотентный no-op`,
        );
      } else {
        throw error;
      }
    }

    if (verdict.confirmed) {
      const order = await this.ticketingService.confirmTicketPaid(
        verdict.orderId,
        RevenueChannel.PAYME,
      );
      this.logger.log(
        `Payme: заказ ${verdict.orderId} ${order ? 'подтверждён' : 'уже был подтверждён'} (txn=${verdict.providerTxnId})`,
      );
    }

    return { result: { success: true } };
  }
}
