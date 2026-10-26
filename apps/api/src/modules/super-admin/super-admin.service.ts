import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  SuperAdmin,
  User,
  Organization,
  Event,
  BlogPost,
  OrganizationVerificationStatus,
  EventStatus,
  BlogPostStatus,
  RegistrationStatus,
  Prisma,
  UserType,
  NotificationType,
  AuthProvider,
  MembershipKind,
} from '@prisma/client';
import {
  CreateSuperAdminDto,
  AdminUsersQueryDto,
  AdminOrganizationsQueryDto,
  AdminEventsQueryDto,
  AdminBlogPostsQueryDto,
  AdminUpdateUserDto,
  AdminUpdateOrganizationDto,
  AdminUpdateEventDto,
  OrganizationDeletePreviewDto,
  ProvisionOrganizationDto,
  ProvisionOrganizationResponseDto,
  AdminSetEventStatusDto,
} from './dto';
import { BlogService } from '../blog/blog.service';
import {
  AdminAuditService,
  PLATFORM_TARGET_ID,
} from '../platform/admin-audit/admin-audit.service';
import { EventCreditsService } from '../billing/plan-state/event-credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationDispatcherService } from '../notifications/dispatch/notification-dispatcher.service';
import {
  ModerationChainService,
  ModerationRejectKind,
} from '../notifications/chains/moderation-chain.service';
import { LegacyAdminAuditAction } from '../platform/admin-audit/admin-audit.types';
import { RegistrationChainService } from '../notifications/chains/registration-chain.service';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security.constant';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { POLICY_DENIALS } from '../../common/constants/policy-denial.constant';
import { DEFAULT_ROLES } from '../../common/constants/permissions.constant';
import {
  buildAdminUsersWhere,
  resolveAdminRecordStatus,
  type AdminRecordStatus,
} from './admin-users.filters';

export type { AdminRecordStatus } from './admin-users.filters';

/** Пользователь без хэша пароля — единственная форма, уходящая наружу. */
export type SafeUser = Omit<User, 'passwordHash'>;

/** Организация без хэша пароля (legacy-поле входа организаций). */
export type SafeOrganization = Omit<Organization, 'passwordHash'>;

/** Пользователь в админ-списке + метаданные архивации и членства. */
export type AdminUserListItem = SafeUser & {
  /** Имя супер-админа, который архивировал (или null). */
  archivedByName: string | null;
  /** Первая организация по членству (или null). */
  organizationName: string | null;
  /** Роль в этой организации (или null). */
  roleName: string | null;
};

/** Организация в админ-списке + счётчики и кто архивировал. */
export type AdminOrganizationListItem = SafeOrganization & {
  _count: { members: number; events: number };
  archivedByName: string | null;
};

/** Точка серии роста платформы (ISO-неделя). */
export type SystemStatsGrowthPoint = {
  /** Понедельник недели в формате YYYY-MM-DD. */
  weekStart: string;
  users: number;
  registrations: number;
  events: number;
};

/** Агрегаты организации для детальной страницы супер-админа. */
export type AdminOrganizationStats = {
  eventsByStatus: Record<EventStatus, number>;
  totalEvents: number;
  /** Регистрации на все события организации. */
  totalRegistrations: number;
  blogPostsTotal: number;
  blogPostsPublished: number;
  followersCount: number;
  /** Команда (первые 10 активных сотрудников). */
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string | null;
    avatarUrl: string | null;
    roleName: string;
    status: string;
  }>;
  membersTotal: number;
};

/** Агрегаты пользователя для детальной страницы супер-админа. */
export type AdminUserStats = {
  registrationsByStatus: Record<RegistrationStatus, number>;
  /** Событий, где был хотя бы один чек-ин. */
  attendedEvents: number;
  certificatesCount: number;
  eventCommentsCount: number;
  followingCount: number;
  /** Членства в организациях (unified Account). */
  memberships: Array<{
    organizationId: string | null;
    organizationName: string | null;
    roleName: string | null;
  }>;
};

/** Агрегаты события для детальной страницы супер-админа. */
export type AdminEventStats = {
  registrationsByStatus: Record<RegistrationStatus, number>;
  /** Участники хотя бы с одним чек-ином. */
  checkedInParticipants: number;
  /** Актуальные (isCurrent) сертификаты события. */
  certificatesIssued: number;
  commentsCount: number;
  questionsCount: number;
};

/** Элемент очереди модерации на дашборде. */
export type SystemStatsModerationItem = {
  id: string;
  title: string;
  organizationName: string | null;
  createdAt: Date;
  startDate?: Date;
};

/** Расширенная сводка платформы для дашборда супер-админа. */
export type SystemStats = {
  totalUsers: number;
  totalOrganizations: number;
  totalMembers: number;
  pendingOrganizations: number;
  pendingEvents: number;
  pendingBlogPosts: number;
  archivedUsers: number;
  archivedOrganizations: number;
  totalEvents: number;
  eventsByStatus: Record<EventStatus, number>;
  totalRegistrations: number;
  totalBlogPosts: number;
  publishedBlogPosts: number;
  newUsers7d: number;
  newUsers30d: number;
  newOrganizations30d: number;
  newRegistrations7d: number;
  newRegistrations30d: number;
  newEvents30d: number;
  growth: SystemStatsGrowthPoint[];
  moderationQueue: {
    organizations: SystemStatsModerationItem[];
    events: SystemStatsModerationItem[];
    blogPosts: SystemStatsModerationItem[];
  };
};

function stripPasswordHash<T extends { passwordHash?: string | null }>(
  row: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = row;
  return rest;
}

/** Дата события для письма о модерации: «22 мая 2026, 10:00». */
function formatModerationDate(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tashkent',
  });
}

/** Понедельник ISO-недели даты (00:00 UTC) — согласовано с date_trunc('week'). */
function startOfIsoWeek(date: Date): Date {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() - ((day + 6) % 7));
  return utc;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly blogService: BlogService,
    private readonly adminAudit: AdminAuditService,
    private readonly eventCredits: EventCreditsService,
    private readonly notifications: NotificationsService,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly moderationChain: ModerationChainService,
    private readonly registrationChain: RegistrationChainService,
  ) {}

  async createSuperAdmin(
    dto: CreateSuperAdminDto,
  ): Promise<Omit<SuperAdmin, 'passwordHash'>> {
    const existing = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Администратор с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const created = await this.prisma.superAdmin.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    // Никогда не возвращаем bcrypt-хеш пароля в ответе API.
    return stripPasswordHash(created);
  }

  async provisionOrganization(
    dto: ProvisionOrganizationDto,
    actor: { id: string; email?: string | null },
  ): Promise<ProvisionOrganizationResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const [existingOrganization, existingUser] = await Promise.all([
      this.prisma.organization.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);
    if (existingOrganization || existingUser) {
      throw new ConflictException({
        code: 'ORGANIZATION_PROVISIONING_RECONCILIATION_REQUIRED',
        message: 'Email недоступен для автоматического provisioning',
      });
    }

    return this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            email,
            name: dto.organizationName,
            companyName: dto.companyName ?? dto.organizationName,
            inn: dto.inn,
            description: dto.description,
            authProvider: AuthProvider.EMAIL,
            isEmailVerified: false,
            isOnboardingCompleted: false,
          },
        });

        const permissions = await tx.permission.findMany();
        const permissionIds = new Map(
          permissions.map((permission) => [permission.code, permission.id]),
        );
        const roleIds = new Map<string, string>();

        for (const [roleKey, roleDefinition] of Object.entries(DEFAULT_ROLES)) {
          const role = await tx.organizationRole.create({
            data: {
              organizationId: organization.id,
              name: roleDefinition.name,
              isSystem: roleKey === 'OWNER',
            },
          });
          roleIds.set(roleKey, role.id);

          const rolePermissions = roleDefinition.permissions.flatMap((code) => {
            const permissionId = permissionIds.get(code);
            return permissionId ? [{ roleId: role.id, permissionId }] : [];
          });
          if (rolePermissions.length > 0) {
            await tx.rolePermission.createMany({ data: rolePermissions });
          }
        }

        const account = await tx.account.create({
          data: {
            email,
            displayName: dto.organizationName,
            identities: {
              create: {
                email,
                provider: AuthProvider.EMAIL,
                actorType: UserType.ORGANIZATION,
                actorId: organization.id,
              },
            },
          },
        });

        const ownerPermissions = DEFAULT_ROLES.OWNER.permissions.filter(
          (code) => permissionIds.has(code),
        );
        const membership = await tx.membership.create({
          data: {
            accountId: account.id,
            organizationId: organization.id,
            kind: MembershipKind.OWNER,
            roleId: roleIds.get('OWNER'),
            roleName: 'OWNER',
            permissions: ownerPermissions,
          },
        });

        await this.adminAudit.record(
          {
            action: 'ORGANIZATION_PROVISIONED',
            actorId: actor.id,
            actorEmail: actor.email,
            targetType: 'ORGANIZATION',
            targetId: organization.id,
            targetLabel: organization.name,
            extra: {
              accountId: account.id,
              membershipId: membership.id,
              ownerRoleId: roleIds.get('OWNER') ?? null,
              setupRequired: true,
              personalScopeEnabled: false,
            },
          },
          tx,
        );

        return {
          organizationId: organization.id,
          accountId: account.id,
          membershipId: membership.id,
          setupRequired: true as const,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // Методы для управления системой

  /** active → deletedAt null; archived → deletedAt set; all → без фильтра. */
  private resolveStatus(
    status: string | undefined,
    includeDeleted: boolean | undefined,
  ): AdminRecordStatus {
    return resolveAdminRecordStatus(status, includeDeleted);
  }

  /** id супер-админа → его имя (для колонки «кто архивировал»). */
  private async resolveAdminNames(
    adminIds: Array<string | null | undefined>,
  ): Promise<Map<string, string>> {
    const ids = [...new Set(adminIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return new Map();
    const admins = await this.prisma.superAdmin.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(admins.map((a) => [a.id, a.name]));
  }

  /**
   * userId → { организация, роль } по первому членству
   * (через Identity→Account→Membership). Публичный, потому что теми же
   * колонками пользуется выгрузка пользователей в XLSX.
   */
  async resolveUserOrgRoles(
    userIds: string[],
  ): Promise<
    Map<string, { organizationName: string | null; roleName: string | null }>
  > {
    const result = new Map<
      string,
      { organizationName: string | null; roleName: string | null }
    >();
    if (userIds.length === 0) return result;

    const identities = await this.prisma.identity.findMany({
      where: { actorType: UserType.USER, actorId: { in: userIds } },
      select: { actorId: true, accountId: true },
    });
    const userToAccount = new Map(
      identities.map((i) => [i.actorId, i.accountId]),
    );
    const accountIds = [...new Set(identities.map((i) => i.accountId))];
    if (accountIds.length === 0) return result;

    const memberships = await this.prisma.membership.findMany({
      where: { accountId: { in: accountIds } },
      select: {
        accountId: true,
        roleName: true,
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const accountToMembership = new Map<
      string,
      { organizationName: string | null; roleName: string | null }
    >();
    for (const m of memberships) {
      if (!accountToMembership.has(m.accountId)) {
        accountToMembership.set(m.accountId, {
          organizationName: m.organization?.name ?? null,
          roleName: m.roleName ?? null,
        });
      }
    }
    for (const userId of userIds) {
      const accountId = userToAccount.get(userId);
      const membership = accountId
        ? accountToMembership.get(accountId)
        : undefined;
      result.set(
        userId,
        membership ?? { organizationName: null, roleName: null },
      );
    }
    return result;
  }

  async getAllUsers(query: AdminUsersQueryDto): Promise<{
    data: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = buildAdminUsersWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const [adminNames, orgRoles] = await Promise.all([
      this.resolveAdminNames(data.map((u) => u.archivedById)),
      this.resolveUserOrgRoles(data.map((u) => u.id)),
    ]);

    const enriched: AdminUserListItem[] = data.map((u) => ({
      ...stripPasswordHash(u),
      archivedByName: u.archivedById
        ? (adminNames.get(u.archivedById) ?? null)
        : null,
      organizationName: orgRoles.get(u.id)?.organizationName ?? null,
      roleName: orgRoles.get(u.id)?.roleName ?? null,
    }));

    return { data: enriched, total, page, limit };
  }

  async getAllOrganizations(query: AdminOrganizationsQueryDto): Promise<{
    data: AdminOrganizationListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      verificationStatus,
      status: statusParam,
    } = query;
    const status = this.resolveStatus(statusParam, undefined);
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { inn: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(verificationStatus && { verificationStatus }),
      ...(status === 'active'
        ? { deletedAt: null }
        : status === 'archived'
          ? { deletedAt: { not: null } }
          : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true, events: true } } },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const adminNames = await this.resolveAdminNames(
      data.map((o) => o.archivedById),
    );

    const enriched: AdminOrganizationListItem[] = data.map((o) => ({
      ...stripPasswordHash(o),
      archivedByName: o.archivedById
        ? (adminNames.get(o.archivedById) ?? null)
        : null,
    }));

    return { data: enriched, total, page, limit };
  }

  async getAllEvents(
    query: AdminEventsQueryDto,
  ): Promise<{ data: Event[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      format,
      type,
      organizationId,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(format && { format }),
      ...(type && { type }),
      ...(organizationId && { organizationId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
              verificationStatus: true,
            },
          },
          _count: { select: { registrations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ==================== HARD DELETE (необратимое удаление) ====================

  /**
   * Записывает неизменяемую запись в журнал опасных действий.
   * Вызывается внутри той же транзакции, что и само удаление, чтобы запись и
   * удаление были атомарны. Делегирует общему AdminAuditService (S-12);
   * формат metadata сохранён 1:1 (extra раскладывается на верхний уровень).
   */
  private async writeAuditLog(
    tx: Prisma.TransactionClient,
    entry: {
      action: LegacyAdminAuditAction;
      actorId: string;
      actorEmail?: string | null;
      targetType: 'USER' | 'ORGANIZATION';
      targetId: string;
      targetLabel?: string | null;
      metadata?: Record<string, Prisma.InputJsonValue | null>;
    },
  ): Promise<void> {
    await this.adminAudit.record(
      {
        action: entry.action,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel,
        extra: entry.metadata,
      },
      tx,
    );
  }

  /**
   * Фиксирует факт выгрузки персональных данных пользователей в XLSX.
   *
   * Мутации нет, поэтому запись идёт вне транзакции: сам аудит и есть событие.
   * В metadata — только состав выгрузки (сколько строк, какие колонки, какой
   * фильтр), никаких PII: кто именно попал в файл, восстанавливается по
   * фильтру и времени.
   */
  async recordUsersExport(
    actor: { id: string; email?: string | null },
    details: {
      total: number;
      fields?: string[];
      status?: string;
    },
  ): Promise<void> {
    await this.adminAudit.record({
      action: 'USERS_EXPORT',
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'PLATFORM',
      targetId: PLATFORM_TARGET_ID,
      targetLabel: 'users',
      extra: {
        rows: details.total,
        fields: details.fields ?? null,
        status: details.status ?? 'active',
      },
    });
  }

  /**
   * Инвалидирует все активные сессии и удаляет «осиротевшие» учётные данные для
   * набора акторов (actorType, actorId).
   *
   * RefreshToken/Identity/Account не имеют внешних ключей на
   * User/Organization/OrganizationMember, поэтому каскад БД их НЕ затрагивает —
   * снимаем их вручную в той же транзакции. Аккаунт удаляется только если у него
   * не осталось других идентичностей (бережём унифицированные аккаунты).
   */
  private async purgeAuthForActors(
    tx: Prisma.TransactionClient,
    actors: Array<{ actorType: UserType; actorId: string }>,
  ): Promise<void> {
    if (actors.length === 0) return;

    const identities = await tx.identity.findMany({
      where: {
        OR: actors.map((a) => ({
          actorType: a.actorType,
          actorId: a.actorId,
        })),
      },
      select: { id: true, accountId: true },
    });
    if (identities.length === 0) return;

    const accountIds = [...new Set(identities.map((i) => i.accountId))];

    // 1. Завершаем активные сессии (refresh tokens) затронутых аккаунтов.
    await tx.refreshToken.deleteMany({
      where: { accountId: { in: accountIds } },
    });

    // 2. Удаляем сами идентичности удаляемых акторов.
    await tx.identity.deleteMany({
      where: { id: { in: identities.map((i) => i.id) } },
    });

    // 3. Удаляем аккаунты без оставшихся идентичностей (каскад уберёт прочие
    //    memberships / grants / refresh tokens этих аккаунтов).
    for (const accountId of accountIds) {
      const remaining = await tx.identity.count({ where: { accountId } });
      if (remaining === 0) {
        await tx.account.delete({ where: { id: accountId } });
      }
    }
  }

  /**
   * Только инвалидирует активные сессии (refresh tokens) акторов, НЕ удаляя
   * Identity/Account. Используется при архивации: данные сохраняются, но войти
   * нельзя. Identity/Account/RefreshToken не имеют FK на актора, поэтому делаем
   * это вручную.
   */
  private async invalidateSessionsForActors(
    tx: Prisma.TransactionClient,
    actors: Array<{ actorType: UserType; actorId: string }>,
  ): Promise<void> {
    if (actors.length === 0) return;

    const identities = await tx.identity.findMany({
      where: {
        OR: actors.map((a) => ({
          actorType: a.actorType,
          actorId: a.actorId,
        })),
      },
      select: { accountId: true },
    });
    if (identities.length === 0) return;

    const accountIds = [...new Set(identities.map((i) => i.accountId))];
    await tx.refreshToken.deleteMany({
      where: { accountId: { in: accountIds } },
    });
  }

  // ==================== АРХИВАЦИЯ / ВОССТАНОВЛЕНИЕ ====================
  // Архивация = soft delete (deletedAt). Данные сохраняются, вход блокируется,
  // запись восстановима. Hard delete доступен только для архивированных.

  /**
   * Архивирует (деактивирует) пользователя. Данные не удаляются, сессии
   * завершаются, вход блокируется. Восстановимо через restoreUser.
   */
  async archiveUser(
    userId: string,
    actor: { id: string; email?: string | null },
    reason?: string | null,
  ): Promise<{ success: true; userId: string }> {
    if (actor.id === userId) {
      throw new BadRequestException(
        'Нельзя архивировать собственную учётную запись',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (user.deletedAt) {
      throw new BadRequestException('Пользователь уже архивирован');
    }

    await this.ensureUserNotSuperAdminLinked(userId, 'архивировать');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          archivedById: actor.id,
          archiveReason: reason ?? null,
        },
      });
      await this.invalidateSessionsForActors(tx, [
        { actorType: UserType.USER, actorId: userId },
      ]);
      await this.writeAuditLog(tx, {
        action: 'ARCHIVE_USER',
        actorId: actor.id,
        actorEmail: actor.email,
        targetType: 'USER',
        targetId: userId,
        targetLabel: user.email,
        metadata: { reason: reason ?? null },
      });
    });

    return { success: true, userId };
  }

  /**
   * Восстанавливает архивированного пользователя в active state.
   */
  async restoreUser(
    userId: string,
    actor: { id: string; email?: string | null },
  ): Promise<{ success: true; userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!user.deletedAt) {
      throw new BadRequestException('Пользователь не архивирован');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: null, archivedById: null, archiveReason: null },
      });
      await this.writeAuditLog(tx, {
        action: 'RESTORE_USER',
        actorId: actor.id,
        actorEmail: actor.email,
        targetType: 'USER',
        targetId: userId,
        targetLabel: user.email,
        metadata: {},
      });
    });

    return { success: true, userId };
  }

  /**
   * Архивирует (деактивирует) организацию. Данные не удаляются; сессии
   * организации и всех её сотрудников завершаются, вход блокируется.
   */
  async archiveOrganization(
    orgId: string,
    actor: { id: string; email?: string | null },
    reason?: string | null,
  ): Promise<{ success: true; organizationId: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }
    if (org.deletedAt) {
      throw new BadRequestException('Организация уже архивирована');
    }

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const actors = [
      { actorType: UserType.ORGANIZATION, actorId: orgId },
      ...members.map((m) => ({ actorType: UserType.MEMBER, actorId: m.id })),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: {
          deletedAt: new Date(),
          archivedById: actor.id,
          archiveReason: reason ?? null,
        },
      });
      await this.invalidateSessionsForActors(tx, actors);
      await this.writeAuditLog(tx, {
        action: 'ARCHIVE_ORGANIZATION',
        actorId: actor.id,
        actorEmail: actor.email,
        targetType: 'ORGANIZATION',
        targetId: orgId,
        targetLabel: org.name,
        metadata: { reason: reason ?? null, members: members.length },
      });
    });

    return { success: true, organizationId: orgId };
  }

  /**
   * Восстанавливает архивированную организацию в SUSPENDED. Возобновление
   * запросов, приглашений и фоновых эффектов требует отдельного решения.
   */
  async restoreOrganization(
    orgId: string,
    actor: { id: string; email?: string | null },
  ): Promise<{ success: true; organizationId: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }
    if (!org.deletedAt) {
      throw new BadRequestException('Организация не архивирована');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: orgId },
        data: {
          deletedAt: null,
          archivedById: null,
          archiveReason: null,
          suspendedAt: new Date(),
          suspendedById: actor.id,
          suspendedReason: 'RESTORED_PENDING_REACTIVATION',
        },
      });
      await this.writeAuditLog(tx, {
        action: 'RESTORE_ORGANIZATION',
        actorId: actor.id,
        actorEmail: actor.email,
        targetType: 'ORGANIZATION',
        targetId: orgId,
        targetLabel: org.name,
        metadata: {},
      });
    });

    return { success: true, organizationId: orgId };
  }

  /**
   * Бросает 400, если аккаунт пользователя связан с супер-админом
   * (унифицированный аккаунт) — такие записи нельзя архивировать/удалять этим
   * путём, чтобы не потерять последнего платформенного администратора.
   */
  private async ensureUserNotSuperAdminLinked(
    userId: string,
    verb: 'архивировать' | 'удалить',
  ): Promise<void> {
    const identity = await this.prisma.identity.findUnique({
      where: {
        actorType_actorId: { actorType: UserType.USER, actorId: userId },
      },
      select: { accountId: true },
    });
    if (!identity) return;
    const adminGrants = await this.prisma.platformAdminGrant.count({
      where: { accountId: identity.accountId },
    });
    if (adminGrants > 0) {
      throw new BadRequestException(
        `Нельзя ${verb} пользователя, связанного с супер-админом`,
      );
    }
  }

  /**
   * Необратимо удаляет пользователя (hard delete).
   * - запрещает self-delete;
   * - запрещает удаление аккаунта, связанного с супер-админом;
   * - инвалидирует сессии/refresh tokens;
   * - удаляет данные транзакционно (каскад БД: регистрации, комментарии и т.д.,
   *   связи-истории помечены SetNull и сохраняются);
   * - пишет audit log.
   */
  async hardDeleteUser(
    userId: string,
    actor: { id: string; email?: string | null },
  ): Promise<{ success: true; userId: string; email: string }> {
    if (actor.id === userId) {
      throw new BadRequestException(
        'Нельзя удалить собственную учётную запись',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Hard delete доступен только для архивированных записей.
    if (!user.deletedAt) {
      throw new BadRequestException('Сначала архивируйте пользователя');
    }

    // Защита платформенных администраторов (последний супер-админ).
    await this.ensureUserNotSuperAdminLinked(userId, 'удалить');

    // BL-07/OQ-22: accountId — ДО purge (Identity/Account будут удалены в tx).
    const identity = await this.prisma.identity.findUnique({
      where: {
        actorType_actorId: { actorType: UserType.USER, actorId: userId },
      },
      select: { accountId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (identity) {
        // Журнал уведомлений: снять pending-план и ещё-не-отправленные
        // доставки, анонимизировать payload (payload → {}). Строки НЕ
        // удаляются — журнал доставок переживает hard-delete, персоналии нет.
        await this.notificationDispatcher.cancelBy({
          accountId: identity.accountId,
          reason: 'account_hard_deleted',
          tx,
        });
        await this.notificationDispatcher.anonymizeAccountJournal(
          identity.accountId,
          tx,
        );
      }
      await this.purgeAuthForActors(tx, [
        { actorType: UserType.USER, actorId: userId },
      ]);
      // Чистим возможные коды верификации, чтобы email/идентичность ничего не
      // удерживало — после hard delete пользователь может зарегистрироваться
      // заново с тем же email.
      await tx.emailVerificationCode.deleteMany({
        where: { OR: [{ actorId: userId }, { email: user.email }] },
      });
      await tx.user.delete({ where: { id: userId } });
      await this.writeAuditLog(tx, {
        action: 'USER_HARD_DELETE',
        actorId: actor.id,
        actorEmail: actor.email,
        targetType: 'USER',
        targetId: userId,
        targetLabel: user.email,
        metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    });

    return { success: true, userId, email: user.email };
  }

  /**
   * Возвращает сводку зависимостей организации для подтверждающего диалога.
   */
  async getOrganizationDeletePreview(
    orgId: string,
  ): Promise<OrganizationDeletePreviewDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    const byOrg = { organizationId: orgId };
    const byEvent = { event: { organizationId: orgId } };

    const [
      members,
      linkedAccounts,
      invites,
      roles,
      events,
      registrations,
      certificates,
      tickets,
      badgeTemplates,
      fileUploads,
      boards,
      blogPosts,
      rentalPlaces,
      followers,
      billingRecords,
    ] = await this.prisma.$transaction([
      this.prisma.organizationMember.count({ where: byOrg }),
      this.prisma.membership.count({ where: byOrg }),
      this.prisma.organizationInvite.count({ where: byOrg }),
      this.prisma.organizationRole.count({ where: byOrg }),
      this.prisma.event.count({ where: byOrg }),
      this.prisma.registration.count({ where: byEvent }),
      this.prisma.certificate.count({ where: byEvent }),
      this.prisma.ticketArtifact.count({
        where: { registration: { event: { organizationId: orgId } } },
      }),
      this.prisma.badgeTemplate.count({ where: byEvent }),
      this.prisma.registrationFileUpload.count({ where: byEvent }),
      this.prisma.board.count({ where: byOrg }),
      this.prisma.blogPost.count({ where: byOrg }),
      this.prisma.rentalPlace.count({ where: byOrg }),
      this.prisma.userFollowing.count({ where: byOrg }),
      this.prisma.revenueEntry.count({ where: { organizationRef: orgId } }),
    ]);

    return {
      organizationId: org.id,
      name: org.name,
      email: org.email,
      members,
      linkedAccounts,
      invites,
      roles,
      events,
      registrations,
      certificates,
      tickets,
      badgeTemplates,
      fileUploads,
      boards,
      blogPosts,
      rentalPlaces,
      followers,
      // D-16: строки выручки (RevenueEntry) FK-less и переживают hard delete —
      // счётчик информирует оператора, сколько финансовой истории останется.
      billingRecords,
    };
  }

  /**
   * Compatibility entry point. Organization hard delete is a sticky policy
   * denial; archival is the only supported destructive lifecycle operation.
   */
  async hardDeleteOrganization(
    orgId: string,
    actor: { id: string; email?: string | null },
    confirmation: string,
  ): Promise<{ success: true; organizationId: string; name: string }> {
    void orgId;
    void actor;
    void confirmation;
    throw new ForbiddenException(
      POLICY_DENIALS.ORGANIZATION_HARD_DELETE_DISABLED,
    );
  }

  /**
   * Удаляет событие (soft delete супер-админом)
   */
  async deleteEvent(
    eventId: string,
    adminId: string,
    reason?: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.deletedAt) {
      throw new BadRequestException('Мероприятие уже удалено');
    }
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
        deletedBySuperAdminId: adminId,
        deletionReason: reason ?? null,
      },
    });
  }

  /**
   * Удаляет статью блога (soft delete супер-админом)
   */
  async deleteBlogPost(
    postId: string,
    adminId: string,
    reason?: string,
  ): Promise<void> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Статья не найдена');
    }
    if (post.deletedAt) {
      throw new BadRequestException('Статья уже удалена');
    }
    await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        deletedBySuperAdminId: adminId,
        deletionReason: reason ?? null,
      },
    });
  }

  // ==================== ПОЛУЧЕНИЕ ПО ID ====================

  /**
   * Получает пользователя по ID
   */
  /**
   * Пользователь по ID + агрегаты для детальной страницы админа
   * (регистрации по статусам, посещённые события, сертификаты, членства).
   */
  async getUserById(
    userId: string,
  ): Promise<SafeUser & { stats: AdminUserStats }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const [
      registrationGroups,
      attendedEvents,
      certificatesCount,
      eventCommentsCount,
      followingCount,
      memberships,
    ] = await Promise.all([
      this.prisma.registration.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.registration.count({
        where: { userId, attendances: { some: {} } },
      }),
      this.prisma.certificate.count({
        where: { registration: { userId }, isCurrent: true },
      }),
      this.prisma.eventComment.count({ where: { userId } }),
      this.prisma.userFollowing.count({ where: { userId } }),
      this.resolveUserMemberships(userId),
    ]);

    const registrationsByStatus: Record<RegistrationStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const group of registrationGroups) {
      registrationsByStatus[group.status] = group._count._all;
    }

    return {
      ...stripPasswordHash(user),
      stats: {
        registrationsByStatus,
        attendedEvents,
        certificatesCount,
        eventCommentsCount,
        followingCount,
        memberships,
      },
    };
  }

  /** Все членства пользователя (через Identity → Account → Membership). */
  private async resolveUserMemberships(
    userId: string,
  ): Promise<AdminUserStats['memberships']> {
    const identities = await this.prisma.identity.findMany({
      where: { actorType: UserType.USER, actorId: userId },
      select: { accountId: true },
    });
    const accountIds = [...new Set(identities.map((i) => i.accountId))];
    if (accountIds.length === 0) return [];

    const memberships = await this.prisma.membership.findMany({
      where: { accountId: { in: accountIds } },
      select: {
        roleName: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      organizationId: m.organization?.id ?? m.organizationId ?? null,
      organizationName: m.organization?.name ?? null,
      roleName: m.roleName ?? null,
    }));
  }

  /**
   * Получает организацию по ID
   */
  /**
   * Организация по ID + агрегаты для детальной страницы админа
   * (события по статусам, регистрации, блог, подписчики, команда).
   */
  async getOrganizationById(orgId: string): Promise<
    SafeOrganization & {
      _count: { members: number; events: number };
      stats: AdminOrganizationStats;
    }
  > {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true, events: true } },
      },
    });
    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    const [
      eventStatusGroups,
      totalRegistrations,
      blogPostsTotal,
      blogPostsPublished,
      followersCount,
      members,
      membersTotal,
    ] = await Promise.all([
      this.prisma.event.groupBy({
        by: ['status'],
        where: { organizationId: orgId, deletedAt: null },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.registration.count({
        where: { event: { organizationId: orgId } },
      }),
      this.prisma.blogPost.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      this.prisma.blogPost.count({
        where: {
          organizationId: orgId,
          status: BlogPostStatus.PUBLISHED,
          deletedAt: null,
        },
      }),
      this.prisma.userFollowing.count({ where: { organizationId: orgId } }),
      this.prisma.organizationMember.findMany({
        where: { organizationId: orgId, deletedAt: null },
        take: 10,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          position: true,
          avatarUrl: true,
          status: true,
          role: { select: { name: true } },
        },
      }),
      this.prisma.organizationMember.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
    ]);

    const eventsByStatus: Record<EventStatus, number> = {
      DRAFT: 0,
      PENDING_REVIEW: 0,
      PUBLISHED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    let totalEvents = 0;
    for (const group of eventStatusGroups) {
      eventsByStatus[group.status] = group._count._all;
      totalEvents += group._count._all;
    }

    return {
      ...stripPasswordHash(org),
      stats: {
        eventsByStatus,
        totalEvents,
        totalRegistrations,
        blogPostsTotal,
        blogPostsPublished,
        followersCount,
        members: members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          position: m.position,
          avatarUrl: m.avatarUrl,
          roleName: m.role?.name ?? '',
          status: m.status,
        })),
        membersTotal,
      },
    };
  }

  /**
   * Получает событие по ID + агрегаты для детальной страницы админа
   * (разбивка регистраций по статусам, чек-ины, сертификаты, комментарии).
   */
  async getEventById(
    eventId: string,
  ): Promise<Event & { stats: AdminEventStats }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            verificationStatus: true,
          },
        },
        speakers: { orderBy: { sortOrder: 'asc' } },
        agendaItems: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        _count: { select: { registrations: true } },
      },
    });
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    const [
      registrationGroups,
      checkedInParticipants,
      certificatesIssued,
      commentsCount,
      questionsCount,
    ] = await Promise.all([
      this.prisma.registration.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.registration.count({
        where: { eventId, attendances: { some: {} } },
      }),
      this.prisma.certificate.count({
        where: { eventId, isCurrent: true },
      }),
      this.prisma.eventComment.count({ where: { eventId } }),
      this.prisma.registrationQuestion.count({ where: { eventId } }),
    ]);

    const registrationsByStatus: Record<RegistrationStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const group of registrationGroups) {
      registrationsByStatus[group.status] = group._count._all;
    }

    return {
      ...event,
      stats: {
        registrationsByStatus,
        checkedInParticipants,
        certificatesIssued,
        commentsCount,
        questionsCount,
      },
    };
  }

  // ==================== ОБНОВЛЕНИЕ ПО ID (без изменения статуса) ====================

  /**
   * Обновляет пользователя (без изменения статуса)
   */
  async updateUser(userId: string, dto: AdminUpdateUserDto): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверка уникальности email при изменении
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return stripPasswordHash(updated);
  }

  /**
   * Обновляет организацию (без изменения verificationStatus)
   */
  async updateOrganization(
    orgId: string,
    dto: AdminUpdateOrganizationDto,
  ): Promise<SafeOrganization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    // Проверка уникальности email при изменении
    if (dto.email && dto.email !== org.email) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { email: dto.email },
      });
      if (existingOrg) {
        throw new ConflictException('Организация с таким email уже существует');
      }
    }

    // Проверка уникальности ИНН при изменении
    if (dto.inn && dto.inn !== org.inn) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: { inn: dto.inn },
      });
      if (existingOrg) {
        throw new ConflictException('Организация с таким ИНН уже существует');
      }
    }

    const data: Prisma.OrganizationUpdateInput = {
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.name !== undefined || dto.translations !== undefined
        ? {
            name: pickFallbackTranslation(
              dto.translations,
              'name',
              dto.name ?? org.name,
            ),
          }
        : {}),
      ...(dto.companyName !== undefined || dto.translations !== undefined
        ? {
            companyName: pickFallbackTranslation(
              dto.translations,
              'companyName',
              dto.companyName ?? org.companyName,
            ),
          }
        : {}),
      ...(dto.inn !== undefined && { inn: dto.inn }),
      ...(dto.description !== undefined || dto.translations !== undefined
        ? {
            description:
              pickFallbackTranslation(
                dto.translations,
                'description',
                dto.description ?? org.description,
              ) || null,
          }
        : {}),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.isEmailVerified !== undefined && {
        isEmailVerified: dto.isEmailVerified,
      }),
      ...(dto.placesFeatureEnabled !== undefined && {
        placesFeatureEnabled: dto.placesFeatureEnabled,
      }),
      ...(dto.translations !== undefined && {
        translations: dto.translations as Prisma.InputJsonValue,
      }),
      ...(dto.translationMeta !== undefined && {
        translationMeta: dto.translationMeta as Prisma.InputJsonValue,
      }),
    };

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data,
      include: { _count: { select: { members: true, events: true } } },
    });
    return stripPasswordHash(updated);
  }

  /**
   * Обновляет событие (без изменения status)
   */
  async updateEvent(eventId: string, dto: AdminUpdateEventDto): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.deletedAt) {
      throw new BadRequestException(
        'Нельзя редактировать удалённое мероприятие',
      );
    }

    const title =
      dto.title !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'title',
            dto.title ?? event.title,
          )
        : undefined;
    const shortDescription =
      dto.shortDescription !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'shortDescription',
            dto.shortDescription ?? event.shortDescription,
          )
        : undefined;

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(title !== undefined && { title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(shortDescription !== undefined && {
          shortDescription: shortDescription || null,
        }),
        ...(dto.translations !== undefined && {
          translations: dto.translations as Prisma.InputJsonValue,
        }),
        ...(dto.translationMeta !== undefined && {
          translationMeta: dto.translationMeta as Prisma.InputJsonValue,
        }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.accessType !== undefined && { accessType: dto.accessType }),
        ...(dto.format !== undefined && { format: dto.format }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.placeId !== undefined && { placeId: dto.placeId }),
        ...(dto.onlineUrl !== undefined && { onlineUrl: dto.onlineUrl }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.maxParticipants !== undefined && {
          maxParticipants: dto.maxParticipants,
        }),
        ...(dto.commentsEnabled !== undefined && {
          commentsEnabled: dto.commentsEnabled,
        }),
        ...(dto.rejectionReason !== undefined && {
          rejectionReason: dto.rejectionReason,
        }),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : undefined,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            verificationStatus: true,
          },
        },
        _count: { select: { registrations: true } },
      },
    });
  }

  async getSystemStats(): Promise<SystemStats> {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // 12 ISO-недель включая текущую (понедельник — начало недели, как date_trunc('week'))
    const growthSince = startOfIsoWeek(
      new Date(now.getTime() - 11 * 7 * 24 * 60 * 60 * 1000),
    );

    const [
      totalUsers,
      totalOrganizations,
      totalMembers,
      pendingOrganizations,
      pendingEvents,
      pendingBlogPosts,
      archivedUsers,
      archivedOrganizations,
      totalRegistrations,
      totalBlogPosts,
      publishedBlogPosts,
      newUsers7d,
      newUsers30d,
      newOrganizations30d,
      newRegistrations7d,
      newRegistrations30d,
      newEvents30d,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.organizationMember.count(),
      this.prisma.organization.count({
        where: {
          verificationStatus: OrganizationVerificationStatus.PENDING,
          deletedAt: null,
        },
      }),
      this.prisma.event.count({
        where: { status: EventStatus.PENDING_REVIEW, deletedAt: null },
      }),
      this.prisma.blogPost.count({
        where: { status: BlogPostStatus.PENDING_REVIEW, deletedAt: null },
      }),
      this.prisma.user.count({ where: { deletedAt: { not: null } } }),
      this.prisma.organization.count({ where: { deletedAt: { not: null } } }),
      this.prisma.registration.count(),
      this.prisma.blogPost.count({ where: { deletedAt: null } }),
      this.prisma.blogPost.count({
        where: { status: BlogPostStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.registration.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.registration.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.event.count({
        where: { createdAt: { gte: d30 }, deletedAt: null },
      }),
    ]);

    const [usersWeekly, registrationsWeekly, eventsWeekly, eventStatusGroups] =
      await Promise.all([
        this.countByIsoWeek('users', growthSince),
        this.countByIsoWeek('registrations', growthSince),
        this.countByIsoWeek('events', growthSince),
        this.prisma.event.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
      ]);

    const growth: SystemStatsGrowthPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(
        growthSince.getTime() + i * 7 * 24 * 60 * 60 * 1000,
      );
      const key = toDateKey(weekStart);
      growth.push({
        weekStart: key,
        users: usersWeekly.get(key) ?? 0,
        registrations: registrationsWeekly.get(key) ?? 0,
        events: eventsWeekly.get(key) ?? 0,
      });
    }

    const eventsByStatus: Record<EventStatus, number> = {
      DRAFT: 0,
      PENDING_REVIEW: 0,
      PUBLISHED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    let totalEvents = 0;
    for (const group of eventStatusGroups) {
      eventsByStatus[group.status] = group._count._all;
      totalEvents += group._count._all;
    }

    const [queueOrganizations, queueEvents, queueBlogPosts] = await Promise.all(
      [
        this.prisma.organization.findMany({
          where: {
            verificationStatus: OrganizationVerificationStatus.PENDING,
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
          select: { id: true, name: true, createdAt: true },
        }),
        this.prisma.event.findMany({
          where: { status: EventStatus.PENDING_REVIEW, deletedAt: null },
          orderBy: { updatedAt: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            createdAt: true,
            startDate: true,
            organization: { select: { name: true } },
          },
        }),
        this.prisma.blogPost.findMany({
          where: { status: BlogPostStatus.PENDING_REVIEW, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            createdAt: true,
            organization: { select: { name: true } },
          },
        }),
      ],
    );

    return {
      totalUsers,
      totalOrganizations,
      totalMembers,
      pendingOrganizations,
      pendingEvents,
      pendingBlogPosts,
      archivedUsers,
      archivedOrganizations,
      totalEvents,
      eventsByStatus,
      totalRegistrations,
      totalBlogPosts,
      publishedBlogPosts,
      newUsers7d,
      newUsers30d,
      newOrganizations30d,
      newRegistrations7d,
      newRegistrations30d,
      newEvents30d,
      growth,
      moderationQueue: {
        organizations: queueOrganizations.map((org) => ({
          id: org.id,
          title: org.name,
          organizationName: null,
          createdAt: org.createdAt,
        })),
        events: queueEvents.map((event) => ({
          id: event.id,
          title: event.title,
          organizationName: event.organization?.name ?? null,
          createdAt: event.createdAt,
          startDate: event.startDate,
        })),
        blogPosts: queueBlogPosts.map((post) => ({
          id: post.id,
          title: post.title,
          organizationName: post.organization?.name ?? null,
          createdAt: post.createdAt,
        })),
      },
    };
  }

  /**
   * Кол-во строк таблицы по ISO-неделям создания начиная с `since`.
   * Таблица подставляется из белого списка, значения — параметризованы.
   */
  private async countByIsoWeek(
    table: 'users' | 'registrations' | 'events',
    since: Date,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<{ week: Date; count: bigint }[]>(
      Prisma.sql`
        SELECT date_trunc('week', created_at) AS week, count(*) AS count
        FROM ${Prisma.raw(`"${table}"`)}
        WHERE created_at >= ${since}
        GROUP BY 1
      `,
    );
    return new Map(rows.map((row) => [toDateKey(row.week), Number(row.count)]));
  }

  // ==================== МОДЕРАЦИЯ ОРГАНИЗАЦИЙ ====================

  /**
   * Получает организации ожидающие верификации
   */
  async getPendingOrganizations(
    page = 1,
    limit = 20,
  ): Promise<{ data: SafeOrganization[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where: { verificationStatus: OrganizationVerificationStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Сначала старые заявки
        include: { _count: { select: { members: true, events: true } } },
      }),
      this.prisma.organization.count({
        where: { verificationStatus: OrganizationVerificationStatus.PENDING },
      }),
    ]);

    return { data: data.map(stripPasswordHash), total };
  }

  /**
   * Одобряет организацию
   */
  async approveOrganization(orgId: string): Promise<SafeOrganization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    if (org.verificationStatus === OrganizationVerificationStatus.APPROVED) {
      throw new BadRequestException('Организация уже одобрена');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        verificationStatus: OrganizationVerificationStatus.APPROVED,
        rejectionReason: null,
        verifiedAt: new Date(),
      },
    });

    // Верификация открывает публикацию мероприятий — организация должна
    // узнать о решении письмом, а не по факту исчезнувшей ошибки в кабинете.
    await this.mailService.sendOrganizationApproved(updated.email, {
      organizationId: updated.id,
      organizationName: updated.companyName || updated.name,
    });

    await this.notifications.emit({
      organizationId: updated.id,
      type: NotificationType.ORG_VERIFIED,
    });

    return stripPasswordHash(updated);
  }

  /**
   * Отклоняет организацию
   */
  async rejectOrganization(
    orgId: string,
    reason?: string,
  ): Promise<SafeOrganization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    if (org.verificationStatus === OrganizationVerificationStatus.REJECTED) {
      throw new BadRequestException('Организация уже отклонена');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        verificationStatus: OrganizationVerificationStatus.REJECTED,
        rejectionReason: reason || null,
        verifiedAt: null,
      },
    });

    // Отказ блокирует публикацию мероприятий — без письма организация
    // упрётся в ошибку guard'а, не зная причины.
    await this.mailService.sendOrganizationRejected(updated.email, {
      organizationId: updated.id,
      organizationName: updated.companyName || updated.name,
      reason: reason || undefined,
    });

    await this.notifications.emit({
      organizationId: updated.id,
      type: NotificationType.ORG_VERIFICATION_REJECTED,
      payload: { reason: reason ?? null },
    });

    return stripPasswordHash(updated);
  }

  // ==================== МОДЕРАЦИЯ СОБЫТИЙ ====================

  /**
   * Получает события ожидающие модерации
   */
  async getPendingEvents(
    page = 1,
    limit = 20,
  ): Promise<{ data: Event[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where: { status: EventStatus.PENDING_REVIEW, deletedAt: null },
        skip,
        take: limit,
        orderBy: { updatedAt: 'asc' }, // Сначала старые заявки
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
              verificationStatus: true,
            },
          },
        },
      }),
      this.prisma.event.count({
        where: { status: EventStatus.PENDING_REVIEW, deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  /**
   * Одобряет/публикует событие.
   * Супер-админ может опубликовать как мероприятие на модерации
   * (PENDING_REVIEW), так и черновик (DRAFT), не дожидаясь отправки на
   * рассмотрение.
   */
  async approveEvent(eventId: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (
      event.status !== EventStatus.PENDING_REVIEW &&
      event.status !== EventStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Опубликовать можно только мероприятие в статусе черновика или на модерации',
      );
    }

    // Проверяем что организация верифицирована
    if (
      event.organization.verificationStatus !==
      OrganizationVerificationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Нельзя одобрить мероприятие неверифицированной организации',
      );
    }

    const published = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.PUBLISHED,
        rejectionReason: null,
        // Отметка ПЕРВОЙ публикации: ре-модерация её не перетирает, иначе
        // «когда событие вышло в эфир» превращалось бы в «когда его одобрили
        // в последний раз».
        publishedAt: event.publishedAt ?? new Date(),
      },
    });

    // E-16: списание кредита события при ПЕРВОМ переходе в PUBLISHED.
    // Идемпотентно по unique(eventId) — повторная публикация после
    // ре-модерации бесплатна; START/выключенный энфорсмент — no-op.
    await this.eventCredits.consumeForEvent(event.organizationId, eventId);

    // Организатор обязан узнать решение модерации — письмо уходит в очередь,
    // ошибки доставки не должны ломать публикацию.
    await this.mailService.sendEventApproved(event.organization.email, {
      eventId: published.id,
      eventTitle: published.title,
      slug: published.slug,
      startDate: formatModerationDate(published.startDate),
      venue: published.venue ?? undefined,
    });

    // Цепочка 1 (MOD-05): in-app лента (тот же EVENT_PUBLISHED, теперь через
    // диспатчер с журналом) + push членам с events:update + план REM/CLS/SUM.
    // Email-плечо — sendEventApproved выше. Не бросает наружу.
    await this.moderationChain.onEventApproved(published.id);

    return published;
  }

  /**
   * Отклоняет событие (возвращает в черновик).
   * `kind` (MOD-04, аддитивно): «отклонено» и «запрошены правки» — один
   * переход PENDING_REVIEW→DRAFT, различие только в семантике уведомления.
   */
  async rejectEvent(
    eventId: string,
    reason?: string,
    kind: ModerationRejectKind = 'rejected',
  ): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.status !== EventStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Можно отклонить только мероприятие на модерации',
      );
    }

    const rejected = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.DRAFT,
        rejectionReason: reason || null,
      },
    });

    // Отказ без уведомления оставляет организатора без объяснения причины.
    await this.mailService.sendEventRejected(event.organization.email, {
      eventId: rejected.id,
      eventTitle: rejected.title,
      reason: reason || undefined,
      startDate: formatModerationDate(rejected.startDate),
      venue: rejected.venue ?? undefined,
    });

    // Цепочка 1 (MOD-04): in-app (EVENT_REJECTED | EVENT_CHANGES_REQUESTED по
    // kind) + push; SLA-таймер MOD-03 гасится внутри. Email — выше.
    await this.moderationChain.onEventRejected(
      rejected.id,
      reason ?? null,
      kind,
    );

    return rejected;
  }

  /**
   * Принудительный переход между любыми статусами для восстановления данных.
   * Мутация и audit log атомарны; expectedStatus/expectedUpdatedAt не дают
   * устаревшей вкладке перезаписать более свежее действие.
   */
  async setEventStatus(
    eventId: string,
    dto: AdminSetEventStatusDto,
    actor: { id: string; email?: string | null },
  ): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    const expectedUpdatedAt = new Date(dto.expectedUpdatedAt);
    if (
      event.status !== dto.expectedStatus ||
      event.updatedAt.getTime() !== expectedUpdatedAt.getTime()
    ) {
      throw this.eventStatusConflict(event.status, event.updatedAt);
    }

    if (event.status === dto.status) {
      throw new BadRequestException(
        'Мероприятие уже находится в выбранном статусе',
      );
    }

    const reason = dto.reason.trim();
    if (reason.length < 5) {
      throw new BadRequestException(
        'Укажите причину изменения статуса (минимум 5 символов)',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.event.updateMany({
        where: {
          id: eventId,
          deletedAt: null,
          status: dto.expectedStatus,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          status: dto.status,
          rejectionReason: dto.status === EventStatus.DRAFT ? reason : null,
          // Принудительный перевод в PUBLISHED — такая же первая публикация,
          // как и обычное одобрение (см. approveEvent).
          ...(dto.status === EventStatus.PUBLISHED && !event.publishedAt
            ? { publishedAt: new Date() }
            : {}),
        },
      });

      if (result.count !== 1) {
        throw this.eventStatusConflict();
      }

      const changed = await tx.event.findUnique({ where: { id: eventId } });
      if (!changed) {
        throw new NotFoundException('Мероприятие не найдено');
      }

      await this.adminAudit.record(
        {
          action: 'EVENT_STATUS_OVERRIDE',
          actorId: actor.id,
          actorEmail: actor.email,
          targetType: 'EVENT',
          targetId: eventId,
          targetLabel: event.title,
          reason,
          before: { status: event.status },
          after: { status: changed.status },
        },
        tx,
      );

      return changed;
    });

    await this.applyEventStatusOverrideEffects(event, updated, reason);
    return updated;
  }

  private eventStatusConflict(
    currentStatus?: EventStatus,
    currentUpdatedAt?: Date,
  ) {
    return new ConflictException({
      code: 'EVENT_STATUS_CONFLICT',
      message:
        'Мероприятие уже изменилось. Обновите страницу и повторите действие.',
      ...(currentStatus ? { currentStatus } : {}),
      ...(currentUpdatedAt
        ? { currentUpdatedAt: currentUpdatedAt.toISOString() }
        : {}),
    });
  }

  /** Синхронизирует доменные побочные эффекты с обычными lifecycle-командами. */
  private async applyEventStatusOverrideEffects(
    previous: Event & { organization: Organization },
    updated: Event,
    reason: string,
  ): Promise<void> {
    switch (updated.status) {
      case EventStatus.PUBLISHED:
        await this.eventCredits.consumeForEvent(
          previous.organizationId,
          previous.id,
        );
        await this.mailService.sendEventApproved(previous.organization.email, {
          eventId: updated.id,
          eventTitle: updated.title,
          slug: updated.slug,
          startDate: formatModerationDate(updated.startDate),
          venue: updated.venue ?? undefined,
        });
        await this.moderationChain.onEventApproved(updated.id);
        return;
      case EventStatus.CANCELLED: {
        const approvedCount = await this.prisma.registration.count({
          where: { eventId: updated.id, status: RegistrationStatus.APPROVED },
        });
        await this.eventCredits.refundForCancelledEvent(
          updated.id,
          approvedCount,
        );
        await this.registrationChain.onEventCancelled(updated.id);
        return;
      }
      case EventStatus.PENDING_REVIEW:
        await this.notificationDispatcher.cancelBy({
          eventId: updated.id,
          reason: `event-status-override:${reason}`,
        });
        await this.moderationChain.onEventSubmitted(
          updated.id,
          previous.rejectionReason,
        );
        return;
      case EventStatus.DRAFT:
      case EventStatus.COMPLETED:
        await this.notificationDispatcher.cancelBy({
          eventId: updated.id,
          reason: `event-status-override:${reason}`,
        });
        return;
    }
  }

  /**
   * Переключить статус "Топовое событие"
   */
  async toggleFeaturedEvent(eventId: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, isFeatured: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        isFeatured: !event.isFeatured, // Toggle
      },
    });
  }

  // ==================== МОДЕРАЦИЯ БЛОГ-ПОСТОВ ====================

  /**
   * Получает все блог-посты с фильтрами
   */
  async getAllBlogPosts(
    query: AdminBlogPostsQueryDto,
  ): Promise<{ data: BlogPost[]; total: number; page: number; limit: number }> {
    return this.blogService.findAllForAdmin(query);
  }

  /**
   * Получает блог-посты ожидающие модерации
   */
  async getPendingBlogPosts(
    page = 1,
    limit = 20,
  ): Promise<{ data: BlogPost[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where: { status: BlogPostStatus.PENDING_REVIEW, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Сначала старые заявки
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
              verificationStatus: true,
            },
          },
          tags: {
            include: { tag: true },
          },
        },
      }),
      this.prisma.blogPost.count({
        where: { status: BlogPostStatus.PENDING_REVIEW, deletedAt: null },
      }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Получает блог-пост по ID (для модерации)
   */
  async getBlogPostById(postId: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            verificationStatus: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Статья блога не найдена');
    }

    return post;
  }

  /**
   * Одобряет блог-пост
   */
  async approveBlogPost(postId: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: { organization: true },
    });

    if (!post) {
      throw new NotFoundException('Статья блога не найдена');
    }

    if (post.status !== BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Можно одобрить только статью на модерации',
      );
    }

    // Проверяем что организация верифицирована
    if (
      post.organization.verificationStatus !==
      OrganizationVerificationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Нельзя одобрить статью неверифицированной организации',
      );
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        status: BlogPostStatus.PUBLISHED,
        rejectionMessage: null,
        reviewedAt: new Date(),
        publishedAt: new Date(),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    // Отправляем email уведомление организатору
    await this.mailService.sendBlogPostApproved(
      updatedPost.organization.email,
      updatedPost.title,
      updatedPost.id,
    );

    return updatedPost;
  }

  /**
   * Отклоняет блог-пост
   */
  async rejectBlogPost(postId: string, message: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: { organization: true },
    });

    if (!post) {
      throw new NotFoundException('Статья блога не найдена');
    }

    if (post.status !== BlogPostStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Можно отклонить только статью на модерации',
      );
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        status: BlogPostStatus.REJECTED,
        rejectionMessage: message,
        reviewedAt: new Date(),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    // Отправляем email уведомление организатору
    await this.mailService.sendBlogPostRejected(
      updatedPost.organization.email,
      updatedPost.title,
      updatedPost.id,
      message,
    );

    return updatedPost;
  }
}
