import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../platform/queue/queue.service';
import { JobIdempotencyService } from '../../platform/queue/job-idempotency.service';
import type { MailJobPayload } from '../../platform/queue/queue.types';
import type { ICurrentUser } from '../../../common/interfaces';
import { PrismaService } from '../../../prisma/prisma.service';
import { renderEmail, DEFAULT_BRAND, type BrandConfig } from '../email/render';
import { EmailUnsubscribeService } from '../../email-unsubscribe/email-unsubscribe.service';
import { UnsubscribeTokenService } from '../../email-unsubscribe/unsubscribe-token.service';
import { resolveAccountLocale } from './account-locale';

interface EnqueueTemplateMailInput {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  entityId: string;
  requestedBy?: ICurrentUser;
  idempotencyKey: string;
  /** Журнальные письма диспатчера уведомлений (BL-06): id NotificationDelivery. */
  deliveryId?: string;
}

/** Статусы NotificationDelivery, значимые для email-плеча (без импорта из notifications). */
const DELIVERY_ENQUEUED = 'enqueued';
const DELIVERY_SENT = 'sent';
const DELIVERY_SUPPRESSED_UNSUBSCRIBE = 'suppressed_unsubscribe';

@Injectable()
export class MailDispatchService {
  private readonly logger = new Logger(MailDispatchService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly queueService: QueueService,
    private readonly idempotencyService: JobIdempotencyService,
    private readonly configService: ConfigService,
    private readonly unsubscribeTokens: UnsubscribeTokenService,
    private readonly unsubscribeService: EmailUnsubscribeService,
    private readonly prisma: PrismaService,
  ) {}

  private getBrand(): BrandConfig {
    return this.configService.get<BrandConfig>('mail.brand') ?? DEFAULT_BRAND;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, 1)}***@${domain}`;
  }

  async enqueueTemplateMail(input: EnqueueTemplateMailInput): Promise<string> {
    // BL-37: единая точка локализации ВСЕХ писем. Если вызывающий не передал
    // context.locale явно (5 методов MailService с параметром locale? и
    // цепочки уведомлений, кладущие locale в payload), резолвим язык
    // получателя из Account.locale по email; нет аккаунта/локали → 'ru'
    // (прежнее поведение). Локаль фиксируется в payload на этапе enqueue,
    // чтобы рендер в воркере не зависел от смены языка после постановки.
    const context =
      input.context.locale === undefined
        ? {
            ...input.context,
            locale: await resolveAccountLocale(this.prisma, input.to),
          }
        : input.context;

    const payload: MailJobPayload = {
      jobId: input.idempotencyKey,
      type: 'mail.template',
      entityId: input.entityId,
      attempt: 0,
      idempotencyKey: input.idempotencyKey,
      deliveryId: input.deliveryId,
      requestedBy: input.requestedBy
        ? {
            userId: input.requestedBy.sub,
            actorType: input.requestedBy.type,
            organizationId: input.requestedBy.organizationId,
          }
        : undefined,
      mail: {
        to: input.to,
        subject: input.subject,
        template: input.template,
        context,
      },
    };

    const handle = await this.queueService.enqueueMail(payload);
    return handle.jobId;
  }

  async dispatchQueuedMail(payload: MailJobPayload): Promise<{
    status: 'sent' | 'deduplicated' | 'suppressed' | 'skipped';
  }> {
    const idempotencyScope = 'mail';
    const deliveryId = payload.deliveryId;

    if (deliveryId) {
      // Журнальное письмо (BL-06): истина — БД, не Redis-TTL. Строка не в
      // enqueued (отменена cancelBy / уже sent / терминальна) → не шлём.
      const delivery = await this.prisma.notificationDelivery.findUnique({
        where: { id: deliveryId },
        select: { status: true, organizationId: true },
      });
      if (!delivery || delivery.status !== DELIVERY_ENQUEUED) {
        return { status: 'deduplicated' };
      }
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
            where: { id: deliveryId },
            data: {
              status: 'skipped',
              error: 'organization_unavailable',
            },
          });
          return { status: 'skipped' };
        }
      }
    } else if (
      (await this.idempotencyService.hasProcessed(
        idempotencyScope,
        payload.idempotencyKey,
      )) ||
      !(await this.idempotencyService.reserve(
        idempotencyScope,
        payload.idempotencyKey,
      ))
    ) {
      return { status: 'deduplicated' };
    }

    try {
      const brand = this.getBrand();
      const recipient = payload.mail.to;
      const masked = this.maskEmail(recipient);

      // Per-recipient signed token. The link always opts the recipient out
      // of the `notification` category (the only opt-out category) — even
      // on transactional mail, where it never blocks delivery.
      const token = this.unsubscribeTokens.sign(recipient, 'notification');
      const oneClickUrl = `${brand.unsubscribeApiUrl}${
        brand.unsubscribeApiUrl.includes('?') ? '&' : '?'
      }token=${encodeURIComponent(token)}`;
      const pageUrl = `${brand.unsubscribePageUrl}${
        brand.unsubscribePageUrl.includes('?') ? '&' : '?'
      }token=${encodeURIComponent(token)}`;

      const rendered = renderEmail(
        payload.mail.template,
        payload.mail.context,
        brand,
        payload.mail.subject,
        pageUrl,
      );

      // Notification mail honours the recipient's opt-out. Transactional
      // mail is always delivered.
      if (rendered.category === 'notification') {
        const suppressed = await this.unsubscribeService.isSuppressed(
          recipient,
          'notification',
        );
        if (suppressed) {
          if (deliveryId) {
            await this.prisma.notificationDelivery.update({
              where: { id: deliveryId },
              data: { status: DELIVERY_SUPPRESSED_UNSUBSCRIBE },
            });
          } else {
            await this.idempotencyService.markProcessed(
              idempotencyScope,
              payload.idempotencyKey,
            );
          }
          this.logger.log(
            `mail.suppressed template=${payload.mail.template} ` +
              `to=${masked} category=notification`,
          );
          return { status: 'suppressed' };
        }
      }

      const headers: Record<string, string> = {
        'List-Unsubscribe': `<${oneClickUrl}>, <mailto:${brand.supportEmail}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };

      const info = (await this.mailerService.sendMail({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        replyTo: brand.replyTo,
        headers,
      })) as { messageId?: string } | undefined;

      if (deliveryId) {
        // BL-06: providerRef (SMTP messageId) фиксируется ДО перевода в sent —
        // краш между апдейтами оставит enqueued-строку с providerRef, и reaper
        // НЕ переотправит её (sent_unconfirmed), дубля не будет.
        const providerRef = info?.messageId ?? `smtp:${Date.now()}`;
        await this.prisma.notificationDelivery.update({
          where: { id: deliveryId },
          data: { providerRef },
        });
        await this.prisma.notificationDelivery.update({
          where: { id: deliveryId },
          data: { status: DELIVERY_SENT, sentAt: new Date() },
        });
      } else {
        await this.idempotencyService.markProcessed(
          idempotencyScope,
          payload.idempotencyKey,
        );
      }

      this.logger.log(
        `mail.sent template=${payload.mail.template} ` +
          `to=${masked} category=${rendered.category}`,
      );
      return { status: 'sent' };
    } catch (error) {
      if (!deliveryId) {
        await this.idempotencyService.clear(
          idempotencyScope,
          payload.idempotencyKey,
        );
      }
      // Для журнальных писем строка остаётся enqueued: ретраи BullMQ, затем
      // reaper (max 1 повтор → failed) — «молчаливой потери» больше нет.

      this.logger.error(
        `Failed to send queued email to ${payload.mail.to}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw error;
    }
  }
}
