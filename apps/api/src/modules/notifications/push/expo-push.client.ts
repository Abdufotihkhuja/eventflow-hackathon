import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushReceipt,
  type ExpoPushTicket,
} from 'expo-server-sdk';

/**
 * Обёртка над Expo Push Service (BL-14, транспорт по OQ-13). Единственное
 * место инстанцирования `Expo` — инвариант №2 (ESLint + ratchet
 * check-notification-dispatch.mjs запрещают expo-server-sdk вне
 * modules/notifications).
 *
 * Канал выключен (EXPO_PUSH_ENABLED != 'true', BL-12 ещё не выполнен) —
 * мягкая деградация: `enabled=false`, warning один раз на старте; send-методы
 * в этом состоянии не вызываются (сендер переводит доставку в failed:
 * push_channel_disabled и запускает email-fallback).
 */
@Injectable()
export class ExpoPushClient implements OnModuleInit {
  private readonly logger = new Logger(ExpoPushClient.name);
  private readonly expo: Expo;
  readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.enabled = configService.get<boolean>('push.enabled') === true;
    this.expo = new Expo({
      accessToken: configService.get<string>('push.accessToken'),
    });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.warn(
        'Push-канал выключен (EXPO_PUSH_ENABLED != true): push-доставки будут ' +
          'помечаться failed: push_channel_disabled с email-fallback per-account. ' +
          'Включение — после загрузки FCM/APNs-кредов в Expo-проект (BL-12).',
      );
    }
  }

  isExpoPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /** Чанкование ≤100 сообщений на запрос (BL-02) — лимит Expo Push API. */
  chunkMessages(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
    return this.expo.chunkPushNotifications(messages);
  }

  sendChunk(chunk: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    return this.expo.sendPushNotificationsAsync(chunk);
  }

  chunkReceiptIds(receiptIds: string[]): string[][] {
    return this.expo.chunkPushNotificationReceiptIds(receiptIds);
  }

  getReceipts(
    receiptIds: string[],
  ): Promise<{ [id: string]: ExpoPushReceipt }> {
    return this.expo.getPushNotificationReceiptsAsync(receiptIds);
  }
}
