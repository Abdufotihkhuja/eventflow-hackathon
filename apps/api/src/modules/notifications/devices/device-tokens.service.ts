import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RegisterDeviceDto } from './dto/register-device.dto';

/** Причины деактивации DeviceToken (DATA_MODEL_DELTA §1). */
export const DISABLED_REASON_LOGOUT = 'logout';
/** D-09/BL-08: строка вытеснена регистрацией того же устройства другим аккаунтом. */
export const DISABLED_REASON_SUPERSEDED = 'superseded';

/**
 * Жизненный цикл push-токенов устройств (BL-08, CONTRACT_DIFF §1).
 *
 * PUT-upsert по (accountId, installationId) — идемпотентен, покрывает ротацию
 * Expo-токена, смену локали и повторный login (реактивация строки).
 *
 * Гигиена общего устройства (D-09): logout мог не дойти до сервера (offline),
 * а receipts валидный токен не погасят — приложение живо, в него вошёл другой
 * пользователь. Поэтому upsert деактивирует активные строки ДРУГИХ аккаунтов
 * с тем же expoPushToken ИЛИ installationId (status superseded) — пуши
 * аккаунта A не приходят на устройство пользователя B.
 */
@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertDevice(
    accountId: string,
    installationId: string,
    dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const superseded = await tx.deviceToken.updateMany({
        where: {
          disabledAt: null,
          accountId: { not: accountId },
          OR: [
            { expoPushToken: dto.expoPushToken },
            { installationId },
          ],
        },
        data: {
          disabledAt: new Date(),
          disabledReason: DISABLED_REASON_SUPERSEDED,
        },
      });
      if (superseded.count > 0) {
        this.logger.log(
          JSON.stringify({
            type: 'device_token.superseded',
            accountId,
            installationId,
            count: superseded.count,
          }),
        );
      }

      await tx.deviceToken.upsert({
        where: {
          accountId_installationId: { accountId, installationId },
        },
        create: {
          accountId,
          installationId,
          expoPushToken: dto.expoPushToken,
          platform: dto.platform,
          locale: dto.locale,
          appVersion: dto.appVersion ?? null,
          osVersion: dto.osVersion ?? null,
        },
        update: {
          expoPushToken: dto.expoPushToken,
          platform: dto.platform,
          locale: dto.locale,
          appVersion: dto.appVersion ?? null,
          osVersion: dto.osVersion ?? null,
          lastSeenAt: new Date(),
          // Повторный login на том же устройстве реактивирует строку.
          disabledAt: null,
          disabledReason: null,
        },
      });

      // BL-37: локаль устройства — свежайший сигнал языка пользователя.
      // Синхронизируем в Account.locale (язык писем); updateMany с NOT —
      // идемпотентный noop, когда локаль не менялась.
      await tx.account.updateMany({
        where: { id: accountId, NOT: { locale: dto.locale } },
        data: { locale: dto.locale },
      });
    });
  }

  /** Отвязка при logout (зовётся ДО чистки сессии). Идемпотентно: нет строки → noop. */
  async removeDevice(accountId: string, installationId: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { accountId, installationId, disabledAt: null },
      data: {
        disabledAt: new Date(),
        disabledReason: DISABLED_REASON_LOGOUT,
      },
    });
  }
}
