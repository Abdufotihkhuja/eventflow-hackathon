import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { MailDispatchService } from './application/mail-dispatch.service';

interface IRegistrationWithUser {
  user: { email: string; firstName: string | null; lastName: string | null };
}

export interface ISendToParticipantsDto {
  subject: string;
  message: string;
  registrationIds?: string[];
  sendToAll?: boolean;
}

export interface ISendResult {
  sent: number;
  failed: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailDispatchService: MailDispatchService,
  ) {}

  /**
   * Sends an organization invite for the account-centric flow. Unlike the legacy
   * {@link sendMemberInvitation} it branches the copy on whether the invitee
   * already has an EventFlow account:
   *  - existing user → "войдите в существующий аккаунт, чтобы принять"
   *  - new user → "создайте аккаунт, чтобы принять"
   * The link points at the invite-accept screen which inspects the token first.
   */
  async sendOrganizationInvite(params: {
    /** Stable, non-secret identifier for queue/idempotency metadata. */
    inviteId: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    rawToken: string;
    userExists: boolean;
    authMethods?: Array<'password' | 'google' | 'linkedin'>;
  }): Promise<void> {
    const mail = this.buildOrganizationInviteMail(params);
    await this.enqueueTemplateMail({
      to: params.email,
      ...mail,
      entityId: params.inviteId,
      idempotencyKey: `org-invite:${params.inviteId}`,
    });
  }

  /**
   * Pure mail snapshot used by the invite DB outbox. Keeping URL construction
   * here prevents the transactional path and the legacy direct sender from
   * drifting in subject/template/context.
   */
  buildOrganizationInviteMail(params: {
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    rawToken: string;
    userExists: boolean;
    authMethods?: Array<'password' | 'google' | 'linkedin'>;
  }): {
    subject: string;
    template: string;
    context: Record<string, unknown>;
  } {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const acceptUrl = `${appUrl}/invite/accept?token=${params.rawToken}`;
    return {
      subject: params.userExists
        ? `Вас пригласили в организацию ${params.organizationName} в EventFlow`
        : `Приглашение в организацию ${params.organizationName} в EventFlow`,
      template: 'member-invitation',
      context: {
        firstName: params.firstName,
        lastName: params.lastName,
        organizationName: params.organizationName,
        activationUrl: acceptUrl,
        email: params.email,
        userExists: params.userExists,
        authMethods: params.authMethods ?? [],
      },
    };
  }

  /**
   * Отправляет письма участникам события
   */
  async sendToEventParticipants(
    eventId: string,
    dto: ISendToParticipantsDto,
    user: ICurrentUser,
  ): Promise<ISendResult> {
    // Проверяем доступ к событию
    await this.checkEventAccess(eventId, user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: { select: { companyName: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    // Получаем регистрации
    let registrations: IRegistrationWithUser[];

    if (dto.registrationIds?.length) {
      registrations = await this.prisma.registration.findMany({
        where: {
          id: { in: dto.registrationIds },
          eventId,
          status: RegistrationStatus.APPROVED,
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });
    } else if (dto.sendToAll) {
      registrations = await this.prisma.registration.findMany({
        where: {
          eventId,
          status: RegistrationStatus.APPROVED,
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });
    } else {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;

    for (const registration of registrations) {
      await this.enqueueTemplateMail({
        to: registration.user.email,
        subject: dto.subject,
        template: 'event-notification',
        entityId: eventId,
        requestedBy: user,
        idempotencyKey: `event-notification:${eventId}:${registration.user.email}:${dto.subject}:${dto.message}`,
        context: {
          userName:
            `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim() ||
            'Участник',
          eventTitle: event.title,
          organizationName: event.organization.companyName,
          message: dto.message,
        },
      });
      sent++;
    }

    return { sent, failed: 0 };
  }

  /**
   * Отправляет уведомление об одобрении регистрации с ссылкой на e-ticket.
   */
  async sendRegistrationApproved(
    email: string,
    userName: string,
    eventTitle: string,
    organizationName: string,
    ticket?: { number?: string; url?: string },
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваша заявка на "${eventTitle}" одобрена`,
      template: 'registration-approved',
      entityId: `${email}:${eventTitle}`,
      idempotencyKey: `registration-approved:${email}:${eventTitle}:${ticket?.number ?? ''}`,
      context: {
        userName,
        eventTitle,
        organizationName,
        ticketNumber: ticket?.number,
        ticketUrl: ticket?.url,
      },
      swallowErrors: true,
    });
  }

  /**
   * Отправляет письмо сразу после регистрации (PENDING или APPROVED) со ссылкой на билет.
   */
  async sendRegistrationCreated(
    email: string,
    userName: string,
    eventTitle: string,
    organizationName: string,
    ticket: { number: string; url?: string; isPending: boolean },
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: ticket.isPending
        ? `Регистрация на "${eventTitle}" получена`
        : `Ваш билет на "${eventTitle}"`,
      template: 'registration-created',
      entityId: `${email}:${eventTitle}`,
      idempotencyKey: `registration-created:${email}:${ticket.number}`,
      context: {
        userName,
        eventTitle,
        organizationName,
        ticketNumber: ticket.number,
        ticketUrl: ticket.url,
        isPending: ticket.isPending,
      },
      swallowErrors: true,
    });
  }

  /**
   * Отправляет уведомление об отклонении регистрации
   */
  async sendRegistrationRejected(
    email: string,
    userName: string,
    eventTitle: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваша заявка на "${eventTitle}" отклонена`,
      template: 'registration-rejected',
      entityId: `${email}:${eventTitle}`,
      idempotencyKey: `registration-rejected:${email}:${eventTitle}:${reason ?? ''}`,
      context: {
        userName,
        eventTitle,
        organizationName,
        reason,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление об отмене участия организатором (PENDING/APPROVED → CANCELLED).
   */
  async sendRegistrationCancelled(
    email: string,
    userName: string,
    eventTitle: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваше участие в "${eventTitle}" отменено`,
      template: 'registration-cancelled',
      entityId: `${email}:${eventTitle}`,
      idempotencyKey: `registration-cancelled:${email}:${eventTitle}:${reason ?? ''}`,
      context: {
        userName,
        eventTitle,
        organizationName,
        reason,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление об отзыве подтверждения участия (APPROVED → PENDING).
   */
  async sendRegistrationRevoked(
    email: string,
    userName: string,
    eventTitle: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: `Подтверждение участия в "${eventTitle}" отозвано`,
      template: 'registration-revoked',
      entityId: `${email}:${eventTitle}`,
      idempotencyKey: `registration-revoked:${email}:${eventTitle}:${reason ?? ''}`,
      context: {
        userName,
        eventTitle,
        organizationName,
        reason,
      },
      swallowErrors: true,
    });
  }

  // === Private methods ===

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут отправлять рассылки',
    );
  }

  // === Email Verification Code Methods ===

  /**
   * Отправляет код подтверждения email
   */
  async sendEmailVerificationCode(
    email: string,
    firstName: string | null,
    code: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: 'Подтверждение email - EventFlow',
      template: 'email-verification-code',
      entityId: email,
      idempotencyKey: `email-verification:${email}:${code}`,
      context: {
        firstName,
        code,
      },
    });
  }

  /**
   * Отправляет код сброса пароля
   */
  async sendPasswordResetCode(
    email: string,
    firstName: string | null,
    code: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: 'Сброс пароля - EventFlow',
      template: 'password-reset-code',
      entityId: email,
      idempotencyKey: `password-reset:${email}:${code}`,
      context: {
        firstName,
        code,
      },
    });
  }

  /**
   * Отправляет код для смены email
   */
  async sendEmailChangeCode(
    email: string,
    firstName: string | null,
    code: string,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: 'Подтверждение смены email - EventFlow',
      template: 'email-change-code',
      entityId: email,
      idempotencyKey: `email-change:${email}:${code}`,
      context: {
        firstName,
        code,
      },
    });
  }

  /**
   * Отправляет уведомление о смене пароля
   */
  async sendPasswordChangedNotification(
    email: string,
    firstName: string | null,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: 'Ваш пароль был изменен - EventFlow',
      template: 'password-changed-notification',
      entityId: email,
      idempotencyKey: `password-changed:${email}:${new Date().toISOString().slice(0, 16)}`,
      context: {
        firstName,
        email,
        changeDate: new Date().toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      swallowErrors: true,
    });
  }

  /**
   * Отправляет уведомление о смене email на старый адрес
   */
  async sendEmailChangedNotification(
    oldEmail: string,
    newEmail: string,
    firstName: string | null,
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: oldEmail,
      subject: 'Ваш email был изменен - EventFlow',
      template: 'email-changed-notification',
      entityId: oldEmail,
      idempotencyKey: `email-changed:${oldEmail}:${newEmail}:${new Date().toISOString().slice(0, 16)}`,
      context: {
        firstName,
        oldEmail,
        newEmail,
        changeDate: new Date().toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      swallowErrors: true,
    });
  }

  // === Speaker Invitation Methods ===

  /**
   * Отправляет приглашение спикеру
   * @param email - Email спикера
   * @param name - Имя спикера
   * @param eventTitle - Название события
   * @param organizationName - Название организации
   * @param token - Токен приглашения
   * @param userExists - Существует ли User с таким email (true = не нужна регистрация)
   * @throws Error если не удалось отправить письмо
   */
  async sendSpeakerInvitation(
    email: string,
    name: string,
    eventTitle: string,
    organizationName: string,
    token: string,
    userExists: boolean,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const acceptUrl = `${appUrl}/speaker-invitation/accept?token=${token}`;
    const rejectUrl = `${appUrl}/speaker-invitation/reject?token=${token}`;

    await this.enqueueTemplateMail({
      to: email,
      subject: `Приглашение выступить на "${eventTitle}"`,
      template: 'speaker-invitation',
      entityId: token,
      idempotencyKey: `speaker-invitation:${token}`,
      context: {
        name,
        eventTitle,
        organizationName,
        acceptUrl,
        rejectUrl,
        userExists,
        expiresIn: '48 часов',
      },
    });
  }

  /**
   * Повторная отправка приглашения спикеру
   */
  async resendSpeakerInvitation(
    email: string,
    name: string,
    eventTitle: string,
    organizationName: string,
    token: string,
    userExists: boolean,
  ): Promise<void> {
    return this.sendSpeakerInvitation(
      email,
      name,
      eventTitle,
      organizationName,
      token,
      userExists,
    );
  }

  /**
   * Sends an invitation to a closed event: INVITE_ONLY (shared code, shown in
   * the email) or PRIVATE (personal link, no code).
   *
   * Dedupe is per minute, not per recipient: it absorbs a double-click, while a
   * deliberate resend later still goes out. A per-recipient key used to drop
   * every resend for 7 days while the API reported success.
   *
   * `sendKey` replaces the minute bucket when each send must go out on its own,
   * e.g. a PRIVATE resend that rotated the token and voided the previous link.
   */
  async sendEventInvitation(params: {
    eventId: string;
    email: string;
    eventTitle: string;
    organizationName: string;
    inviteLink: string;
    inviteCode?: string;
    sendKey?: string;
    now?: Date;
  }): Promise<void> {
    const sendKey =
      params.sendKey ??
      String(Math.floor((params.now ?? new Date()).getTime() / 60_000));
    await this.enqueueTemplateMail({
      to: params.email,
      subject: `Приглашение на мероприятие: ${params.eventTitle}`,
      template: 'event-invitation',
      entityId: params.eventId,
      idempotencyKey: `event-invitation:${params.eventId}:${params.email}:${sendKey}`,
      context: {
        email: params.email,
        eventTitle: params.eventTitle,
        organizationName: params.organizationName,
        inviteLink: params.inviteLink,
        inviteCode: params.inviteCode,
      },
    });
  }

  // === Contact Request Methods ===

  /**
   * Отправляет уведомление организатору о новой заявке на связь
   * @param organizationEmail - Email организатора
   * @param userName - Имя пользователя
   * @param phone - Телефон пользователя
   * @param message - Сообщение от пользователя
   * @throws Error если не удалось отправить письмо
   */
  async sendContactRequestNotification(
    organizationEmail: string,
    userName: string,
    phone: string,
    message?: string,
    metadata?: {
      type?: 'GENERAL' | 'PLACE_RENTAL';
      rentalPlaceTitle?: string;
      requesterOrganizationName?: string;
      rentalTypeName?: string;
    },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const dashboardUrl = `${appUrl}/contacts`;

    await this.enqueueTemplateMail({
      to: organizationEmail,
      subject:
        metadata?.type === 'PLACE_RENTAL'
          ? 'Новая заявка на аренду площадки'
          : 'Новая заявка на связь от пользователя',
      template: 'contact-request',
      entityId: organizationEmail,
      idempotencyKey: `contact-request:${organizationEmail}:${userName}:${phone}:${message ?? ''}:${metadata?.type ?? 'GENERAL'}`,
      context: {
        userName,
        phone,
        message,
        dashboardUrl,
        isPlaceRental: metadata?.type === 'PLACE_RENTAL',
        rentalPlaceTitle: metadata?.rentalPlaceTitle,
        requesterOrganizationName: metadata?.requesterOrganizationName,
        rentalTypeName: metadata?.rentalTypeName,
      },
    });
  }

  /**
   * Организатору: приглашённый отказался вступить в команду. Идемпотентность по
   * приглашению — отказ единичный, повтор письма не нужен.
   */
  async sendMemberInviteDeclinedNotification(params: {
    organizationEmail: string;
    organizationName: string;
    inviteId: string;
    personName: string;
    roleName: string;
    reason?: string | null;
  }): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    await this.enqueueTemplateMail({
      to: params.organizationEmail,
      subject: `${params.personName} отказался от приглашения в команду`,
      template: 'member-invite-declined',
      entityId: params.inviteId,
      idempotencyKey: `invite-declined:${params.inviteId}`,
      context: {
        personName: params.personName,
        organizationName: params.organizationName,
        roleName: params.roleName,
        reason: params.reason ?? '',
        staffUrl: `${appUrl}/users`,
      },
      // Отказ уже сохранён: недоступная почтовая очередь не должна возвращать
      // клиенту 500 за успешное действие и провоцировать повтор.
      swallowErrors: true,
    });
  }

  // === Blog Post Moderation Methods ===

  /**
   * Отправляет уведомление об одобрении статьи блога
   * @param email - Email организатора
   * @param postTitle - Заголовок статьи
   * @param postId - ID статьи (для ссылки)
   */
  /** E-11b/§2.1: напоминание об истечении пакета (идемпотентно per purchase+window). */
  async sendPlanExpiryReminder(
    email: string,
    args: {
      purchaseId: string;
      planKey: string;
      expiresAtFormatted: string;
      daysLeft: number;
      /** '14d' | '3d' — окно напоминания (дедуп). */
      window: string;
    },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    await this.enqueueTemplateMail({
      to: email,
      subject: `Тариф ${args.planKey} скоро истекает`,
      template: 'plan-expiry-reminder',
      entityId: args.purchaseId,
      idempotencyKey: `plan-expiry:${args.purchaseId}:${args.window}:${email}`,
      context: {
        planKey: args.planKey,
        expiresAtFormatted: args.expiresAtFormatted,
        daysLeft: String(args.daysLeft),
        billingUrl: `${appUrl}/settings/billing`,
      },
      swallowErrors: true,
    });
  }

  async sendBlogPostApproved(
    email: string,
    postTitle: string,
    postId: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const dashboardUrl = `${appUrl}/dashboard/blog/${postId}`;
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваша статья "${postTitle}" одобрена`,
      template: 'blog-post-approved',
      entityId: postId,
      idempotencyKey: `blog-post-approved:${postId}:${email}`,
      context: {
        postTitle,
        dashboardUrl,
      },
      swallowErrors: true,
    });
  }

  /**
   * Отправляет уведомление об отклонении статьи блога
   * @param email - Email организатора
   * @param postTitle - Заголовок статьи
   * @param postId - ID статьи (для ссылки)
   * @param reason - Причина отклонения
   */
  async sendBlogPostRejected(
    email: string,
    postTitle: string,
    postId: string,
    reason?: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const dashboardUrl = `${appUrl}/dashboard/blog/${postId}/edit`;
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваша статья "${postTitle}" отклонена`,
      template: 'blog-post-rejected',
      entityId: postId,
      idempotencyKey: `blog-post-rejected:${postId}:${email}:${reason ?? ''}`,
      context: {
        postTitle,
        reason,
        dashboardUrl,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление организации об успешной верификации супер-админом.
   * Верификация открывает отправку мероприятий на модерацию
   * (VerifiedOrganizationGuard), поэтому письмо обязательно.
   */
  async sendOrganizationApproved(
    email: string,
    args: { organizationId: string; organizationName: string; locale?: string },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    await this.enqueueTemplateMail({
      to: email,
      subject: `Организация «${args.organizationName}» верифицирована`,
      template: 'organization-approved',
      entityId: args.organizationId,
      idempotencyKey: `organization-approved:${args.organizationId}:${email}`,
      context: {
        locale: args.locale,
        organizationName: args.organizationName,
        dashboardUrl: `${appUrl}/dashboard`,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление организации об отказе в верификации.
   * idempotencyKey включает причину: новое решение с другим комментарием
   * отправляет письмо, повтор с тем же — нет.
   */
  async sendOrganizationRejected(
    email: string,
    args: {
      organizationId: string;
      organizationName: string;
      reason?: string;
      locale?: string;
    },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    await this.enqueueTemplateMail({
      to: email,
      subject: `Организация «${args.organizationName}» не прошла верификацию`,
      template: 'organization-rejected',
      entityId: args.organizationId,
      idempotencyKey: `organization-rejected:${args.organizationId}:${email}:${args.reason ?? ''}`,
      context: {
        locale: args.locale,
        organizationName: args.organizationName,
        reason: args.reason,
        dashboardUrl: `${appUrl}/settings`,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление организатору об успешной модерации мероприятия.
   * @param email - Email организации
   * @param args.eventId - ID мероприятия (ссылка в кабинет)
   * @param args.slug - Публичный slug (ссылка на страницу события)
   */
  async sendEventApproved(
    email: string,
    args: {
      eventId: string;
      eventTitle: string;
      slug?: string;
      startDate?: string;
      venue?: string;
      locale?: string;
    },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    const siteUrl = this.configService.get<string>('mail.brand.siteUrl');
    await this.enqueueTemplateMail({
      to: email,
      subject: `Мероприятие «${args.eventTitle}» опубликовано`,
      template: 'event-approved',
      entityId: args.eventId,
      idempotencyKey: `event-approved:${args.eventId}:${email}`,
      context: {
        locale: args.locale,
        eventTitle: args.eventTitle,
        startDate: args.startDate,
        venue: args.venue,
        publicUrl: args.slug ? `${siteUrl}/events/${args.slug}` : undefined,
        dashboardUrl: `${appUrl}/my-events/${args.eventId}`,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление организатору об отказе в публикации мероприятия.
   * idempotencyKey включает причину: повторная модерация с другим
   * комментарием отправляет новое письмо, дубли с тем же — нет.
   */
  async sendEventRejected(
    email: string,
    args: {
      eventId: string;
      eventTitle: string;
      reason?: string;
      startDate?: string;
      venue?: string;
      locale?: string;
    },
  ): Promise<void> {
    const appUrl = this.configService.get<string>('mail.appUrl');
    await this.enqueueTemplateMail({
      to: email,
      subject: `Мероприятие «${args.eventTitle}» не прошло модерацию`,
      template: 'event-rejected',
      entityId: args.eventId,
      idempotencyKey: `event-rejected:${args.eventId}:${email}:${args.reason ?? ''}`,
      context: {
        locale: args.locale,
        eventTitle: args.eventTitle,
        reason: args.reason,
        startDate: args.startDate,
        venue: args.venue,
        dashboardUrl: `${appUrl}/my-events/${args.eventId}/edit`,
      },
      swallowErrors: true,
    });
  }

  /**
   * Уведомление участнику о выданном сертификате.
   * idempotencyKey стабилен по получателю+событию, поэтому письмо уходит ровно
   * один раз (повторная генерация/регенерация сертификата не шлёт дубликаты).
   */
  async sendCertificateIssued(
    email: string,
    recipientName: string,
    eventName: string,
    options: {
      idempotencyKey: string;
      eventDate?: string;
      certificatesUrl?: string;
      verifyUrl?: string;
      locale?: string;
    },
  ): Promise<void> {
    await this.enqueueTemplateMail({
      to: email,
      subject: `Ваш сертификат за «${eventName}» готов`,
      template: 'certificate-issued',
      entityId: `${email}:${eventName}`,
      idempotencyKey: options.idempotencyKey,
      context: {
        locale: options.locale,
        recipientName,
        eventName,
        eventDate: options.eventDate,
        certificatesUrl: options.certificatesUrl,
        verifyUrl: options.verifyUrl,
      },
      swallowErrors: true,
    });
  }

  private async enqueueTemplateMail(input: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
    entityId: string;
    idempotencyKey: string;
    requestedBy?: ICurrentUser;
    swallowErrors?: boolean;
  }): Promise<void> {
    try {
      await this.mailDispatchService.enqueueTemplateMail({
        to: input.to,
        subject: input.subject,
        template: input.template,
        context: input.context,
        entityId: input.entityId,
        requestedBy: input.requestedBy,
        idempotencyKey: input.idempotencyKey,
      });
      this.logger.log(`Mail job queued for ${input.to}`);
    } catch (error) {
      this.logger.error(
        `Ошибка при постановке письма в очередь для ${input.to}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );

      if (!input.swallowErrors) {
        throw error;
      }
    }
  }
}
