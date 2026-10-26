import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, OrderKind, OrderStatus, PlanKey } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { CatalogRepository } from '../catalog/catalog.repository';
import { OrdersRepository } from './orders.repository';

export interface CreateBillingRequestArgs {
  organizationId: string;
  organizationLabel?: string | null;
  kind: OrderKind;
  planKey?: PlanKey;
  skuCode?: string;
}

/**
 * Заявки managed-фазы (M-13-ext, CR-23): организация ПРОСИТ тариф/монеты/
 * рекламу (Order со статусом REQUESTED), оператор фулфиллит в S-2/S-4
 * (активация M-2 + ручная запись платежа). Дубликаты режутся серверно:
 * одна живая заявка данного вида на организацию. Операторы уведомляются
 * через существующую почтовую очередь (решение D-4: support@eventflow.uz,
 * SLA «2 рабочих дня» — копия на стороне кабинета C-5).
 */
@Injectable()
export class BillingRequestsService {
  private readonly logger = new Logger(BillingRequestsService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createRequest(args: CreateBillingRequestArgs): Promise<Order> {
    if (args.kind === OrderKind.TICKET_SALE) {
      throw new BadRequestException(
        'Продажа билетов не оформляется заявкой (M-4 — чекаут)',
      );
    }

    const existing = await this.ordersRepository.findPendingRequest(
      args.organizationId,
      args.kind,
    );
    if (existing) {
      throw new ConflictException({
        message: 'По этому виду уже есть необработанная заявка',
        code: 'BILLING_REQUEST_DUPLICATE',
        details: { existingOrderId: existing.id, kind: args.kind },
      });
    }

    let planId: string | null = null;
    let addonSkuId: string | null = null;
    let amountMinor = 0n;

    if (args.kind === OrderKind.PLAN) {
      if (!args.planKey) {
        throw new BadRequestException('Для заявки на тариф нужен planKey');
      }
      const plan = await this.catalogRepository.findPlanByKey(args.planKey);
      if (!plan) throw new NotFoundException(`Тариф ${args.planKey} не найден`);
      if (plan.key === PlanKey.START) {
        throw new BadRequestException('START — бесплатный тариф по умолчанию');
      }
      planId = plan.id;
      // Цена может быть ещё не установлена владельцем (внешний гейт 4) —
      // заявка допустима, сумма фиксируется оператором при записи платежа (S-4).
      amountMinor = plan.priceAmountMinor ?? 0n;
    } else {
      if (!args.skuCode) {
        throw new BadRequestException('Для заявки на add-on нужен skuCode');
      }
      const skus = await this.catalogRepository.findAddonSkus();
      const sku = skus.find((s) => s.code === args.skuCode);
      if (!sku) throw new NotFoundException(`SKU ${args.skuCode} не найден`);
      const expectedKind =
        args.kind === OrderKind.COIN_PACK ? 'COIN_PACK' : 'AD_PRODUCT';
      if (sku.kind !== expectedKind) {
        throw new BadRequestException(
          `SKU ${args.skuCode} не соответствует виду заявки ${args.kind}`,
        );
      }
      addonSkuId = sku.id;
      amountMinor = sku.priceAmountMinor ?? 0n;
    }

    const order = await this.ordersRepository.create({
      organizationId: args.organizationId,
      kind: args.kind,
      status: OrderStatus.REQUESTED,
      planId,
      addonSkuId,
      amountMinor,
    });

    await this.notifyOperators(args, order);
    return order;
  }

  listRequests(organizationId: string): Promise<Order[]> {
    return this.ordersRepository.listByOrganization(organizationId);
  }

  /**
   * Уведомление операторов (решение D-4). Переиспользует contact-request
   * шаблон почтовой очереди; выделенный billing-шаблон — P1-полировка
   * (отмечено в леджере). Ошибка почты заявку не валит.
   */
  private async notifyOperators(
    args: CreateBillingRequestArgs,
    order: Order,
  ): Promise<void> {
    const supportEmail =
      this.configService.get<string>('mail.supportEmail') ??
      'support@eventflow.uz';
    const what =
      args.kind === OrderKind.PLAN
        ? `тариф ${args.planKey ?? ''}`
        : args.kind === OrderKind.COIN_PACK
          ? `пакет монет ${args.skuCode ?? ''}`
          : `рекламу ${args.skuCode ?? ''}`;
    try {
      await this.mailService.sendContactRequestNotification(
        supportEmail,
        args.organizationLabel ?? args.organizationId,
        '—',
        `Биллинг-заявка (${order.id}): организация запрашивает ${what}. SLA — 2 рабочих дня (10-decisions D-4). Обработка: админ-панель → организация → «Тариф и биллинг».`,
      );
    } catch (error) {
      this.logger.error(
        `Не удалось уведомить операторов о заявке ${order.id}: ${String(error)}`,
      );
    }
  }
}
