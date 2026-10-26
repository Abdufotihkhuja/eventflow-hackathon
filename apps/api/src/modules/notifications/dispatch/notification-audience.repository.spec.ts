import { NotificationAudienceRepository } from './notification-audience.repository';

function buildRepository() {
  const prisma = {
    registration: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    event: { findUnique: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    identity: { findMany: jest.fn().mockResolvedValue([]) },
    deviceToken: { findMany: jest.fn().mockResolvedValue([]) },
    organizationMember: { findMany: jest.fn().mockResolvedValue([]) },
    membership: { findMany: jest.fn().mockResolvedValue([]) },
    savedEvent: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const repository = new NotificationAudienceRepository(prisma as never);
  return { repository, prisma };
}

describe('NotificationAudienceRepository (BL-04, инвариант №7)', () => {
  it('токены — ТОЛЬКО владельца регистрации (User→Identity→Account→DeviceToken)', async () => {
    const { repository, prisma } = buildRepository();
    prisma.registration.findUnique.mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'owner@x.uz' },
    ]);
    prisma.identity.findMany.mockResolvedValue([
      {
        actorId: 'user-1',
        accountId: 'acc-1',
        account: { locale: 'uz', email: 'owner@x.uz', deletedAt: null },
      },
    ]);
    // В выборке токенов есть и чужой аккаунт — резолвер не должен его вернуть.
    prisma.deviceToken.findMany.mockResolvedValue([
      {
        id: 't-1',
        accountId: 'acc-1',
        expoPushToken: 'ExponentPushToken[own]',
        platform: 'ios',
        locale: 'uz',
      },
      {
        id: 't-2',
        accountId: 'acc-2',
        expoPushToken: 'ExponentPushToken[foreign]',
        platform: 'android',
        locale: 'ru',
      },
    ]);

    const recipient =
      await repository.resolveRegistrationParticipant('reg-1');

    expect(recipient).not.toBeNull();
    expect(recipient!.accountId).toBe('acc-1');
    expect(recipient!.registrationId).toBe('reg-1');
    expect(recipient!.devices).toHaveLength(1);
    expect(recipient!.devices[0].expoPushToken).toBe('ExponentPushToken[own]');
    // Запрос токенов скоуплен аккаунтом владельца и только активными строками.
    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: { in: ['acc-1'] }, disabledAt: null },
      }),
    );
    // Локаль: DeviceToken.locale приоритетнее Account.locale.
    expect(recipient!.locale).toBe('uz');
  });

  it('OQ-25: участник без Account → email-only по User.email, без устройств', async () => {
    const { repository, prisma } = buildRepository();
    prisma.registration.findUnique.mockResolvedValue({
      id: 'reg-2',
      userId: 'user-2',
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-2', email: 'legacy@x.uz' },
    ]);
    prisma.identity.findMany.mockResolvedValue([]); // логина после rework не было

    const recipient =
      await repository.resolveRegistrationParticipant('reg-2');

    expect(recipient).toEqual({
      accountId: null,
      email: 'legacy@x.uz',
      locale: 'ru',
      devices: [],
      registrationId: 'reg-2',
    });
  });

  it('регистрация исчезла (hard-delete) → null, не падение', async () => {
    const { repository, prisma } = buildRepository();
    prisma.registration.findUnique.mockResolvedValue(null);
    await expect(
      repository.resolveRegistrationParticipant('gone'),
    ).resolves.toBeNull();
  });

  it('resolveApprovedAttendees скоупит регистрации через event.organizationId из БД', async () => {
    const { repository, prisma } = buildRepository();
    prisma.event.findUnique.mockResolvedValue({ organizationId: 'org-1' });
    prisma.registration.findMany.mockResolvedValue([
      { id: 'reg-1', userId: 'user-1' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'a@x.uz' },
    ]);

    const recipients = await repository.resolveApprovedAttendees('e1');
    expect(recipients).toHaveLength(1);
    // Инвариант №7: requireEventTenantWhere вшил organizationId события.
    expect(prisma.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'e1',
          status: 'APPROVED',
          event: { organizationId: 'org-1' },
        }),
      }),
    );
  });

  it('организаторская аудитория: владелец всегда + дедуп аккаунтов', async () => {
    const { repository, prisma } = buildRepository();
    prisma.event.findUnique.mockResolvedValue({ organizationId: 'org-1' });
    prisma.organizationMember.findMany.mockResolvedValue([{ id: 'm-1' }]);
    prisma.membership.findMany.mockResolvedValue([
      {
        accountId: 'acc-owner',
        account: {
          id: 'acc-owner',
          email: 'owner@org.uz',
          locale: null,
          deletedAt: null,
        },
      },
      // Владелец одновременно member — второй ряд не должен дублировать.
      {
        accountId: 'acc-owner',
        account: {
          id: 'acc-owner',
          email: 'owner@org.uz',
          locale: null,
          deletedAt: null,
        },
      },
    ]);

    const recipients = await repository.resolveOrganizerAudience(
      'e1',
      'events:update',
    );
    expect(recipients).toHaveLength(1);
    expect(recipients[0].accountId).toBe('acc-owner');
    expect(recipients[0].locale).toBe('ru'); // дефолт при пустых locale
    // Фильтр по permission уходит в организационно-скоупленный запрос.
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
  });
});
