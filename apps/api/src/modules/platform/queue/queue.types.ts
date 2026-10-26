import type { JobsOptions, Job } from 'bullmq';
import type { DownloadTicketsDto, TicketDesign } from '../../tickets/dto';
import type { GenerateCertificatesDto } from '../../certificates/dto';
import type { DownloadBadgesDto } from '../../badges/dto';

export const QUEUE_NAMES = {
  MAIL: 'mail.send',
  TICKETS: 'tickets.generate',
  CERTIFICATES: 'certificates.generate',
  BADGES: 'badges.generate',
  BILLING_SWEEPS: 'billing.sweeps',
  MAINTENANCE_SWEEPS: 'maintenance.sweeps',
  NOTIFICATIONS: 'notifications.jobs',
  PUSH: 'push.send',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueJobEnvelope {
  jobId: string;
  type: string;
  requestedBy?: {
    userId: string;
    actorType: string;
    organizationId?: string;
  };
  entityId: string;
  context?: Record<string, unknown>;
  attempt?: number;
}

export interface MailJobPayload extends QueueJobEnvelope {
  type: 'mail.template';
  idempotencyKey: string;
  /**
   * Журнальные письма (BL-06): id строки NotificationDelivery. Строка создана
   * ДО постановки job; по успеху SMTP dispatch фиксирует providerRef
   * (messageId) и переводит строку в sent. Идемпотентность таких писем — БД
   * (composite unique + статус), а не Redis-TTL.
   */
  deliveryId?: string;
  mail: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  };
}

export interface TicketGenerationJobPayload extends QueueJobEnvelope {
  type: 'ticket.single';
  registrationId: string;
  design: TicketDesign;
}

export interface TicketsZipGenerationJobPayload extends QueueJobEnvelope {
  type: 'ticket.zip';
  eventId: string;
  download: DownloadTicketsDto;
}

/** E-11b: повторяемое гигиеническое задание биллинга (без полезной нагрузки). */
export interface BillingSweepJobPayload extends QueueJobEnvelope {
  type: 'billing.sweep';
}

/**
 * Уборка брошенных черновиков регистрации: файлы, загруженные участником,
 * но так и не отправленные вместе с формой (без полезной нагрузки).
 */
export interface RegistrationFilesSweepJobPayload extends QueueJobEnvelope {
  type: 'registration-files.sweep';
}

export interface CertificateGenerationJobPayload extends QueueJobEnvelope {
  type: 'certificate.batch';
  eventId: string;
  generate: GenerateCertificatesDto;
}

/**
 * ZIP бейджей. Бейджи не персистятся: каждый PDF рендерится заново, поэтому
 * выгрузка на несколько десятков получателей не укладывается в HTTP-таймаут
 * клиента и уходит в очередь, а фронт следит за прогрессом.
 */
export interface BadgesZipGenerationJobPayload extends QueueJobEnvelope {
  type: 'badge.zip';
  eventId: string;
  download: DownloadBadgesDto;
}

/**
 * Тик диспатчера уведомлений (BL-10): repeatable 60s, выбирает due-строки
 * ScheduledNotification (FOR UPDATE SKIP LOCKED) и материализует их в
 * NotificationDelivery + канальные job'ы.
 */
export interface NotificationsDispatchDueJobPayload extends QueueJobEnvelope {
  type: 'notifications.dispatch-due';
}

/**
 * Reaper застрявших enqueued-доставок (BL-06): repeatable 10 мин;
 * providerRef есть → не переотправлять, нет → max 1 повтор, дальше failed.
 */
export interface NotificationsReaperJobPayload extends QueueJobEnvelope {
  type: 'notifications.reaper';
}

/**
 * Суточный reconcile-свип цепочек (страховка инварианта №3): досоздаёт
 * недостающие плановые строки живых событий, гасит осиротевшие, создаёт
 * digest-строки следующего дня (BL-19).
 */
export interface NotificationsReconcileJobPayload extends QueueJobEnvelope {
  type: 'notifications.reconcile';
}

export type NotificationsJobPayload =
  | NotificationsDispatchDueJobPayload
  | NotificationsReaperJobPayload
  | NotificationsReconcileJobPayload;

/**
 * Отправка push-доставки (BL-14): job несёт только deliveryId — контент и
 * список устройств перечитываются из NotificationDelivery/DeviceToken в момент
 * исполнения (актуальные токены, идемпотентность по статусу строки).
 */
export interface PushSendJobPayload extends QueueJobEnvelope {
  type: 'push.send';
  deliveryId: string;
}

/**
 * Отложенный опрос Expo receipts (~15 мин после send): подтверждение
 * delivered, деактивация DeviceNotRegistered-токенов, email-fallback
 * per-account (BL-14, STATE_MACHINES §6).
 */
export interface PushReceiptsJobPayload extends QueueJobEnvelope {
  type: 'push.receipts';
  deliveryId: string;
}

export type PushJobPayload = PushSendJobPayload | PushReceiptsJobPayload;

export type TicketJobPayload =
  | TicketGenerationJobPayload
  | TicketsZipGenerationJobPayload;

export type QueuePayload =
  | BillingSweepJobPayload
  | RegistrationFilesSweepJobPayload
  | MailJobPayload
  | TicketJobPayload
  | CertificateGenerationJobPayload
  | BadgesZipGenerationJobPayload
  | NotificationsJobPayload
  | PushJobPayload;

export interface QueueJobHandle<TPayload extends QueuePayload = QueuePayload> {
  job: Job<TPayload>;
  jobId: string;
  queueName: QueueName;
}

export interface QueueCompletionResult<TResult = unknown> {
  status: 'completed' | 'failed' | 'timed_out';
  result?: TResult;
  reason?: string;
}

export type QueueEnqueueOptions = JobsOptions;
