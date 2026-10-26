import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingSweepService } from '../../billing/sweeps/billing-sweep.service';
import { Public } from '../../../common/decorators';
import { MailDispatchService } from '../../mail/application/mail-dispatch.service';
import { TicketGenerationService } from '../../tickets/application/ticket-generation.service';
import { CertificateGenerationService } from '../../certificates/application/certificate-generation.service';
import { BadgesService } from '../../badges/badges.service';
import { RegistrationFilesService } from '../../registration-files/registration-files.service';
import { NotificationDispatchJobsService } from '../../notifications/dispatch/notification-dispatch-jobs.service';
import { NotificationReconcileService } from '../../notifications/chains/notification-reconcile.service';
import { PushSendService } from '../../notifications/push/push-send.service';
import { InternalJobGuard } from '../queue/internal-job.guard';
import type {
  BadgesZipGenerationJobPayload,
  CertificateGenerationJobPayload,
  MailJobPayload,
  PushReceiptsJobPayload,
  PushSendJobPayload,
  TicketGenerationJobPayload,
  TicketsZipGenerationJobPayload,
} from '../queue/queue.types';

// Internal job routes are called by the worker with INTERNAL_JOB_TOKEN, never by
// end users. They must not compete with users for the per-IP rate-limit bucket:
// under load that throttled mail.send and dropped verification emails.
@Controller('internal/jobs')
@Public()
@SkipThrottle()
@UseGuards(InternalJobGuard)
export class InternalJobsController {
  constructor(
    private readonly mailDispatchService: MailDispatchService,
    private readonly ticketGenerationService: TicketGenerationService,
    private readonly certificateGenerationService: CertificateGenerationService,
    private readonly badgesService: BadgesService,
    private readonly billingSweepService: BillingSweepService,
    private readonly registrationFilesService: RegistrationFilesService,
    private readonly notificationDispatchJobs: NotificationDispatchJobsService,
    private readonly notificationReconcile: NotificationReconcileService,
    private readonly pushSendService: PushSendService,
  ) {}

  @Post('mail/send')
  dispatchMail(@Body() payload: MailJobPayload) {
    return this.mailDispatchService.dispatchQueuedMail(payload);
  }

  /** Отправка push-доставки (BL-14): очередь push.send → worker → сюда. */
  @Post('push/send')
  dispatchPush(@Body() payload: PushSendJobPayload) {
    return this.pushSendService.processSendJob(payload);
  }

  /** Отложенный опрос Expo receipts (~15 мин после send, BL-14). */
  @Post('push/receipts')
  pushReceipts(@Body() payload: PushReceiptsJobPayload) {
    return this.pushSendService.processReceiptsJob(payload);
  }

  /** E-11b: гигиенический свип биллинга (BullMQ repeatable → worker → сюда). */
  @Post('billing/sweep')
  async billingSweep() {
    return this.billingSweepService.run();
  }

  /**
   * Уборка брошенных черновиков регистрации: файлы, загруженные участником,
   * но так и не отправленные (BullMQ repeatable → worker → сюда).
   */
  @Post('registration-files/sweep')
  async registrationFilesSweep() {
    return this.registrationFilesService.sweepStaleDrafts();
  }

  /** Тик диспатчера уведомлений (BL-10): repeatable 60s → worker → сюда. */
  @Post('notifications/dispatch-due')
  async notificationsDispatchDue() {
    return this.notificationDispatchJobs.runDispatchDueTick();
  }

  /** Reaper застрявших enqueued-доставок (BL-06): repeatable 10 мин. */
  @Post('notifications/reaper')
  async notificationsReaper() {
    return this.notificationDispatchJobs.runReaperSweep();
  }

  /** Reconcile-свип цепочек (Батч 6б): repeatable раз в сутки. */
  @Post('notifications/reconcile')
  async notificationsReconcile() {
    return this.notificationReconcile.run();
  }

  @Post('tickets/generate')
  generateTicket(@Body() payload: TicketGenerationJobPayload) {
    return this.ticketGenerationService.processSingleTicketJob(payload);
  }

  @Post('tickets/zip')
  generateTicketsZip(@Body() payload: TicketsZipGenerationJobPayload) {
    return this.ticketGenerationService.processTicketsZipJob(payload);
  }

  /** Сборка ZIP бейджей: очередь badges.generate → worker → сюда. */
  @Post('badges/zip')
  generateBadgesZip(@Body() payload: BadgesZipGenerationJobPayload) {
    return this.badgesService.processBadgesZipJob(payload);
  }

  @Post('certificates/generate')
  generateCertificates(@Body() payload: CertificateGenerationJobPayload) {
    return this.certificateGenerationService.processGenerateCertificatesJob(
      payload,
    );
  }
}
