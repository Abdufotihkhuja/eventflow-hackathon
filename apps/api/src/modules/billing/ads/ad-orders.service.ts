import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdOrder } from '@prisma/client';
import { AdminAuditService } from '../../platform/admin-audit/admin-audit.service';
import { AdOrdersRepository } from './ad-orders.repository';
import type { ICurrentUser } from '../../../common/interfaces';

/**
 * Рекламные размещения (M-11/S-11): фулфилмент featured-плейсмента поверх
 * существующего публичного механизма Event.isFeatured. Оператор фулфиллит
 * оплаченный ADVERTISING-заказ (или выдаёт $0 comp — решение D-3/D-2 группы D);
 * снятие по истечении — свип E-11b (S-11-auto). Email-кампании исполняются
 * существующей рассылкой по участникам (mail.controller) — здесь только след
 * размещения. SMS — P2 (провайдера нет).
 */
@Injectable()
export class AdOrdersService {
  private readonly logger = new Logger(AdOrdersService.name);

  constructor(
    private readonly adOrdersRepository: AdOrdersRepository,
    private readonly adminAudit: AdminAuditService,
  ) {}

  /** S-11: фулфилмент featured-размещения (weeks недель) или comp-выдача. */
  async fulfillFeatured(
    organizationId: string,
    dto: {
      eventId: string;
      weeks: number;
      orderId?: string | null;
      isComp?: boolean;
      reason?: string | null;
    },
    admin: ICurrentUser,
  ): Promise<AdOrder> {
    if (!Number.isInteger(dto.weeks) || dto.weeks < 1 || dto.weeks > 52) {
      throw new BadRequestException('weeks должен быть в диапазоне [1, 52]');
    }
    const event = await this.adOrdersRepository.findOrgEvent(
      organizationId,
      dto.eventId,
    );
    if (!event) {
      throw new NotFoundException('Событие не найдено у этой организации');
    }

    const now = new Date();
    const placementEnd = new Date(
      now.getTime() + dto.weeks * 7 * 24 * 60 * 60 * 1000,
    );

    return this.adOrdersRepository.runInTransaction(async (tx) => {
      const adOrder = await this.adOrdersRepository.create(tx, {
        organizationId,
        orderId: dto.orderId ?? null,
        eventId: dto.eventId,
        skuCode: 'AD_FEATURED_WEEK',
        isComp: dto.isComp ?? false,
        placementStart: now,
        placementEnd,
      });
      await this.adOrdersRepository.setEventFeatured(tx, dto.eventId, true);
      await this.adminAudit.record(
        {
          action: 'AD_ORDER_STATUS',
          actorId: admin.sub,
          actorEmail: admin.email,
          targetType: 'ORDER',
          targetId: adOrder.id,
          targetLabel: event.title,
          reason: dto.reason ?? null,
          after: {
            status: 'ACTIVE',
            skuCode: 'AD_FEATURED_WEEK',
            weeks: dto.weeks,
            isComp: dto.isComp ?? false,
            placementEnd: placementEnd.toISOString(),
          },
        },
        tx,
      );
      return adOrder;
    });
  }

  listAll(): Promise<AdOrder[]> {
    return this.adOrdersRepository.listAll();
  }

  /** S-11-auto (вызывается свипом E-11b): снять истёкшие размещения. */
  async expireDuePlacements(now: Date): Promise<number> {
    const due = await this.adOrdersRepository.findExpiredActive(now);
    let expired = 0;
    for (const adOrder of due) {
      await this.adOrdersRepository.runInTransaction(async (tx) => {
        await this.adOrdersRepository.markExpired(tx, adOrder.id);
        if (adOrder.eventId) {
          const keepFeatured =
            await this.adOrdersRepository.hasOtherActivePlacement(
              tx,
              adOrder.eventId,
              adOrder.id,
            );
          if (!keepFeatured) {
            await this.adOrdersRepository.setEventFeatured(
              tx,
              adOrder.eventId,
              false,
            );
          }
        }
      });
      expired += 1;
    }
    if (expired > 0) {
      this.logger.log(`Снято истёкших featured-размещений: ${expired}`);
    }
    return expired;
  }
}
