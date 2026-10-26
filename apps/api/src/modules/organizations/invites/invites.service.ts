import { SeatLimitService } from '../../billing/entitlements/seat-limit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  AuthProvider,
  InviteStatus,
  MemberStatus,
  Prisma,
  type User,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { NotificationDispatcherService } from '../../notifications/dispatch/notification-dispatcher.service';
import { NOTIFICATION_CHANNELS } from '../../notifications/dispatch/notification.types';
import { IamService } from '../../iam/iam.service';
import {
  BCRYPT_SALT_ROUNDS,
  MEMBER_INVITATION_EXPIRY_HOURS,
} from '../../../common/constants/security.constant';
import { InvitesRepository, InviteWithRelations } from './invites.repository';
import {
  DECLINE_REASON_MAX,
  INVITE_CODES,
  InviteAuthMethod,
  InviteNextAction,
} from './invites.constants';
import { CreateInviteDto } from './dto';
import {
  AcceptInviteResultDto,
  InviteInspectionDto,
  InviteSummaryDto,
  MyInviteDto,
} from './dto/invite-response.dto';

/** Minimal authenticated-actor view the accept/inspect flow needs. */
export interface InviteViewer {
  email: string;
  /** Unified account id of the signed-in actor (any type). */
  accountId?: string;
  /** Public User id, only when the actor signed in as a USER. */
  userId?: string;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly iamService: IamService,
    private readonly seatLimit: SeatLimitService,
    private readonly notifications: NotificationsService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  // ==================== ADMIN: CREATE / LIST / RESEND / REVOKE ====================

  /**
   * Creates an invite into an organization. Normalizes the email, then branches:
   * existing user vs new user (drives the email copy), already-member and
   * pending-duplicate guards. Never requires a password.
   */
  async createInvite(
    organizationId: string,
    dto: CreateInviteDto,
    createdByUserId?: string,
  ): Promise<InviteSummaryDto> {
    // E-4: место занимает уже сам PENDING-инвайт (CR-10) — проверяем до создания.
    await this.seatLimit.assertSeatAvailable(organizationId);

    const email = this.normalizeEmail(dto.email);

    const role = await this.prisma.organizationRole.findFirst({
      where: { id: dto.roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    // Already an active member of THIS organization?
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        status: { not: MemberStatus.INVITED },
      },
    });
    if (existingMember) {
      throw new ConflictException({
        code: INVITE_CODES.USER_ALREADY_ORGANIZATION_MEMBER,
        message: 'Пользователь уже состоит в этой организации',
      });
    }

    // Clear any expired pending invite so the partial-unique index is free.
    await this.invitesRepository.expireStalePending(organizationId, email);

    const pending = await this.invitesRepository.findPending(
      organizationId,
      email,
    );
    if (pending) {
      throw new ConflictException({
        code: INVITE_CODES.PENDING_INVITE_ALREADY_EXISTS,
        message: 'Приглашение на этот email уже отправлено',
        details: {
          inviteId: pending.id,
          expiresAt: pending.expiresAt,
          canResend: true,
        },
      });
    }

    const existingUser = await this.findUserByEmail(email);
    // "Existing" is decided across ALL account types (organization owner, member
    // of another org, OAuth account, …), not just the public User table — so an
    // organizer who already has an account gets the "sign in to accept" email,
    // never the "create an account" one.
    const accountExists = await this.accountExistsForEmail(email);
    const authMethods = await this.resolveAuthMethodsForEmail(email);
    const { rawToken, tokenHash } = this.generateToken();

    const { invite, enqueue } = await this.prisma.$transaction(
      async (tx) => {
        const invite = await this.invitesRepository.create(
          {
            email,
            tokenHash,
            expiresAt: this.computeExpiry(),
            status: InviteStatus.PENDING,
            firstName: dto.firstName ?? existingUser?.firstName ?? null,
            lastName: dto.lastName ?? existingUser?.lastName ?? null,
            position: dto.position ?? null,
            department: dto.department ?? null,
            createdByUserId: createdByUserId ?? null,
            organization: { connect: { id: organizationId } },
            role: { connect: { id: role.id } },
            ...(existingUser
              ? { user: { connect: { id: existingUser.id } } }
              : {}),
          },
          tx,
        );
        const enqueue = await this.createInviteOutboxDelivery(
          invite,
          organization.name,
          {
            userExists: accountExists,
            authMethods,
            firstName: invite.firstName ?? existingUser?.firstName ?? '',
            lastName: invite.lastName ?? existingUser?.lastName ?? '',
            rawToken,
            tokenHash,
          },
          tx,
        );
        return { invite, enqueue };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await enqueue();
    this.audit('invite.created', {
      inviteId: invite.id,
      organizationId,
      email,
      userExists: accountExists,
      createdByUserId,
    });

    return this.toSummary(invite, accountExists);
  }

  /**
   * Creates a fresh invite, or refreshes the existing pending one for the same
   * (organization, email). Used by the staff "resend" action so it always goes
   * through the account-centric flow (correct branched email + hashed token)
   * instead of the retired legacy member-invitation path.
   */
  async createOrResend(
    organizationId: string,
    dto: CreateInviteDto,
    createdByUserId?: string,
  ): Promise<InviteSummaryDto> {
    const email = this.normalizeEmail(dto.email);
    await this.invitesRepository.expireStalePending(organizationId, email);
    const pending = await this.invitesRepository.findPending(
      organizationId,
      email,
    );
    if (pending) {
      return this.resendInvite(organizationId, pending.id);
    }
    return this.createInvite(organizationId, dto, createdByUserId);
  }

  async listInvites(
    organizationId: string,
    status?: InviteStatus,
  ): Promise<InviteSummaryDto[]> {
    const invites = await this.invitesRepository.listForOrganization(
      organizationId,
      status,
    );
    const summaries = await Promise.all(
      invites.map(async (invite) => {
        const userExists =
          invite.status === InviteStatus.PENDING
            ? await this.accountExistsForEmail(invite.email)
            : false;
        return this.toSummary(invite, userExists);
      }),
    );
    return summaries;
  }

  /** Re-sends a still-pending invite with a fresh token + extended deadline. */
  async resendInvite(
    organizationId: string,
    inviteId: string,
  ): Promise<InviteSummaryDto> {
    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite || invite.organizationId !== organizationId) {
      throw new NotFoundException('Приглашение не найдено');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException({
        code: this.statusCode(invite.status),
        message: 'Приглашение нельзя переотправить',
      });
    }

    const { rawToken, tokenHash } = this.generateToken();
    const accountExists = await this.accountExistsForEmail(invite.email);
    const existingUser = await this.findUserByEmail(invite.email);
    const authMethods = await this.resolveAuthMethodsForEmail(invite.email);
    const { updated, enqueue } = await this.prisma.$transaction(
      async (tx) => {
        // A delayed job for the previous token must never send after resend.
        await tx.notificationDelivery.updateMany({
          where: {
            dedupKey: { startsWith: `org-invite:${inviteId}:` },
            channel: NOTIFICATION_CHANNELS.EMAIL,
            status: 'enqueued',
          },
          data: { status: 'cancelled', error: 'invite_resent' },
        });
        const updated = await this.invitesRepository.update(
          inviteId,
          { tokenHash, expiresAt: this.computeExpiry() },
          tx,
        );
        const enqueue = await this.createInviteOutboxDelivery(
          updated,
          updated.organization.name,
          {
            userExists: accountExists,
            authMethods,
            firstName: updated.firstName ?? existingUser?.firstName ?? '',
            lastName: updated.lastName ?? existingUser?.lastName ?? '',
            rawToken,
            tokenHash,
          },
          tx,
        );
        return { updated, enqueue };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await enqueue();
    this.audit('invite.resent', { inviteId, organizationId });

    return this.toSummary(updated, accountExists);
  }

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite || invite.organizationId !== organizationId) {
      throw new NotFoundException('Приглашение не найдено');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException({
        code: this.statusCode(invite.status),
        message: 'Приглашение нельзя отозвать',
      });
    }
    await this.invitesRepository.update(inviteId, {
      status: InviteStatus.REVOKED,
      revokedAt: new Date(),
    });
    this.audit('invite.revoked', { inviteId, organizationId });
  }

  // ==================== PUBLIC: INSPECT ====================

  /**
   * Safe, token-gated inspection used by the accept screen. Does not mutate the
   * invite (expiry is computed on the fly). Returns only non-sensitive fields.
   */
  async inspectInvite(
    rawToken: string,
    viewer?: InviteViewer,
  ): Promise<InviteInspectionDto> {
    const invite = await this.invitesRepository.findByTokenHash(
      this.hashToken(rawToken),
    );
    if (!invite) {
      throw new NotFoundException({
        code: INVITE_CODES.INVITE_NOT_FOUND,
        message: 'Приглашение не найдено',
      });
    }

    const status = this.effectiveStatus(invite);
    const accountExists = await this.accountExistsForEmail(invite.email);
    const authMethods = await this.resolveAuthMethodsForEmail(invite.email);
    const currentUserMatch = viewer
      ? viewer.email.toLowerCase() === invite.email
      : null;

    return {
      status,
      organizationName: invite.organization.name,
      email: invite.email,
      role: { id: invite.role.id, name: invite.role.name },
      userExists: accountExists,
      authMethods,
      expiresAt: invite.expiresAt,
      currentUserMatch,
      nextAction: this.resolveNextAction(
        status,
        accountExists,
        currentUserMatch,
      ),
    };
  }

  // ==================== PUBLIC: ACCEPT ====================

  /**
   * Accepts an invite. Existing users must be authenticated with the matching
   * email (no password); brand-new users provide a password and an account is
   * created. Always single-use: the invite transitions to ACCEPTED.
   */
  async acceptInvite(
    rawToken: string,
    params: { password?: string; viewer?: InviteViewer },
  ): Promise<AcceptInviteResultDto> {
    const invite = await this.invitesRepository.findByTokenHash(
      this.hashToken(rawToken),
    );
    if (!invite) {
      throw new NotFoundException({
        code: INVITE_CODES.INVITE_NOT_FOUND,
        message: 'Приглашение не найдено',
      });
    }

    return this.performAccept(invite, params);
  }

  // ==================== ПРИГЛАШЁННЫЙ: СВОИ ПРИГЛАШЕНИЯ ====================

  /**
   * Приглашения, адресованные текущему пользователю. Нужны, чтобы человек
   * увидел приглашение в своём кабинете, а не только в письме: письмо теряется,
   * попадает в спам, открывается с чужого устройства.
   */
  async listMyInvites(viewer: InviteViewer): Promise<MyInviteDto[]> {
    const email = viewer.email.trim().toLowerCase();
    if (!email) return [];
    const invites = await this.invitesRepository.listPendingForEmail(email);
    return invites
      .filter(
        (invite) =>
          !invite.organization.deletedAt && !invite.organization.suspendedAt,
      )
      .map((invite) => ({
        id: invite.id,
        organizationId: invite.organizationId,
        organizationName: invite.organization.name,
        organizationLogoUrl: invite.organization.logoUrl ?? null,
        role: { id: invite.role.id, name: invite.role.name },
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }));
  }

  /**
   * Принятие приглашения из кабинета — по id, без токена из письма. Доступ
   * подтверждает сам вход: приглашение адресовано email, которым человек уже
   * авторизован. Дальше — тот же единственный путь принятия, что и по ссылке.
   */
  async acceptMyInvite(
    inviteId: string,
    viewer: InviteViewer,
  ): Promise<AcceptInviteResultDto> {
    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite || invite.email !== viewer.email.trim().toLowerCase()) {
      // Чужое приглашение неотличимо от несуществующего — не подсказываем,
      // что для этого id приглашение вообще есть.
      throw new NotFoundException({
        code: INVITE_CODES.INVITE_NOT_FOUND,
        message: 'Приглашение не найдено',
      });
    }
    return this.performAccept(invite, { viewer });
  }

  /**
   * Отказ от приглашения из кабинета. Комментарий необязателен: отказ без
   * объяснения — нормальный сценарий, но если человек написал причину,
   * организатор увидит её в списке приглашений и не будет слать повторно
   * вслепую. Отказ освобождает пару (организация, email) — пригласить заново
   * можно сразу.
   */
  async declineMyInvite(
    inviteId: string,
    viewer: InviteViewer,
    reason?: string,
  ): Promise<void> {
    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite || invite.email !== viewer.email.trim().toLowerCase()) {
      throw new NotFoundException({
        code: INVITE_CODES.INVITE_NOT_FOUND,
        message: 'Приглашение не найдено',
      });
    }
    const status = this.effectiveStatus(invite);
    if (status !== InviteStatus.PENDING) {
      throw new ConflictException({
        code: this.statusCode(status),
        message: 'Приглашение уже недоступно',
      });
    }

    const trimmed = reason?.trim();
    const declineReason = trimmed ? trimmed.slice(0, DECLINE_REASON_MAX) : null;
    await this.invitesRepository.update(invite.id, {
      status: InviteStatus.DECLINED,
      declinedAt: new Date(),
      declineReason,
    });
    this.audit('invite.declined', {
      inviteId: invite.id,
      organizationId: invite.organizationId,
      withReason: Boolean(trimmed),
    });

    // Отказ — это ответ, а не тишина: без уведомления приглашение просто
    // исчезало из ожидающих, и организатор слал повторно вслепую.
    try {
      await this.notifications.emit({
        organizationId: invite.organizationId,
        type: NotificationType.MEMBER_INVITE_DECLINED,
        entityType: 'invite',
        entityId: invite.id,
        payload: {
          personName:
            `${invite.firstName ?? ''} ${invite.lastName ?? ''}`.trim() ||
            invite.email,
          roleName: invite.role.name,
          ...(declineReason ? { reason: declineReason } : {}),
        },
      });
    } catch {
      // Отказ уже сохранён — падение уведомления не должно возвращать клиенту
      // ошибку и провоцировать повторный запрос.
      this.audit('invite.notification_failed', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
      });
    }

    // Письмо — второе плечо: в ленту организатор может не заходить неделями,
    // а место в тарифе освободилось прямо сейчас. Отказ уже сохранён, поэтому
    // любая проблема с почтой остаётся в логе, а не возвращается клиенту 500-й
    // за успешное действие.
    if (invite.organization.email) {
      try {
        await this.mailService.sendMemberInviteDeclinedNotification({
          organizationEmail: invite.organization.email,
          organizationName: invite.organization.name,
          inviteId: invite.id,
          personName:
            `${invite.firstName ?? ''} ${invite.lastName ?? ''}`.trim() ||
            invite.email,
          roleName: invite.role.name,
          reason: declineReason,
        });
      } catch {
        this.audit('invite.decline_mail_failed', {
          inviteId: invite.id,
          organizationId: invite.organizationId,
        });
      }
    }
  }

  /** Общее ядро принятия — одно на ссылку из письма и на кабинет. */
  private async performAccept(
    invite: InviteWithRelations,
    params: { password?: string; viewer?: InviteViewer },
  ): Promise<AcceptInviteResultDto> {
    this.assertAcceptable(invite);

    const acceptedAt = new Date();
    let accepted: {
      target: Awaited<ReturnType<InvitesService['resolveAcceptTarget']>>;
      member: Awaited<ReturnType<InvitesService['upsertMemberForInvite']>>;
      role: { id: string; name: string };
    };
    try {
      accepted = await this.prisma.$transaction(
        async (tx) => {
          // CAS is the concurrency boundary. A parallel accept waits on this row
          // and then observes count=0; every following write rolls back together.
          const claimed = await this.invitesRepository.claimPending(
            tx,
            invite.id,
            acceptedAt,
          );
          if (claimed.count !== 1) {
            throw new ConflictException({
              code: INVITE_CODES.INVITE_ALREADY_ACCEPTED,
              message: 'Приглашение уже принято или недоступно',
            });
          }

          const role = await tx.organizationRole.findUnique({
            where: {
              organizationId_id: {
                id: invite.roleId,
                organizationId: invite.organizationId,
              },
            },
            include: { permissions: { include: { permission: true } } },
          });
          if (!role) {
            throw new ConflictException({
              code: 'INVITE_ROLE_RECONCILIATION_REQUIRED',
              message: 'Роль приглашения недоступна',
            });
          }

          const target = await this.resolveAcceptTarget(invite, params, tx);
          const member = await this.upsertMemberForInvite(
            invite,
            { firstName: target.firstName, lastName: target.lastName },
            tx,
          );
          const permissions = role.permissions.map(
            (item) => item.permission.code,
          );
          await this.iamService.linkMemberToAccount(
            {
              accountId: target.accountId,
              member,
              roleName: role.name,
              permissions,
            },
            tx,
          );

          await this.invitesRepository.completeAcceptance(tx, invite.id, {
            acceptedAt,
            acceptedByUserId: target.userId,
            acceptedMemberId: member.id,
          });
          return { target, member, role };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: INVITE_CODES.USER_ALREADY_ORGANIZATION_MEMBER,
          message: 'Пользователь уже состоит в этой организации',
        });
      }
      throw error;
    }
    const { target, member, role } = accepted;
    this.audit('invite.accepted', {
      inviteId: invite.id,
      organizationId: invite.organizationId,
      accountId: target.accountId,
      userId: target.userId,
      memberId: member.id,
    });

    // Приглашение принято — остальная команда узнаёт об этом в приложении, а
    // не по факту нового имени в списке участников.
    try {
      await this.notifications.emit({
        organizationId: invite.organizationId,
        type: NotificationType.MEMBER_JOINED,
        entityType: 'member',
        entityId: member.id,
        payload: {
          personName:
            `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim() ||
            invite.email,
        },
      });
    } catch {
      // The membership is already committed. A notification failure must not
      // make the client retry the single-use token and receive a false failure.
      this.audit('invite.notification_failed', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
      });
    }

    const requiresLogin = target.requiresLogin;

    return {
      code: INVITE_CODES.MEMBERSHIP_CREATED,
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      organizationMemberId: member.id,
      role: { id: role.id, name: role.name },
      requiresLogin,
    };
  }

  // ==================== INTERNAL ====================

  /** Validates lifecycle state; expires stale pending invites in place. */
  private assertAcceptable(invite: InviteWithRelations): void {
    if (invite.organization.deletedAt || invite.organization.suspendedAt) {
      throw new ForbiddenException({
        code: 'INVITE_ORGANIZATION_UNAVAILABLE',
        message: 'Организация временно недоступна',
      });
    }
    if (invite.status === InviteStatus.REVOKED) {
      this.audit('invite.expired_attempt', {
        inviteId: invite.id,
        reason: 'revoked',
      });
      throw new ForbiddenException({
        code: INVITE_CODES.INVITE_REVOKED,
        message: 'Приглашение отозвано',
      });
    }
    if (invite.status === InviteStatus.ACCEPTED) {
      throw new ConflictException({
        code: INVITE_CODES.INVITE_ALREADY_ACCEPTED,
        message: 'Приглашение уже принято',
      });
    }
    if (
      invite.status === InviteStatus.EXPIRED ||
      invite.expiresAt.getTime() < Date.now()
    ) {
      // Best-effort persist the terminal state.
      if (invite.status === InviteStatus.PENDING) {
        void this.invitesRepository
          .update(invite.id, { status: InviteStatus.EXPIRED })
          .catch(() => undefined);
      }
      this.audit('invite.expired_attempt', {
        inviteId: invite.id,
        reason: 'expired',
      });
      throw new BadRequestException({
        code: INVITE_CODES.INVITE_EXPIRED,
        message: 'Срок действия приглашения истёк',
      });
    }
  }

  /**
   * Resolves the account the membership attaches to, plus the profile names and
   * whether the caller still needs to log in afterwards.
   *
   * Crucially this is keyed off the *account*, not the public User table: a
   * person may already exist as an organization owner, a member of another org,
   * or an OAuth-only account. An authenticated viewer with a matching email
   * joins as their existing account (no password, no duplicate User); only a
   * truly unknown email creates a fresh User.
   */
  private async resolveAcceptTarget(
    invite: InviteWithRelations,
    params: { password?: string; viewer?: InviteViewer },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{
    accountId: string;
    userId: string | null;
    requiresLogin: boolean;
    firstName: string;
    lastName: string;
  }> {
    const { viewer, password } = params;

    if (viewer && viewer.email.toLowerCase() !== invite.email) {
      this.audit('invite.wrong_account', {
        inviteId: invite.id,
        viewerEmail: viewer.email.toLowerCase(),
      });
      throw new ForbiddenException({
        code: INVITE_CODES.WRONG_ACCOUNT,
        message: 'Это приглашение оформлено на другой email',
      });
    }

    // Authenticated: attach the membership to the viewer's existing account,
    // whatever actor type they signed in as (user, organization owner, member…).
    if (viewer?.accountId) {
      const names = await this.accountNames(viewer.accountId, db);
      // The invitee's REAL name from their account wins over whatever the admin
      // typed into the invite (often a placeholder) — accepting fixes the FIO.
      return {
        accountId: viewer.accountId,
        userId: viewer.userId ?? null,
        requiresLogin: false,
        firstName: names.firstName ?? invite.firstName ?? '',
        lastName: names.lastName ?? invite.lastName ?? '',
      };
    }

    // Not authenticated: if any account already exists for this email, the
    // person must sign in first (we never silently create a second account).
    if (await this.accountExistsForEmail(invite.email, db)) {
      throw new UnauthorizedException({
        code: INVITE_CODES.AUTH_REQUIRED,
        message: 'Войдите в существующий аккаунт, чтобы принять приглашение',
      });
    }

    // Brand-new person — password required to create their account.
    if (!password) {
      throw new BadRequestException({
        code: INVITE_CODES.PASSWORD_REQUIRED_FOR_NEW_ACCOUNT,
        message: 'Создайте пароль, чтобы принять приглашение',
      });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await db.user.create({
      data: {
        email: invite.email,
        passwordHash,
        firstName: invite.firstName ?? '',
        lastName: invite.lastName ?? '',
        authProvider: AuthProvider.EMAIL,
        // The invite link proves control of the inbox, so the email is verified.
        isEmailVerified: true,
      },
    });
    const accountId = await this.iamService.ensureAccountForUser(user, db);
    return {
      accountId,
      userId: user.id,
      requiresLogin: true,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    };
  }

  /**
   * Creates (or restores/reuses) the staff record for the invitee. The record
   * carries no password — the person authenticates through their unified User
   * account; this row is just the profile + role within the org.
   */
  private async upsertMemberForInvite(
    invite: InviteWithRelations,
    names: { firstName: string; lastName: string },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existing = await db.organizationMember.findFirst({
      where: {
        organizationId: invite.organizationId,
        email: { equals: invite.email, mode: 'insensitive' },
      },
    });

    // `names` is already the resolved (real-account-first) FIO from
    // resolveAcceptTarget — write it as-is so accepting overwrites any
    // placeholder name on a reused staff record.
    const profile = {
      firstName: names.firstName || '',
      lastName: names.lastName || '',
      position: invite.position ?? undefined,
      department: invite.department ?? undefined,
    };

    if (existing) {
      return db.organizationMember.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          status: MemberStatus.ACTIVE,
          roleId: invite.roleId,
          invitationToken: null,
          tokenExpiresAt: null,
          ...profile,
        },
      });
    }

    return db.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        email: invite.email,
        roleId: invite.roleId,
        status: MemberStatus.ACTIVE,
        invitationSent: true,
        ...profile,
      },
    });
  }

  private async createInviteOutboxDelivery(
    invite: InviteWithRelations,
    organizationName: string,
    opts: {
      userExists: boolean;
      authMethods: InviteAuthMethod[];
      firstName: string;
      lastName: string;
      rawToken: string;
      tokenHash: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<() => Promise<void>> {
    const email = this.mailService.buildOrganizationInviteMail({
      email: invite.email,
      firstName: opts.firstName,
      lastName: opts.lastName,
      organizationName,
      rawToken: opts.rawToken,
      userExists: opts.userExists,
      authMethods: opts.authMethods,
    });
    const result = await this.notificationDispatcher.dispatchNow(
      {
        catalogId: 'ORG-INVITE',
        // A token hash is non-reversible; only a short discriminator is used
        // so raw one-use credentials never enter logs or job identifiers.
        dedupKey: `org-invite:${invite.id}:${opts.tokenHash.slice(0, 16)}`,
        kind: 'transactional',
        priority: 'high',
        channels: [NOTIFICATION_CHANNELS.EMAIL],
        organizationId: invite.organizationId,
        recipients: [
          {
            accountId: null,
            email: invite.email,
            locale: 'ru',
            devices: [],
          },
        ],
        email,
      },
      tx,
    );
    return result.enqueue;
  }

  /**
   * Whether ANY account already exists for this email — across the public User
   * table, organization owners, active staff of any org, and the unified Account
   * layer. Drives the existing-vs-new invite copy and the accept nextAction.
   */
  private async accountExistsForEmail(
    email: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<boolean> {
    const insensitive = { equals: email, mode: 'insensitive' as const };
    const [user, organization, member, account] = await Promise.all([
      this.findUserByEmail(email, db),
      db.organization.findFirst({
        where: { email: insensitive, deletedAt: null },
        select: { id: true },
      }),
      db.organizationMember.findFirst({
        where: {
          email: insensitive,
          deletedAt: null,
          status: MemberStatus.ACTIVE,
        },
        select: { id: true },
      }),
      db.account.findFirst({
        where: { email: insensitive, deletedAt: null },
        select: { id: true },
      }),
    ]);
    return !!(user || organization || member || account);
  }

  /** Sign-in methods available to whatever account owns the email (best-effort). */
  private async resolveAuthMethodsForEmail(
    email: string,
  ): Promise<InviteAuthMethod[]> {
    const user = await this.findUserByEmail(email);
    if (user) return this.providerMethods(user.passwordHash, user.authProvider);

    const organization = await this.prisma.organization.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { passwordHash: true, authProvider: true },
    });
    if (organization) {
      return this.providerMethods(
        organization.passwordHash,
        organization.authProvider,
      );
    }
    // Member / account fallback — they authenticate with a password.
    return [];
  }

  private providerMethods(
    passwordHash: string | null,
    provider: AuthProvider,
  ): InviteAuthMethod[] {
    const methods: InviteAuthMethod[] = [];
    if (passwordHash) methods.push('password');
    if (provider === AuthProvider.GOOGLE) methods.push('google');
    if (provider === AuthProvider.LINKEDIN) methods.push('linkedin');
    return methods;
  }

  /** Display names from a unified Account (for the staff profile on accept). */
  private async accountNames(
    accountId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ firstName: string | null; lastName: string | null }> {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { firstName: true, lastName: true },
    });
    return {
      firstName: account?.firstName ?? null,
      lastName: account?.lastName ?? null,
    };
  }

  private resolveNextAction(
    status: InviteStatus,
    userExists: boolean,
    currentUserMatch: boolean | null,
  ): InviteNextAction {
    switch (status) {
      case InviteStatus.REVOKED:
        return InviteNextAction.REVOKED;
      case InviteStatus.ACCEPTED:
        return InviteNextAction.ALREADY_ACCEPTED;
      case InviteStatus.EXPIRED:
        return InviteNextAction.EXPIRED;
      default:
        break;
    }
    if (currentUserMatch === false) {
      return InviteNextAction.WRONG_ACCOUNT;
    }
    if (currentUserMatch === true) {
      return InviteNextAction.ACCEPT_INVITE;
    }
    return userExists
      ? InviteNextAction.LOGIN_TO_ACCEPT
      : InviteNextAction.SIGNUP_TO_ACCEPT;
  }

  private effectiveStatus(invite: InviteWithRelations): InviteStatus {
    if (
      invite.status === InviteStatus.PENDING &&
      invite.expiresAt.getTime() < Date.now()
    ) {
      return InviteStatus.EXPIRED;
    }
    return invite.status;
  }

  private statusCode(status: InviteStatus): string {
    switch (status) {
      case InviteStatus.ACCEPTED:
        return INVITE_CODES.INVITE_ALREADY_ACCEPTED;
      case InviteStatus.REVOKED:
        return INVITE_CODES.INVITE_REVOKED;
      case InviteStatus.EXPIRED:
        return INVITE_CODES.INVITE_EXPIRED;
      default:
        return INVITE_CODES.INVITE_NOT_FOUND;
    }
  }

  private toSummary(
    invite: InviteWithRelations,
    userExists: boolean,
  ): InviteSummaryDto {
    return {
      id: invite.id,
      organizationId: invite.organizationId,
      email: invite.email,
      status: invite.status,
      role: { id: invite.role.id, name: invite.role.name },
      expiresAt: invite.expiresAt,
      userExists,
      firstName: invite.firstName,
      lastName: invite.lastName,
      createdAt: invite.createdAt,
      declinedAt: invite.declinedAt,
      declineReason: invite.declineReason,
    };
  }

  private findUserByEmail(
    email: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<User | null> {
    return db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('hex');
    return { rawToken, tokenHash: this.hashToken(rawToken) };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private computeExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + MEMBER_INVITATION_EXPIRY_HOURS);
    return expiry;
  }

  private audit(event: string, payload: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ type: 'audit', event, ...payload }));
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
