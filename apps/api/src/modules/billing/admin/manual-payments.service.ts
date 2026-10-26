import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  OrderKind,
  PaymentTransaction,
  PaymentTxStatus,
  Prisma,
  RevenueChannel,
  RevenueType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { parseMinorAmount } from '../../../common/money/money';
import { AdminAuditService } from '../../platform/admin-audit/admin-audit.service';
import { RevenueService } from '../revenue/revenue.service';
import { ManualPaymentsRepository } from './manual-payments.repository';
import { CoinLedgerService } from '../coins/coin-ledger.service';
import type { ICurrentUser } from '../../../common/interfaces';

export interface RecordManualPaymentArgs {
  organizationId: string;
  /** Заказ-основание (заявка M-13); опционален для платежей вне заявки. */
  orderId?: string | null;
  /** Сумма в тийинах строкой (D-3). */
  amountMinor: string;
  currency?: Currency;
  /** Внешний референс ОБЯЗАТЕЛЕН (решение D-5): № платёжки/договора. */
  externalRef: string;
  revenueType: Extract<RevenueType, 'PLAN_FEE' | 'COIN_PACK' | 'ADVERTISING'>;
}

/**
 * Ручная запись платежей managed-фазы (S-4, решение D-5): сумма + внешний
 * референс обязательны; исправления ТОЛЬКО реверс-записями (append-only);
 * записывать может любой SUPER_ADMIN (S-14). Дедупликация — уникальность
 * (MANUAL, externalRef) на уровне БД (D-9). Каждый платёж порождает строку
 * выручки (M-15) в той же транзакции; аудит PAYMENT_RECORD / PAYMENT_REVERSAL.
 */
@Injectable()
export class ManualPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsRepository: ManualPaymentsRepository,
    private readonly revenueService: RevenueService,
    private readonly adminAudit: AdminAuditService,
    private readonly coinLedger: CoinLedgerService,
  ) {}

  async recordPayment(
    args: RecordManualPaymentArgs,
    admin: ICurrentUser,
  ): Promise<PaymentTransaction> {
    const amountMinor = parseMinorAmount(args.amountMinor);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Сумма платежа должна быть больше нуля');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Организация не найдена');

    const currency = args.currency ?? Currency.UZS;

    return this.paymentsRepository
      .runInTransaction(async (tx) => {
        let orderId = args.orderId ?? null;
        let paidOrderSkuId: string | null = null;
        let paidOrderQuantity = 1;
        if (orderId) {
          const order = await this.paymentsRepository.findOrgOrder(
            tx,
            args.organizationId,
            orderId,
          );
          if (!order) {
            throw new NotFoundException('Заказ не найден у этой организации');
          }
          paidOrderSkuId = order.addonSkuId;
          paidOrderQuantity = order.quantity;
          await this.paymentsRepository.markOrderPaid(
            tx,
            order.id,
            amountMinor,
            currency,
          );
        } else {
          const standalone =
            await this.paymentsRepository.createPaidStandaloneOrder(tx, {
              organizationId: args.organizationId,
              kind: this.orderKindFor(args.revenueType),
              amountMinor,
              currency,
            });
          orderId = standalone.id;
        }

        // M-10: оплата пакета монет НАЧИСЛЯЕТ монеты атомарно с платежом.
        if (args.revenueType === 'COIN_PACK') {
          if (!paidOrderSkuId) {
            throw new BadRequestException(
              'Для COIN_PACK-платежа укажите заказ-заявку с пакетом монет (SKU)',
            );
          }
          const sku = await this.paymentsRepository.findAddonSku(
            tx,
            paidOrderSkuId,
          );
          if (!sku?.coinMetric || !sku.coinQuantity) {
            throw new BadRequestException('SKU заказа не является пакетом монет');
          }
          await this.coinLedger.creditInTx(tx, {
            organizationId: args.organizationId,
            metric: sku.coinMetric,
            quantity: sku.coinQuantity * paidOrderQuantity,
            kind: 'PURCHASE',
            orderId,
          });
        }

        const transaction =
          await this.paymentsRepository.createConfirmedManualTransaction(tx, {
            orderId,
            externalRef: args.externalRef,
            amountMinor,
            currency,
          });

        await this.revenueService.record(
          {
            organizationRef: org.id,
            organizationLabel: org.name,
            type: args.revenueType,
            channel: RevenueChannel.MANUAL,
            amountMinor,
            currency,
            sourceRef: transaction.id,
          },
          tx,
        );

        await this.adminAudit.record(
          {
            action: 'PAYMENT_RECORD',
            actorId: admin.sub,
            actorEmail: admin.email,
            targetType: 'ORDER',
            targetId: transaction.orderId,
            targetLabel: org.name,
            after: {
              amountMinor: amountMinor.toString(10),
              currency,
              externalRef: args.externalRef,
              revenueType: args.revenueType,
            },
          },
          tx,
        );

        return transaction;
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            message: 'Платёж с таким внешним референсом уже записан',
            code: 'PAYMENT_DUPLICATE_REF',
            details: { externalRef: args.externalRef },
          });
        }
        throw error;
      });
  }

  /** Исправление — ТОЛЬКО реверс (D-5): REVERSED-статус + отрицательная строка выручки. */
  async reversePayment(
    transactionId: string,
    reason: string,
    admin: ICurrentUser,
  ): Promise<PaymentTransaction> {
    return this.paymentsRepository.runInTransaction(async (tx) => {
      const transaction = await this.paymentsRepository.findTransactionWithOrg(
        tx,
        transactionId,
      );
      if (!transaction) throw new NotFoundException('Транзакция не найдена');
      if (transaction.status !== PaymentTxStatus.CONFIRMED) {
        throw new BadRequestException(
          'Реверсировать можно только подтверждённую транзакцию',
        );
      }

      const reversed = await this.paymentsRepository.markReversed(
        tx,
        transaction.id,
      );

      await this.revenueService.record(
        {
          organizationRef: transaction.order.organizationId,
          type: RevenueType.REFUND,
          channel: RevenueChannel.MANUAL,
          amountMinor: -transaction.amountMinor,
          currency: transaction.currency,
          sourceRef: transaction.id,
        },
        tx,
      );

      await this.adminAudit.record(
        {
          action: 'PAYMENT_REVERSAL',
          actorId: admin.sub,
          actorEmail: admin.email,
          targetType: 'ORDER',
          targetId: transaction.orderId,
          reason,
          before: { status: PaymentTxStatus.CONFIRMED },
          after: {
            status: PaymentTxStatus.REVERSED,
            amountMinor: transaction.amountMinor.toString(10),
          },
        },
        tx,
      );

      return reversed;
    });
  }

  private orderKindFor(
    revenueType: RecordManualPaymentArgs['revenueType'],
  ): OrderKind {
    if (revenueType === 'PLAN_FEE') return OrderKind.PLAN;
    if (revenueType === 'COIN_PACK') return OrderKind.COIN_PACK;
    return OrderKind.ADVERTISING;
  }
}
