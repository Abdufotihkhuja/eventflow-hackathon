import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const VIA_PAYMENTS_KEY = 'via_payments';
/** Короткий in-process кэш — доступность провайдера читается на горячем пути чекаута. */
const CACHE_TTL_MS = 10_000;

/**
 * Глобальный тумблер VIA-платежей (паттерн S-19/BillingConfigService):
 * platform_config['via_payments'] = { enabled, enabledAt }.
 *
 * ВЫКЛ (дефолт) — VIA доступен ТОЛЬКО организациям с per-org оверрайдом
 * VIA_PAYMENTS=true (пилот/тест). ВКЛ — доступен всем, кроме организаций
 * с точечным VIA_PAYMENTS=false. Запись — только супер-админ, аудит
 * VIA_SWITCH_TOGGLE — на вызывающем (AdminBillingService).
 */
@Injectable()
export class ViaConfigService {
  private cache: { value: boolean; readAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async isGloballyEnabled(): Promise<boolean> {
    const now = Date.now();
    if (this.cache && now - this.cache.readAt < CACHE_TTL_MS) {
      return this.cache.value;
    }
    const row = await this.prisma.platformConfig.findUnique({
      where: { key: VIA_PAYMENTS_KEY },
    });
    const enabled =
      typeof row?.value === 'object' &&
      row.value !== null &&
      (row.value as { enabled?: unknown }).enabled === true;
    this.cache = { value: enabled, readAt: now };
    return enabled;
  }

  async getEnabledAt(): Promise<Date | null> {
    const row = await this.prisma.platformConfig.findUnique({
      where: { key: VIA_PAYMENTS_KEY },
    });
    const raw =
      typeof row?.value === 'object' && row.value !== null
        ? (row.value as { enabledAt?: unknown }).enabledAt
        : undefined;
    return typeof raw === 'string' ? new Date(raw) : null;
  }

  /** Переключение глобального тумблера; enabledAt фиксируется при первом включении. */
  async setGloballyEnabled(
    enabled: boolean,
    adminId: string,
  ): Promise<{ enabledAt: Date | null }> {
    const existingEnabledAt = await this.getEnabledAt();
    const enabledAt =
      enabled && !existingEnabledAt ? new Date() : existingEnabledAt;

    await this.prisma.platformConfig.upsert({
      where: { key: VIA_PAYMENTS_KEY },
      update: {
        value: { enabled, enabledAt: enabledAt?.toISOString() ?? null },
        updatedByAdminId: adminId,
      },
      create: {
        key: VIA_PAYMENTS_KEY,
        value: { enabled, enabledAt: enabledAt?.toISOString() ?? null },
        updatedByAdminId: adminId,
      },
    });
    this.cache = null;
    return { enabledAt };
  }
}
