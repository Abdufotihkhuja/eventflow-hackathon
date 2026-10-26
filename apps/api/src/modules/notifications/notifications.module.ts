import { Global, Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailChannelSender } from './channels/email-channel.sender';
import { InAppChannelSender } from './channels/in-app-channel.sender';
import { PushChannelSender } from './channels/push-channel.sender';
import { DeviceTokensService } from './devices/device-tokens.service';
import { MeDevicesController } from './devices/me-devices.controller';
import { NotificationAudienceRepository } from './dispatch/notification-audience.repository';
import { NotificationDispatchJobsService } from './dispatch/notification-dispatch-jobs.service';
import { NotificationDispatchRepository } from './dispatch/notification-dispatch.repository';
import { NotificationDispatcherService } from './dispatch/notification-dispatcher.service';
import { NotificationRateLimiterService } from './dispatch/notification-rate-limiter.service';
import { NotificationReplanService } from './dispatch/notification-replan.service';
import { AccountNotificationsService } from './inbox/account-notifications.service';
import { MeNotificationsController } from './inbox/me-notifications.controller';
import { MeNotificationPreferencesController } from './preferences/me-notification-preferences.controller';
import { NotificationPreferencesService } from './preferences/notification-preferences.service';
import { ExpoPushClient } from './push/expo-push.client';
import { PushSendService } from './push/push-send.service';
import { NotificationChainDataRepository } from './chains/chain-data.repository';
import { ClosingChainService } from './chains/closing-chain.service';
import { ModerationChainService } from './chains/moderation-chain.service';
import { NotificationReconcileService } from './chains/notification-reconcile.service';
import { RegistrationChainService } from './chains/registration-chain.service';
import { RegistrationDigestService } from './chains/registration-digest.service';
import { ReminderChainService } from './chains/reminder-chain.service';
import { SummaryChainService } from './chains/summary-chain.service';

/**
 * @Global: уведомления порождаются побочно из чужих модулей (регистрации,
 * события, приглашения). Тянуть NotificationsModule в imports каждого из них —
 * значит расставить связи, которые ничего не выражают: никто из них не зависит
 * от уведомлений, они просто сообщают о факте.
 *
 * Ядро программы уведомлений (Батч 2): NotificationDispatcherService — единая
 * точка всех каналов (инвариант №2); канальные сендеры — деталь реализации
 * модуля, извне не импортируются (ESLint + ratchet).
 */
@Global()
@Module({
  imports: [MailModule],
  controllers: [
    NotificationsController,
    MeDevicesController,
    MeNotificationsController,
    MeNotificationPreferencesController,
  ],
  providers: [
    NotificationsService,
    AccountNotificationsService,
    InAppChannelSender,
    EmailChannelSender,
    PushChannelSender,
    ExpoPushClient,
    PushSendService,
    DeviceTokensService,
    NotificationPreferencesService,
    NotificationRateLimiterService,
    NotificationAudienceRepository,
    NotificationDispatchRepository,
    NotificationDispatcherService,
    NotificationDispatchJobsService,
    NotificationReplanService,
    // Цепочки Батча 6б: регистрируют материализаторы/replan-хендлеры в
    // onModuleInit; точки эмиссии зовут их из доменных модулей.
    NotificationChainDataRepository,
    ReminderChainService,
    ClosingChainService,
    SummaryChainService,
    ModerationChainService,
    RegistrationChainService,
    RegistrationDigestService,
    NotificationReconcileService,
  ],
  exports: [
    NotificationsService,
    NotificationDispatcherService,
    NotificationDispatchJobsService,
    NotificationReplanService,
    NotificationAudienceRepository,
    PushSendService,
    DeviceTokensService,
    ModerationChainService,
    RegistrationChainService,
    ClosingChainService,
    NotificationReconcileService,
  ],
})
export class NotificationsModule {}
