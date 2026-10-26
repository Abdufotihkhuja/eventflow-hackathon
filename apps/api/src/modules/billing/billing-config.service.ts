import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsRepository } from './entitlements/entitlements.repository';

/** 90-дневное льготное окно грандфазеринга (решение B-3). */
const GRANDFATHER_GRACE_DAYS = 90;

const BILLING_ENFORCEMENT_KEY = 'billing_enforcement';
/** Короткий in-process кэш: горячие пути энфорсмента не должны бить в конфиг на каждый запрос. */
const CACHE_TTL_MS = 10_000;

/**
 * Мастер-переключатель тарифной системы (S-19, требование владельца §2.3).
 *
 * ВЫКЛ (сид по умолчанию) — платформа ведёт себя как до монетизации: E-1
 * отдаёт «безлимит», E-2/квоты пропускают всё, списаний нет. ВКЛ — полный
 * энфорсмент. Это рычаг тёмного запуска и отката всей программы.
 * Запись тумблера — только супер-админ (S-1), аудит BILLING_SWITCH_TOGGLE.
 */
@Injectable()
export class BillingConfigService {
  private cache: { value: boolean; readAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsRepository: EntitlementsRepository,
  ) {}

  async isEnforcementEnabled(): Promise<boolean> {
    const now = Date.now();
    if (this.cache && now - this.cache.readAt < CACHE_TTL_MS) {
      return this.cache.value;
    }
    const row = await this.prisma.platformConfig.findUnique({
      where: { key: BILLING_ENFORCEMENT_KEY },
    });
    const enabled =
      typeof row?.value === 'object' &&
      row.value !== null &&
      (row.value as { enabled?: unknown }).enabled === true;
    this.cache = { value: enabled, readAt: now };
    return enabled;
  }

  /**
   * Момент первого включения энфорсмента — cutover-метка (E-15/B-3):
   * события, созданные ДО неё, навсегда освобождены от тарифного капа
   * участников (E-3); от неё же отсчитано 90-дневное окно грандфазеринга.
   */
  async getEnabledAt(): Promise<Date | null> {
    const row = await this.prisma.platformConfig.findUnique({
      where: { key: BILLING_ENFORCEMENT_KEY },
    });
    const raw =
      typeof row?.value === 'object' && row.value !== null
        ? (row.value as { enabledAt?: unknown }).enabledAt
        : undefined;
    return typeof raw === 'string' ? new Date(raw) : null;
  }

  /**
   * Переключение (S-1): пишет конфиг, при ПЕРВОМ включении фиксирует
   * enabledAt и штампует 90-дневное окно GRANDFATHER-грантам D-14 (E-15).
   * Сбрасывает кэш. Аудит BILLING_SWITCH_TOGGLE — на вызывающем.
   */
  async setEnforcementEnabled(
    enabled: boolean,
    adminId: string,
  ): Promise<{ enabledAt: Date | null; grandfathersStamped: number }> {
    const existingEnabledAt = await this.getEnabledAt();
    const isFirstEnable = enabled && !existingEnabledAt;
    const enabledAt = isFirstEnable ? new Date() : existingEnabledAt;

    await this.prisma.platformConfig.upsert({
      where: { key: BILLING_ENFORCEMENT_KEY },
      update: {
        value: { enabled, enabledAt: enabledAt?.toISOString() ?? null },
        updatedByAdminId: adminId,
      },
      create: {
        key: BILLING_ENFORCEMENT_KEY,
        value: { enabled, enabledAt: enabledAt?.toISOString() ?? null },
        updatedByAdminId: adminId,
      },
    });
    this.cache = null;

    let grandfathersStamped = 0;
    if (isFirstEnable && enabledAt) {
      const graceEnd = new Date(
        enabledAt.getTime() + GRANDFATHER_GRACE_DAYS * 24 * 60 * 60 * 1000,
      );
      grandfathersStamped =
        await this.entitlementsRepository.stampGrandfatherExpiry(graceEnd);
    }
    return { enabledAt, grandfathersStamped };
  }
}
