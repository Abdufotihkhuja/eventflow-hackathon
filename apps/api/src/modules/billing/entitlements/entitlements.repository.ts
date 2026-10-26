import { Injectable } from '@nestjs/common';
import { EntitlementKey, EntitlementOverride } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Доступ к per-org оверрайдам и флагу приостановки (E-1). */
@Injectable()
export class EntitlementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Живые оверрайды организации (истёкшие по expiresAt отфильтровываются лениво). */
  async findActiveOverrides(
    organizationId: string,
    now: Date,
  ): Promise<EntitlementOverride[]> {
    return this.prisma.entitlementOverride.findMany({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /** VIA: число организаций в пилоте (активный оверрайд VIA_PAYMENTS=true). */
  countActiveViaPilotOrgs(now: Date): Promise<number> {
    return this.prisma.entitlementOverride.count({
      where: {
        key: EntitlementKey.VIA_PAYMENTS,
        valueBool: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * E-15: при ПЕРВОМ включении S-19 ставит 90-дневное окно (B-3) всем
   * системным GRANDFATHER-грантам D-14, у которых окно ещё не проставлено.
   * Идемпотентно: повторное включение ничего не перезаписывает.
   */
  async stampGrandfatherExpiry(expiresAt: Date): Promise<number> {
    const result = await this.prisma.entitlementOverride.updateMany({
      where: {
        reason: { startsWith: 'GRANDFATHER' },
        createdByAdminId: null,
        expiresAt: null,
      },
      data: { expiresAt },
    });
    return result.count;
  }

  /** S-5/S-6: одна активная строка на (org, key) — upsert; история в аудите. */
  async upsertOverride(args: {
    organizationId: string;
    key: EntitlementKey;
    valueInt: number | null;
    valueBool: boolean | null;
    valueString: string | null;
    reason: string;
    createdByAdminId: string;
    expiresAt: Date | null;
  }): Promise<{ before: EntitlementOverride | null; after: EntitlementOverride }> {
    const before = await this.prisma.entitlementOverride.findUnique({
      where: {
        organizationId_key: {
          organizationId: args.organizationId,
          key: args.key,
        },
      },
    });
    const after = await this.prisma.entitlementOverride.upsert({
      where: {
        organizationId_key: {
          organizationId: args.organizationId,
          key: args.key,
        },
      },
      update: {
        valueInt: args.valueInt,
        valueBool: args.valueBool,
        valueString: args.valueString,
        reason: args.reason,
        createdByAdminId: args.createdByAdminId,
        expiresAt: args.expiresAt,
      },
      create: {
        organizationId: args.organizationId,
        key: args.key,
        valueInt: args.valueInt,
        valueBool: args.valueBool,
        valueString: args.valueString,
        reason: args.reason,
        createdByAdminId: args.createdByAdminId,
        expiresAt: args.expiresAt,
      },
    });
    return { before, after };
  }

  /** S-5/S-6: снятие оверрайда (строка удаляется; история — в аудите). */
  async removeOverride(
    organizationId: string,
    key: EntitlementKey,
  ): Promise<EntitlementOverride | null> {
    const existing = await this.prisma.entitlementOverride.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    if (!existing) return null;
    await this.prisma.entitlementOverride.delete({
      where: { organizationId_key: { organizationId, key } },
    });
    return existing;
  }

  /** Флаг приостановки организации (D-17). */
  async isSuspended(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { suspendedAt: true },
    });
    return org?.suspendedAt != null;
  }
}
