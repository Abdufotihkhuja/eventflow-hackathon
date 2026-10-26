import { Injectable, Logger } from '@nestjs/common';
import { MailDispatchService } from '../../mail/application/mail-dispatch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DELIVERY_STATUS,
  DeliveryPayloadSnapshot,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from '../dispatch/notification.types';
import {
  ChannelSender,
  DeliveryRowForSend,
  REAPER_REQUEUED_MARKER,
} from './channel-sender';

/**
 * Email-канал: мост к существующему MailService/MailDispatchService через
 * журнал NotificationDelivery (BL-06). Строка Delivery создаётся ДО постановки
 * job; mail-job несёт deliveryId; по успеху SMTP mail-dispatch фиксирует
 * providerRef (messageId) и лишь затем переводит строку в sent.
 */
@Injectable()
export class EmailChannelSender implements ChannelSender {
  readonly channel: NotificationChannel = NOTIFICATION_CHANNELS.EMAIL;
  private readonly logger = new Logger(EmailChannelSender.name);

  constructor(
    private readonly mailDispatch: MailDispatchService,
    private readonly prisma: PrismaService,
  ) {}

  async dispatchDelivery(delivery: DeliveryRowForSend): Promise<void> {
    const payload = (delivery.payload ?? {}) as DeliveryPayloadSnapshot;
    if (!payload.mail || !payload.to) {
      await this.prisma.notificationDelivery
        .update({
          where: { id: delivery.id },
          data: {
            status: DELIVERY_STATUS.FAILED,
            error: 'email_content_missing',
          },
        })
        .catch(() => undefined);
      return;
    }

    // Reaper-повтор получает другой ключ: BullMQ иначе молча проглотит job с
    // тем же id (запись о первом, потерянном, job может ещё жить в очереди).
    const attemptSuffix =
      delivery.error === REAPER_REQUEUED_MARKER ? ':r1' : '';

    await this.mailDispatch.enqueueTemplateMail({
      to: payload.to,
      subject: payload.mail.subject,
      template: payload.mail.template,
      context: payload.mail.context,
      entityId: delivery.id,
      idempotencyKey: `notif:${delivery.id}${attemptSuffix}`,
      deliveryId: delivery.id,
    });
    this.logger.log(
      JSON.stringify({
        type: 'notification.email_enqueued',
        deliveryId: delivery.id,
        catalogId: delivery.catalogId,
      }),
    );
  }
}
