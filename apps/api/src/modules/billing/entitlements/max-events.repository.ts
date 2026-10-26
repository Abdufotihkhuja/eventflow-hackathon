import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireTenantWhere } from '../../../common/tenant/tenant-scope';

/** Подсчёт живых событий организации для лимита MAX_EVENTS (override-only). */
@Injectable()
export class MaxEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * «Всего созданных» = все живые (не удалённые) события организации любого
   * статуса. Архивация слот НЕ освобождает (решение пользователя).
   */
  countCreatedEvents(organizationId: string): Promise<number> {
    return this.prisma.event.count({
      where: requireTenantWhere(organizationId, { deletedAt: null }),
    });
  }
}
