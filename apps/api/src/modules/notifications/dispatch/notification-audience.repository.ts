import { Injectable, Logger } from '@nestjs/common';
import {
  MembershipKind,
  MemberStatus,
  Prisma,
  RegistrationStatus,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  requireEventTenantWhere,
  requireTenantWhere,
} from '../../../common/tenant/tenant-scope';
import type {
  NotificationRecipient,
  RecipientDevice,
} from './notification.types';

const DEFAULT_LOCALE = 'ru';

/**
 * Резолвер аудиторий (BL-04) — единственное место, где строится связка
 * User → Identity(actorType=USER, actorId) → Account → активные DeviceToken.
 *
 * Ключевые инварианты:
 * - B-03/OQ-25: у User нет accountId; Account создаётся лениво при логине.
 *   Участник без Account — легитимная ветка: email-only по User.email,
 *   AccountNotification для него НЕ пишется (accountId=null в получателе).
 * - Инвариант №7 (tenant isolation): организаторские аудитории строятся строго
 *   от eventId → event.organizationId ИЗ БД (не из ввода) и скоупятся
 *   requireTenantWhere()/requireEventTenantWhere().
 * - Токены — только владельца: DeviceToken выбираются по accountId,
 *   полученному через Identity конкретного User, и только активные
 *   (disabledAt=null).
 */
@Injectable()
export class NotificationAudienceRepository {
  private readonly logger = new Logger(NotificationAudienceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Участник конкретной регистрации. null — регистрация/пользователь исчезли. */
  async resolveRegistrationParticipant(
    registrationId: string,
  ): Promise<NotificationRecipient | null> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      select: { id: true, userId: true },
    });
    if (!registration) {
      return null;
    }
    const byUser = await this.resolveByUserIds([registration.userId]);
    const recipient = byUser.get(registration.userId);
    if (!recipient) {
      return null;
    }
    return { ...recipient, registrationId: registration.id };
  }

  /** Все подтверждённые (APPROVED) участники события. PENDING не включаем (OQ-06). */
  async resolveApprovedAttendees(
    eventId: string,
  ): Promise<NotificationRecipient[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) {
      return [];
    }
    const registrations = await this.prisma.registration.findMany({
      where: requireEventTenantWhere(event.organizationId, {
        eventId,
        status: RegistrationStatus.APPROVED,
      }),
      select: { id: true, userId: true },
    });
    const byUser = await this.resolveByUserIds(
      registrations.map((r) => r.userId),
    );
    const recipients: NotificationRecipient[] = [];
    for (const registration of registrations) {
      const recipient = byUser.get(registration.userId);
      if (recipient) {
        recipients.push({ ...recipient, registrationId: registration.id });
      }
    }
    return recipients;
  }

  /**
   * Организаторская аудитория: владелец всегда + члены с указанным permission
   * (PERMISSIONS.EVENTS_UPDATE = 'events:update',
   * PERMISSIONS.REGISTRATIONS_READ = 'registrations:read'); резолв прав —
   * роль (RolePermission) плюс персональные MemberPermission.
   */
  async resolveOrganizerAudience(
    eventId: string,
    permissionCode: string,
  ): Promise<NotificationRecipient[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) {
      return [];
    }
    const organizationId = event.organizationId;

    const memberWhere: Prisma.OrganizationMemberWhereInput = {
      deletedAt: null,
      status: MemberStatus.ACTIVE,
      OR: [
        {
          role: {
            permissions: {
              some: { permission: { code: permissionCode } },
            },
          },
        },
        { permissions: { some: { permission: { code: permissionCode } } } },
      ],
    };
    const members = await this.prisma.organizationMember.findMany({
      where: requireTenantWhere(organizationId, memberWhere),
      select: { id: true },
    });

    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        OR: [
          { kind: MembershipKind.OWNER },
          { organizationMemberId: { in: members.map((m) => m.id) } },
        ],
      },
      select: {
        accountId: true,
        account: {
          select: { id: true, email: true, locale: true, deletedAt: true },
        },
      },
    });

    const seen = new Set<string>();
    const accounts: Array<{
      id: string;
      email: string;
      locale: string | null;
    }> = [];
    for (const membership of memberships) {
      const account = membership.account;
      if (!account || account.deletedAt || seen.has(account.id)) {
        continue;
      }
      seen.add(account.id);
      accounts.push({
        id: account.id,
        email: account.email,
        locale: account.locale,
      });
    }

    const devicesByAccount = await this.loadActiveDevices(
      accounts.map((a) => a.id),
    );

    return accounts.map((account) => {
      const devices = devicesByAccount.get(account.id) ?? [];
      return {
        accountId: account.id,
        email: account.email,
        locale: devices[0]?.locale ?? account.locale ?? DEFAULT_LOCALE,
        devices,
      };
    });
  }

  /**
   * «Заинтересованные» (CLS-01/02): SavedEvent-пользователи БЕЗ активной
   * (PENDING/APPROVED) регистрации на это событие.
   */
  async resolveSavedEventAudience(
    eventId: string,
  ): Promise<NotificationRecipient[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      return [];
    }
    const saved = await this.prisma.savedEvent.findMany({
      where: {
        eventId,
        user: {
          registrations: {
            none: {
              eventId,
              status: {
                in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
              },
            },
          },
        },
      },
      select: { userId: true },
    });
    const byUser = await this.resolveByUserIds(saved.map((s) => s.userId));
    return saved
      .map((s) => byUser.get(s.userId))
      .filter((r): r is NotificationRecipient => Boolean(r));
  }

  /**
   * Активные (PENDING/APPROVED) регистрации события с получателями —
   * REG-10 при отмене события (fan-out per-registration ключами).
   */
  async resolveActiveRegistrations(
    eventId: string,
  ): Promise<NotificationRecipient[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) {
      return [];
    }
    const registrations = await this.prisma.registration.findMany({
      where: requireEventTenantWhere(event.organizationId, {
        eventId,
        status: {
          in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
        },
      }),
      select: { id: true, userId: true },
    });
    const byUser = await this.resolveByUserIds(
      registrations.map((r) => r.userId),
    );
    const recipients: NotificationRecipient[] = [];
    for (const registration of registrations) {
      const recipient = byUser.get(registration.userId);
      if (recipient) {
        recipients.push({ ...recipient, registrationId: registration.id });
      }
    }
    return recipients;
  }

  /**
   * SUM-01: подтверждённые участники, реально пришедшие (≥1 Attendance).
   * No-show не получает «спасибо за участие» (OQ-11).
   */
  async resolveAttendedAudience(
    eventId: string,
  ): Promise<NotificationRecipient[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) {
      return [];
    }
    const registrations = await this.prisma.registration.findMany({
      where: requireEventTenantWhere(event.organizationId, {
        eventId,
        status: RegistrationStatus.APPROVED,
        attendances: { some: {} },
      }),
      select: { id: true, userId: true },
    });
    const byUser = await this.resolveByUserIds(
      registrations.map((r) => r.userId),
    );
    const recipients: NotificationRecipient[] = [];
    for (const registration of registrations) {
      const recipient = byUser.get(registration.userId);
      if (recipient) {
        recipients.push({ ...recipient, registrationId: registration.id });
      }
    }
    return recipients;
  }

  /**
   * Прямые получатели по accountId (REG-22 per-account дайджест, OQ-23):
   * аккаунт уже известен, User-плечо не нужно.
   */
  async resolveAccountRecipients(
    accountIds: string[],
  ): Promise<Map<string, NotificationRecipient>> {
    const result = new Map<string, NotificationRecipient>();
    const unique = [...new Set(accountIds)];
    if (unique.length === 0) {
      return result;
    }
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true, email: true, locale: true },
    });
    const devicesByAccount = await this.loadActiveDevices(
      accounts.map((a) => a.id),
    );
    for (const account of accounts) {
      const devices = devicesByAccount.get(account.id) ?? [];
      result.set(account.id, {
        accountId: account.id,
        email: account.email,
        locale: devices[0]?.locale ?? account.locale ?? DEFAULT_LOCALE,
        devices,
      });
    }
    return result;
  }

  /**
   * Ядро BL-04: батчевый резолв User → Identity → Account → DeviceToken.
   * Для user без Identity/Account — email-only получатель по User.email.
   */
  async resolveByUserIds(
    userIds: string[],
  ): Promise<Map<string, NotificationRecipient>> {
    const result = new Map<string, NotificationRecipient>();
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) {
      return result;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, email: true },
    });

    const identities = await this.prisma.identity.findMany({
      where: { actorType: UserType.USER, actorId: { in: uniqueIds } },
      select: {
        actorId: true,
        accountId: true,
        account: { select: { locale: true, email: true, deletedAt: true } },
      },
    });
    const identityByUser = new Map(identities.map((i) => [i.actorId, i]));

    const accountIds = identities
      .filter((i) => i.account && !i.account.deletedAt)
      .map((i) => i.accountId);
    const devicesByAccount = await this.loadActiveDevices(accountIds);

    for (const user of users) {
      const identity = identityByUser.get(user.id);
      const account =
        identity && identity.account && !identity.account.deletedAt
          ? identity.account
          : null;

      if (!identity || !account) {
        // OQ-25: Account отсутствует (или архивирован) — email-only по
        // User.email; AccountNotification/DeviceToken для него не существуют.
        result.set(user.id, {
          accountId: null,
          email: user.email,
          locale: DEFAULT_LOCALE,
          devices: [],
        });
        continue;
      }

      const devices = devicesByAccount.get(identity.accountId) ?? [];
      result.set(user.id, {
        accountId: identity.accountId,
        email: account.email ?? user.email,
        locale: devices[0]?.locale ?? account.locale ?? DEFAULT_LOCALE,
        devices,
      });
    }

    return result;
  }

  private async loadActiveDevices(
    accountIds: string[],
  ): Promise<Map<string, RecipientDevice[]>> {
    const map = new Map<string, RecipientDevice[]>();
    const unique = [...new Set(accountIds)];
    if (unique.length === 0) {
      return map;
    }
    const tokens = await this.prisma.deviceToken.findMany({
      where: { accountId: { in: unique }, disabledAt: null },
      select: {
        id: true,
        accountId: true,
        expoPushToken: true,
        platform: true,
        locale: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    for (const token of tokens) {
      const list = map.get(token.accountId) ?? [];
      list.push({
        id: token.id,
        expoPushToken: token.expoPushToken,
        platform: token.platform,
        locale: token.locale,
      });
      map.set(token.accountId, list);
    }
    return map;
  }
}
