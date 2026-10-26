import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from '../dispatch/notification.types';
import { PushSendService } from '../push/push-send.service';
import type { ChannelSender, DeliveryRowForSend } from './channel-sender';

/**
 * Push-канал (BL-14): реализация ChannelSender, регистрируемая в реестре
 * диспатчера вместо заглушки Батча 2. Вся механика (постановка push.send,
 * деградация выключенного канала, fallback) — в PushSendService.
 */
@Injectable()
export class PushChannelSender implements ChannelSender {
  readonly channel: NotificationChannel = NOTIFICATION_CHANNELS.PUSH;

  constructor(private readonly pushSendService: PushSendService) {}

  async dispatchDelivery(delivery: DeliveryRowForSend): Promise<void> {
    await this.pushSendService.enqueueDelivery(delivery);
  }
}
