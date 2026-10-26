import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { AdminAuditService } from '../platform/admin-audit/admin-audit.service';
import { POLICY_DENIALS } from '../../common/constants/policy-denial.constant';

/**
 * Юнит-тесты опасных действий супер-админа (hard delete).
 * Покрывают: self-delete, защиту супер-админа, user hard-delete и sticky deny
 * для необратимого удаления организации.
 */
describe('SuperAdminService — hard delete', () => {
  const ACTOR = { id: 'admin-1', email: 'admin@eventflow.uz' };

  const createPrismaMock = () => {
    const prisma: Record<string, unknown> & {
      $transaction: jest.Mock;
    } = {
      user: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: { findMany: jest.fn(), count: jest.fn() },
      identity: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      platformAdminGrant: { count: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      account: { create: jest.fn(), delete: jest.fn() },
      emailVerificationCode: { deleteMany: jest.fn() },
      superAdmin: { findMany: jest.fn() },
      membership: { count: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      permission: { findMany: jest.fn() },
      organizationRole: { count: jest.fn(), create: jest.fn() },
      rolePermission: { createMany: jest.fn() },
      organizationInvite: { count: jest.fn() },
      event: { count: jest.fn() },
      registration: { count: jest.fn() },
      certificate: { count: jest.fn() },
      ticketArtifact: { count: jest.fn() },
      badgeTemplate: { count: jest.fn() },
      registrationFileUpload: { count: jest.fn() },
      board: { count: jest.fn() },
      blogPost: { count: jest.fn() },
      rentalPlace: { count: jest.fn() },
      userFollowing: { count: jest.fn() },
      revenueEntry: { count: jest.fn().mockResolvedValue(0) },
      adminAuditLog: { create: jest.fn() },
      // Поддерживаем обе формы: callback (delete) и массив (preview counts).
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    return prisma;
  };

  const createService = (prisma = createPrismaMock()) => {
    const service = new SuperAdminService(
      prisma as never,
      {} as never, // MailService
      {} as never, // BlogService
      new AdminAuditService(prisma as never),
      {
        consumeForEvent: jest
          .fn()
          .mockResolvedValue({ consumed: false, exhausted: false }),
        refundForCancelledEvent: jest
          .fn()
          .mockResolvedValue({ refunded: false }),
      } as never, // EventCreditsService
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // NotificationsService
      {
        cancelBy: jest.fn().mockResolvedValue({ scheduled: 0, deliveries: 0 }),
        anonymizeAccountJournal: jest.fn().mockResolvedValue(0),
      } as never, // NotificationDispatcherService (BL-07)
      {
        onEventApproved: jest.fn().mockResolvedValue(undefined),
        onEventRejected: jest.fn().mockResolvedValue(undefined),
      } as never, // ModerationChainService (Батч 6б)
      { onEventCancelled: jest.fn().mockResolvedValue(undefined) } as never,
    );
    return { service, prisma };
  };

  it('provisions Organization, Account identity and OWNER membership atomically', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.create.mockResolvedValue({
      id: 'org-1',
      email: 'owner@example.com',
      name: 'Acme Events',
    });
    prisma.permission.findMany.mockResolvedValue([
      { id: 'perm-1', code: 'dashboard:view' },
    ]);
    prisma.organizationRole.create.mockImplementation(
      ({ data }: { data: { name: string } }) =>
        Promise.resolve({ id: `role-${data.name}`, name: data.name }),
    );
    prisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
    prisma.account.create.mockResolvedValue({ id: 'account-1' });
    prisma.membership.create.mockResolvedValue({ id: 'membership-1' });
    prisma.adminAuditLog.create.mockResolvedValue({});

    await expect(
      service.provisionOrganization(
        {
          email: ' Owner@Example.com ',
          organizationName: 'Acme Events',
        },
        ACTOR,
      ),
    ).resolves.toEqual({
      organizationId: 'org-1',
      accountId: 'account-1',
      membershipId: 'membership-1',
      setupRequired: true,
    });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        identities: {
          create: expect.objectContaining({
            actorType: 'ORGANIZATION',
            actorId: 'org-1',
          }),
        },
      }),
    });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 'account-1',
        organizationId: 'org-1',
        kind: 'OWNER',
      }),
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ORGANIZATION_PROVISIONED',
        actorId: ACTOR.id,
        targetId: 'org-1',
      }),
    });
    expect(prisma.user.create).toBeUndefined();
  });

  it('fails provisioning closed on an email collision without auto-linking', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.provisionOrganization(
        {
          email: 'owner@example.com',
          organizationName: 'Acme Events',
        },
        ACTOR,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ORGANIZATION_PROVISIONING_RECONCILIATION_REQUIRED',
      }),
    });
    expect(prisma.organization.create).not.toHaveBeenCalled();
    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  // ==================== hardDeleteUser ====================

  it('запрещает удаление собственной учётной записи (self-delete)', async () => {
    const { service, prisma } = createService();

    await expect(
      service.hardDeleteUser(ACTOR.id, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('бросает 404, если пользователь не найден', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.hardDeleteUser('user-1', ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('запрещает удаление пользователя, связанного с супер-админом', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'u@x.uz' });
    prisma.identity.findUnique.mockResolvedValue({ accountId: 'acc-1' });
    prisma.platformAdminGrant.count.mockResolvedValue(1);

    await expect(
      service.hardDeleteUser('user-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('блокирует hard delete не архивированного пользователя', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: null,
    });

    await expect(
      service.hardDeleteUser('user-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('удаляет архивированного пользователя: снимает сессии, чистит аккаунт + коды, пишет audit', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      firstName: 'Ann',
      lastName: 'Lee',
      deletedAt: new Date(), // уже архивирован
    });
    prisma.identity.findUnique.mockResolvedValue({ accountId: 'acc-1' });
    prisma.platformAdminGrant.count.mockResolvedValue(0);
    prisma.identity.findMany.mockResolvedValue([
      { id: 'id-1', accountId: 'acc-1' },
    ]);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    prisma.identity.deleteMany.mockResolvedValue({ count: 1 });
    prisma.identity.count.mockResolvedValue(0); // аккаунт осиротел
    prisma.account.delete.mockResolvedValue({});
    prisma.emailVerificationCode.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.delete.mockResolvedValue({});
    prisma.adminAuditLog.create.mockResolvedValue({});

    const result = await service.hardDeleteUser('user-1', ACTOR);

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { accountId: { in: ['acc-1'] } },
    });
    expect(prisma.account.delete).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
    });
    // Коды верификации удалены → email свободен для повторной регистрации.
    expect(prisma.emailVerificationCode.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ actorId: 'user-1' }, { email: 'u@x.uz' }] },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_HARD_DELETE',
          actorId: ACTOR.id,
          targetType: 'USER',
          targetId: 'user-1',
          targetLabel: 'u@x.uz',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      userId: 'user-1',
      email: 'u@x.uz',
    });
  });

  it('откатывает удаление пользователя при ошибке (audit не пишется)', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: new Date(),
    });
    prisma.identity.findUnique.mockResolvedValue(null);
    prisma.identity.findMany.mockResolvedValue([]);
    prisma.emailVerificationCode.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.delete.mockRejectedValue(new Error('db down'));

    await expect(service.hardDeleteUser('user-1', ACTOR)).rejects.toThrow(
      'db down',
    );
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  // ==================== archiveUser / restoreUser ====================

  it('архивация: запрещает self-archive', async () => {
    const { service, prisma } = createService();
    await expect(service.archiveUser(ACTOR.id, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('архивация: запрещает архивацию аккаунта, связанного с супер-админом', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: null,
    });
    prisma.identity.findUnique.mockResolvedValue({ accountId: 'acc-1' });
    prisma.platformAdminGrant.count.mockResolvedValue(1);

    await expect(service.archiveUser('user-1', ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('архивация пользователя: ставит deletedAt + archivedById, снимает сессии, пишет audit', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: null,
    });
    prisma.identity.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({});
    prisma.identity.findMany.mockResolvedValue([{ accountId: 'acc-1' }]);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
    prisma.adminAuditLog.create.mockResolvedValue({});

    const result = await service.archiveUser('user-1', ACTOR, 'спам');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          archivedById: ACTOR.id,
          archiveReason: 'спам',
        }),
      }),
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { accountId: { in: ['acc-1'] } },
    });
    // Архивация НЕ удаляет идентичности/аккаунты (данные сохраняются).
    expect(prisma.identity.deleteMany).not.toHaveBeenCalled();
    expect(prisma.account.delete).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ARCHIVE_USER' }),
      }),
    );
    expect(result).toEqual({ success: true, userId: 'user-1' });
  });

  it('восстановление: блокирует не архивированного пользователя', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: null,
    });

    await expect(service.restoreUser('user-1', ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('восстановление пользователя: сбрасывает deletedAt + метаданные, пишет audit', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@x.uz',
      deletedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({});
    prisma.adminAuditLog.create.mockResolvedValue({});

    const result = await service.restoreUser('user-1', ACTOR);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { deletedAt: null, archivedById: null, archiveReason: null },
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'RESTORE_USER' }),
      }),
    );
    expect(result).toEqual({ success: true, userId: 'user-1' });
  });

  // ==================== getOrganizationDeletePreview ====================

  it('preview: 404, если организация не найдена', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.getOrganizationDeletePreview('org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preview: возвращает реальные счётчики зависимостей', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      email: 'org@x.uz',
    });
    prisma.organizationMember.count.mockResolvedValue(4);
    prisma.membership.count.mockResolvedValue(5);
    prisma.organizationInvite.count.mockResolvedValue(2);
    prisma.organizationRole.count.mockResolvedValue(3);
    prisma.event.count.mockResolvedValue(7);
    prisma.registration.count.mockResolvedValue(120);
    prisma.certificate.count.mockResolvedValue(30);
    prisma.ticketArtifact.count.mockResolvedValue(110);
    prisma.badgeTemplate.count.mockResolvedValue(1);
    prisma.registrationFileUpload.count.mockResolvedValue(8);
    prisma.board.count.mockResolvedValue(2);
    prisma.blogPost.count.mockResolvedValue(6);
    prisma.rentalPlace.count.mockResolvedValue(0);
    prisma.userFollowing.count.mockResolvedValue(42);
    prisma.revenueEntry.count.mockResolvedValue(3);

    const preview = await service.getOrganizationDeletePreview('org-1');

    expect(preview).toEqual({
      organizationId: 'org-1',
      name: 'Acme',
      email: 'org@x.uz',
      members: 4,
      linkedAccounts: 5,
      invites: 2,
      roles: 3,
      events: 7,
      registrations: 120,
      certificates: 30,
      tickets: 110,
      badgeTemplates: 1,
      fileUploads: 8,
      boards: 2,
      blogPosts: 6,
      rentalPlaces: 0,
      followers: 42,
      billingRecords: 3,
    });
  });

  // ==================== hardDeleteOrganization ====================

  it('организация: sticky deny блокирует hard delete до любого чтения или удаления', async () => {
    const { service, prisma } = createService();

    const action = service.hardDeleteOrganization(
      'org-1',
      ACTOR,
      'DELETE Acme',
    );

    await expect(action).rejects.toBeInstanceOf(ForbiddenException);
    await expect(action).rejects.toMatchObject({
      response: POLICY_DENIALS.ORGANIZATION_HARD_DELETE_DISABLED,
    });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.organization.delete).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });

  // ==================== archive/restore organization ====================

  it('архивация организации: ставит deletedAt, снимает сессии орг+сотрудников, пишет audit', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      email: 'org@x.uz',
      deletedAt: null,
    });
    prisma.organizationMember.findMany.mockResolvedValue([{ id: 'member-1' }]);
    prisma.organization.update.mockResolvedValue({});
    prisma.identity.findMany.mockResolvedValue([
      { accountId: 'acc-org' },
      { accountId: 'acc-mem' },
    ]);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
    prisma.adminAuditLog.create.mockResolvedValue({});

    const result = await service.archiveOrganization('org-1', ACTOR, 'жалобы');

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: expect.objectContaining({
          archivedById: ACTOR.id,
          archiveReason: 'жалобы',
        }),
      }),
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { accountId: { in: ['acc-org', 'acc-mem'] } },
    });
    // Архивация НЕ удаляет данные.
    expect(prisma.organization.delete).not.toHaveBeenCalled();
    expect(prisma.identity.deleteMany).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ARCHIVE_ORGANIZATION' }),
      }),
    );
    expect(result).toEqual({ success: true, organizationId: 'org-1' });
  });

  it('архивация организации: блокирует повторную архивацию', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      email: 'org@x.uz',
      deletedAt: new Date(),
    });

    await expect(
      service.archiveOrganization('org-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it('восстановление организации: переводит её в SUSPENDED и пишет audit', async () => {
    const { service, prisma } = createService();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      email: 'org@x.uz',
      deletedAt: new Date(),
    });
    prisma.organization.update.mockResolvedValue({});
    prisma.adminAuditLog.create.mockResolvedValue({});

    const result = await service.restoreOrganization('org-1', ACTOR);

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: expect.objectContaining({
          deletedAt: null,
          archivedById: null,
          archiveReason: null,
          suspendedAt: expect.any(Date),
          suspendedById: ACTOR.id,
          suspendedReason: 'RESTORED_PENDING_REACTIVATION',
        }),
      }),
    );
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'RESTORE_ORGANIZATION' }),
      }),
    );
    expect(result).toEqual({ success: true, organizationId: 'org-1' });
  });
});

/**
 * Модерация обязана уведомлять организатора о решении: без письма
 * организация узнаёт об отказе, только зайдя в кабинет.
 */
describe('SuperAdminService — уведомления о модерации', () => {
  const EVENT = {
    id: 'event-1',
    organizationId: 'org-1',
    slug: 'tech-summit-2026',
    title: 'Tech Summit 2026',
    startDate: new Date('2026-05-22T05:00:00.000Z'),
    venue: 'IT Park',
    status: 'PENDING_REVIEW',
    organization: {
      id: 'org-1',
      email: 'org@x.uz',
      verificationStatus: 'APPROVED',
    },
  };

  const ORG = {
    id: 'org-1',
    email: 'org@x.uz',
    name: 'acme',
    companyName: 'Acme Events',
    verificationStatus: 'PENDING',
  };

  const createService = () => {
    const prisma = {
      event: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      registration: { count: jest.fn().mockResolvedValue(0) },
      organization: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
    };
    const mail = {
      sendEventApproved: jest.fn().mockResolvedValue(undefined),
      sendEventRejected: jest.fn().mockResolvedValue(undefined),
      sendOrganizationApproved: jest.fn().mockResolvedValue(undefined),
      sendOrganizationRejected: jest.fn().mockResolvedValue(undefined),
    };
    const adminAudit = { record: jest.fn().mockResolvedValue(undefined) };
    const eventCredits = {
      consumeForEvent: jest
        .fn()
        .mockResolvedValue({ consumed: false, exhausted: false }),
      refundForCancelledEvent: jest.fn().mockResolvedValue({ refunded: false }),
    };
    const notificationDispatcher = {
      cancelBy: jest.fn().mockResolvedValue({ scheduled: 0, deliveries: 0 }),
      anonymizeAccountJournal: jest.fn().mockResolvedValue(0),
    };
    const moderationChain = {
      onEventApproved: jest.fn().mockResolvedValue(undefined),
      onEventRejected: jest.fn().mockResolvedValue(undefined),
      onEventSubmitted: jest.fn().mockResolvedValue(undefined),
    };
    const registrationChain = {
      onEventCancelled: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SuperAdminService(
      prisma as never,
      mail as never,
      {} as never, // BlogService
      adminAudit as never,
      eventCredits as never,
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // NotificationsService
      notificationDispatcher as never,
      moderationChain as never,
      registrationChain as never,
    );
    return {
      service,
      prisma,
      mail,
      adminAudit,
      eventCredits,
      notificationDispatcher,
      moderationChain,
      registrationChain,
    };
  };

  it('одобрение: письмо организации со ссылкой на публичную страницу', async () => {
    const { service, prisma, mail } = createService();
    prisma.event.findUnique.mockResolvedValue(EVENT);
    prisma.event.update.mockResolvedValue({ ...EVENT, status: 'PUBLISHED' });

    await service.approveEvent('event-1');

    expect(mail.sendEventApproved).toHaveBeenCalledWith(
      'org@x.uz',
      expect.objectContaining({
        eventId: 'event-1',
        eventTitle: 'Tech Summit 2026',
        slug: 'tech-summit-2026',
        venue: 'IT Park',
      }),
    );
  });

  it('отказ: письмо организации с причиной', async () => {
    const { service, prisma, mail } = createService();
    prisma.event.findUnique.mockResolvedValue(EVENT);
    prisma.event.update.mockResolvedValue({ ...EVENT, status: 'DRAFT' });

    await service.rejectEvent('event-1', 'Обложка нечитаемая');

    expect(mail.sendEventRejected).toHaveBeenCalledWith(
      'org@x.uz',
      expect.objectContaining({
        eventId: 'event-1',
        eventTitle: 'Tech Summit 2026',
        reason: 'Обложка нечитаемая',
      }),
    );
  });

  it('не шлёт письмо, если событие нельзя отклонить (не на модерации)', async () => {
    const { service, prisma, mail } = createService();
    prisma.event.findUnique.mockResolvedValue({ ...EVENT, status: 'DRAFT' });

    await expect(service.rejectEvent('event-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mail.sendEventRejected).not.toHaveBeenCalled();
  });

  it('атомарно меняет любой статус и пишет причину в audit log', async () => {
    const { service, prisma, adminAudit, notificationDispatcher } =
      createService();
    const updatedAt = new Date('2026-08-17T13:17:00.000Z');
    const current = {
      ...EVENT,
      status: 'PUBLISHED',
      updatedAt,
      deletedAt: null,
      rejectionReason: null,
    };
    const completed = {
      ...current,
      status: 'COMPLETED',
      updatedAt: new Date(),
    };
    prisma.event.findUnique
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(completed);
    prisma.event.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.setEventStatus(
        'event-1',
        {
          status: 'COMPLETED',
          expectedStatus: 'PUBLISHED',
          expectedUpdatedAt: updatedAt.toISOString(),
          reason: 'Исправление статуса по обращению',
        } as never,
        { id: 'admin-1', email: 'admin@eventflow.uz' },
      ),
    ).resolves.toMatchObject({ status: 'COMPLETED' });

    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'event-1',
          status: 'PUBLISHED',
          updatedAt,
        }),
        data: { status: 'COMPLETED', rejectionReason: null },
      }),
    );
    expect(adminAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENT_STATUS_OVERRIDE',
        reason: 'Исправление статуса по обращению',
        before: { status: 'PUBLISHED' },
        after: { status: 'COMPLETED' },
      }),
      prisma,
    );
    expect(notificationDispatcher.cancelBy).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-1' }),
    );
  });

  it('возвращает 409 и ничего не пишет при устаревшей версии события', async () => {
    const { service, prisma, adminAudit } = createService();
    prisma.event.findUnique.mockResolvedValue({
      ...EVENT,
      status: 'DRAFT',
      updatedAt: new Date('2026-08-17T13:18:00.000Z'),
      deletedAt: null,
    });

    await expect(
      service.setEventStatus(
        'event-1',
        {
          status: 'COMPLETED',
          expectedStatus: 'PUBLISHED',
          expectedUpdatedAt: '2026-08-17T13:17:00.000Z',
          reason: 'Исправление статуса по обращению',
        } as never,
        { id: 'admin-1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.event.updateMany).not.toHaveBeenCalled();
    expect(adminAudit.record).not.toHaveBeenCalled();
  });

  it('верификация организации: письмо на адрес организации', async () => {
    const { service, prisma, mail } = createService();
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organization.update.mockResolvedValue({
      ...ORG,
      verificationStatus: 'APPROVED',
    });

    await service.approveOrganization('org-1');

    expect(mail.sendOrganizationApproved).toHaveBeenCalledWith('org@x.uz', {
      organizationId: 'org-1',
      organizationName: 'Acme Events',
    });
  });

  it('отказ в верификации: письмо с причиной', async () => {
    const { service, prisma, mail } = createService();
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organization.update.mockResolvedValue({
      ...ORG,
      verificationStatus: 'REJECTED',
    });

    await service.rejectOrganization('org-1', 'Данные не совпадают с реестром');

    expect(mail.sendOrganizationRejected).toHaveBeenCalledWith('org@x.uz', {
      organizationId: 'org-1',
      organizationName: 'Acme Events',
      reason: 'Данные не совпадают с реестром',
    });
  });

  it('не шлёт письмо, если организация уже одобрена', async () => {
    const { service, prisma, mail } = createService();
    prisma.organization.findUnique.mockResolvedValue({
      ...ORG,
      verificationStatus: 'APPROVED',
    });

    await expect(service.approveOrganization('org-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mail.sendOrganizationApproved).not.toHaveBeenCalled();
  });
});
