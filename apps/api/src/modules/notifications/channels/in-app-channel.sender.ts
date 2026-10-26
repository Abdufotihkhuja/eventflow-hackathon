import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DELIVERY_STATUS,
  DeliveryPayloadSnapshot,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from '../dispatch/notification.types';
import type { ChannelSender, DeliveryRowForSend } from './channel-sender';

/** Аргументы записи организаторской ленты (бывший NotificationsService.emit). */
export interface OrgFeedNotificationInput {
  organizationId: string;
  type: NotificationType;
  memberId?: string | null;
  entityType?: string;
  entityId?: string;
  payload?: Prisma.InputJsonValue;
}

/**
 * In-app канал: организаторская лента (Notification) и участнический инбокс
 * (AccountNotification). Исполняется синхронно после commit — очередь не
 * нужна, запись в БД и есть доставка.
 *
 * Сквозь этот sender идёт и legacy-путь NotificationsService.emit — единая
 * точка записи ленты сохраняет текущее поведение (инвариант №2).
 */
@Injectable()
export class InAppChannelSender implements ChannelSender {
  readonly channel: NotificationChannel = NOTIFICATION_CHANNELS.IN_APP;
  private readonly logger = new Logger(InAppChannelSender.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Запись организаторской ленты — бросает наружу; emit() сам решает, глотать ли. */
  async createOrgNotification(input: OrgFeedNotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        memberId: input.memberId ?? null,
        type: input.type,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        payload: input.payload ?? Prisma.JsonNull,
      },
    });
  }

  async dispatchDelivery(delivery: DeliveryRowForSend): Promise<void> {
    const payload = (delivery.payload ?? {}) as DeliveryPayloadSnapshot;
    try {
      if (delivery.organizationId) {
        const organization = await this.prisma.organization.findFirst({
          where: {
            id: delivery.organizationId,
            deletedAt: null,
            suspendedAt: null,
          },
          select: { id: true },
        });
        if (!organization) {
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: DELIVERY_STATUS.SKIPPED,
              error: 'organization_unavailable',
            },
          });
          return;
        }
      }
      if (payload.orgInApp) {
        await this.createOrgNotification({
          organizationId: payload.orgInApp.organizationId,
          type: payload.orgInApp.type as NotificationType,
          memberId: payload.orgInApp.memberId ?? null,
          entityType: payload.orgInApp.entityType,
          entityId: payload.orgInApp.entityId,
          payload: payload.orgInApp.payload as
            | Prisma.InputJsonValue
            | undefined,
        });
      } else if (payload.inApp && delivery.accountId) {
        await this.prisma.accountNotification.create({
          data: {
            accountId: delivery.accountId,
            type: payload.inApp.type,
            entityType: payload.inApp.entityType ?? null,
            entityId: payload.inApp.entityId ?? null,
            payload:
              (payload.inApp.payload as Prisma.InputJsonValue | undefined) ??
              Prisma.JsonNull,
          },
        });
      } else {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DELIVERY_STATUS.SKIPPED,
            error: 'in_app_target_missing',
          },
        });
        return;
      }

      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: DELIVERY_STATUS.SENT, sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `In-app доставка ${delivery.id} (${delivery.catalogId}) не записана`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.prisma.notificationDelivery
        .update({
          where: { id: delivery.id },
          data: {
            status: DELIVERY_STATUS.FAILED,
            error:
              error instanceof Error ? error.message.slice(0, 500) : 'unknown',
          },
        })
        .catch(() => undefined);
    }
  }
}
