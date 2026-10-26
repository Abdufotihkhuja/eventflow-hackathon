jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

import {
  Currency,
  EventAccessType,
  EventFormat,
  EventStatus,
  EventType,
  UserType,
} from '@prisma/client';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

describe('EventsService multilingual mapping', () => {
  function createService() {
    const eventsRepository = {
      create: jest.fn((data) => Promise.resolve({ id: 'event-id', ...data })),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn((id, data) => Promise.resolve({ id, ...data })),
      updateIfCurrent: jest.fn((id, _status, _updatedAt, data) =>
        Promise.resolve({ id, ...data }),
      ),
      slugExists: jest.fn(),
    };
    const placesService = {
      applyPlaceToEventInput: jest.fn().mockResolvedValue({}),
    };
    const configService = {
      get: jest.fn(),
    };
    const notificationReplan = {
      onEventDatesChanged: jest.fn().mockResolvedValue(undefined),
    };

    return {
      eventsRepository,
      configService,
      placesService,
      notificationReplan,
      service: new EventsService(
        eventsRepository as unknown as EventsRepository,
        configService as never,
        {} as never,
        placesService as never,
        // eventCredits / capacityClamp в create() не участвуют — заглушки;
        // maxEvents проверяет override-лимит на число событий (по умолчанию
        // безлимит), поэтому нужен рабочий мок.
        {} as never,
        {} as never,
        {
          assertCanCreateEvent: jest.fn().mockResolvedValue(undefined),
        } as never,
        // BL-03: пере-планирование уведомлений при смене дат события.
        notificationReplan as never,
        // Цепочки Батча 6б: модерация/регистрация/закрытие — заглушки.
        { onEventSubmitted: jest.fn().mockResolvedValue(undefined) } as never,
        { onEventCancelled: jest.fn().mockResolvedValue(undefined) } as never,
        {
          onRegistrationToggle: jest.fn().mockResolvedValue(undefined),
        } as never,
      ),
    };
  }

  const user = {
    sub: '11111111-1111-4111-8111-111111111111',
    type: UserType.ORGANIZATION,
  } as never;

  /** Даты относительно «сейчас»: правила модерации и завершения смотрят на них,
   *  а зашитая дата рано или поздно уезжает в прошлое и ломает тест. */
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000);

  it('creates scalar fields from ru/uz/en translations and persists metadata', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.slugExists.mockResolvedValue(false);

    await service.create(
      {
        title: 'Fallback title',
        translations: {
          title: { uz: 'Tadbir', en: 'Event' },
          shortDescription: { en: 'Short event' },
        },
        translationMeta: {
          title: {
            uz: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'uz' },
          },
        },
        richTranslations: {
          description: {
            uz: [
              {
                id: 'rich-uz',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Tavsif', styles: {} }],
              },
            ],
          },
        },
        richTranslationMeta: {
          description: {
            uz: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
        description: [
          {
            id: 'block-1',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Full description', styles: {} }],
            children: [],
          },
        ],
        type: EventType.FREE,
        format: EventFormat.OFFLINE,
        accessType: EventAccessType.OPEN,
        startDate: '2026-06-01T10:00:00Z',
        endDate: '2026-06-01T12:00:00Z',
        currency: Currency.UZS,
      },
      user,
    );

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tadbir',
        slug: 'tadbir',
        shortDescription: 'Short event',
        translations: {
          title: { uz: 'Tadbir', en: 'Event' },
          shortDescription: { en: 'Short event' },
        },
        translationMeta: {
          title: {
            uz: { status: 'manual' },
            en: { status: 'auto_translated', sourceLocale: 'uz' },
          },
        },
        richTranslations: {
          description: {
            uz: [
              {
                id: 'rich-uz',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Tavsif', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          description: {
            uz: { status: 'auto_translated', sourceLocale: 'ru' },
          },
        },
      }),
    );
  });

  it('updates scalar fields from translations with existing scalar fallback', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      id: 'event-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Existing',
      slug: 'existing',
      shortDescription: 'Existing short',
      status: EventStatus.DRAFT,
      format: EventFormat.OFFLINE,
      startDate: new Date('2026-06-01T10:00:00Z'),
      endDate: new Date('2026-06-01T12:00:00Z'),
      registrationDeadline: null,
      updatedAt: new Date('2026-05-01T00:00:00Z'),
    });
    eventsRepository.slugExists.mockResolvedValue(false);

    await service.update(
      'event-id',
      {
        translations: {
          title: { en: 'Updated' },
          shortDescription: {},
        },
        translationMeta: {
          title: { en: { status: 'manual' } },
        },
        richTranslations: {
          description: {
            en: [
              {
                id: 'rich-en',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Description', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          description: { en: { status: 'manual' } },
        },
      },
      user,
    );

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.DRAFT,
      expect.any(Date),
      expect.objectContaining({
        title: 'Updated',
        slug: 'updated',
        shortDescription: 'Existing short',
        translations: {
          title: { en: 'Updated' },
          shortDescription: {},
        },
        translationMeta: {
          title: { en: { status: 'manual' } },
        },
        richTranslations: {
          description: {
            en: [
              {
                id: 'rich-en',
                type: 'paragraph',
                content: [{ type: 'text', text: 'Description', styles: {} }],
                children: [],
              },
            ],
          },
        },
        richTranslationMeta: {
          description: { en: { status: 'manual' } },
        },
      }),
    );
  });

  it('strips internal translation metadata from legacy public event responses', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findBySlug.mockResolvedValue({
      id: 'event-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Public event',
      slug: 'public-event',
      status: EventStatus.PUBLISHED,
      deletedAt: null,
      translationMeta: {
        title: {
          uz: {
            status: 'auto_translated',
            provider: 'tahrirchi',
            sourceHash: 'sha256:test',
          },
        },
      },
      richTranslationMeta: {
        description: {
          uz: {
            status: 'auto_translated',
            provider: 'tahrirchi',
            sourceHash: 'sha256:test',
            structureHash: 'fnv1a32:test',
          },
        },
      },
    });

    const result = await service.findPublicBySlug('public-event');

    expect(result).not.toHaveProperty('translationMeta');
    expect(result).not.toHaveProperty('richTranslationMeta');
  });

  it('builds invite links on the public site, not the workspace app host', async () => {
    const { configService, eventsRepository, service } = createService();
    configService.get.mockImplementation((key: string) => {
      if (key === 'frontend.publicUrl') return 'https://app.eventflow.uz';
      if (key === 'frontend.appUrl') return 'https://app.eventflow.uz';
      return undefined;
    });
    eventsRepository.findById.mockResolvedValue({
      id: 'event-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Invite only',
      slug: 'ml-hackathon',
      status: EventStatus.PUBLISHED,
      accessType: EventAccessType.INVITE_ONLY,
      inviteCode: 'EVT-876FA532',
    });

    await expect(service.getInviteLink('event-id', user)).resolves.toEqual({
      inviteLink:
        'https://eventflow.uz/events/ml-hackathon?inviteCode=EVT-876FA532',
      inviteCode: 'EVT-876FA532',
    });
  });

  it('keeps completed events publicly viewable by id (regression: comments 404 on finished events)', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      id: 'event-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Past event',
      slug: 'past-event',
      status: EventStatus.COMPLETED,
      deletedAt: null,
    });

    await expect(service.findPublicById('event-id')).resolves.toMatchObject({
      id: 'event-id',
      status: EventStatus.COMPLETED,
    });
  });

  it('keeps completed events publicly viewable by slug', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findBySlug.mockResolvedValue({
      id: 'event-id',
      organizationId: '11111111-1111-4111-8111-111111111111',
      title: 'Past event',
      slug: 'past-event',
      status: EventStatus.COMPLETED,
      deletedAt: null,
    });

    await expect(service.findPublicBySlug('past-event')).resolves.toMatchObject(
      {
        id: 'event-id',
        status: EventStatus.COMPLETED,
      },
    );
  });

  it('still hides non-public (draft) events from public lookups', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      id: 'event-id',
      status: EventStatus.DRAFT,
      deletedAt: null,
    });

    await expect(service.findPublicById('event-id')).rejects.toThrow(
      'Мероприятие не найдено',
    );
  });

  // Код приглашения выдавался только в create(), поэтому событие, переведённое
  // в INVITE_ONLY позже, оставалось без кода и блок «Приглашения» падал.
  const inviteOnlyEvent = (inviteCode: string | null) => ({
    id: 'event-id',
    organizationId: '11111111-1111-4111-8111-111111111111',
    slug: 'ai-hackathon',
    title: 'AI Hackathon',
    status: EventStatus.PUBLISHED,
    accessType: EventAccessType.INVITE_ONLY,
    format: EventFormat.OFFLINE,
    deletedAt: null,
    inviteCode,
    // Даты обязательны в схеме: правка опубликованного события смотрит на
    // startDate (ре-модерация только для ещё не начавшихся).
    startDate: hoursFromNow(48),
    endDate: hoursFromNow(56),
    publishedAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
  });

  it('generates an invite code when access type switches to INVITE_ONLY', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      ...inviteOnlyEvent(null),
      accessType: EventAccessType.OPEN,
    });

    await service.update(
      'event-id',
      { accessType: EventAccessType.INVITE_ONLY },
      user,
    );

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.PUBLISHED,
      expect.any(Date),
      expect.objectContaining({
        accessType: EventAccessType.INVITE_ONLY,
        inviteCode: expect.stringMatching(/^EVT-/),
      }),
    );
  });

  it('keeps the existing invite code when access type is unchanged', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      inviteOnlyEvent('EVT-EXISTING'),
    );

    await service.update(
      'event-id',
      { accessType: EventAccessType.INVITE_ONLY },
      user,
    );

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.PUBLISHED,
      expect.any(Date),
      expect.not.objectContaining({ inviteCode: expect.anything() }),
    );
  });

  it('rejects a stale edit instead of overwriting a concurrent status change', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      ...inviteOnlyEvent('EVT-EXISTING'),
      accessType: EventAccessType.OPEN,
    });
    eventsRepository.updateIfCurrent.mockResolvedValue(null);

    await expect(
      service.update(
        'event-id',
        { accessType: EventAccessType.INVITE_ONLY },
        user,
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(eventsRepository.update).not.toHaveBeenCalled();
  });

  it('rejects stale completion after an administrative status override', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      inviteOnlyEvent('EVT-EXISTING'),
    );
    eventsRepository.updateIfCurrent.mockResolvedValue(null);

    await expect(service.complete('event-id', user)).rejects.toMatchObject({
      status: 409,
    });

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.PUBLISHED,
      expect.any(Date),
      { status: EventStatus.COMPLETED },
    );
  });

  it('backfills a missing invite code when the link is requested', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(inviteOnlyEvent(null));

    const result = await service.getInviteLink('event-id', user);

    expect(result.inviteCode).toMatch(/^EVT-/);
    expect(result.inviteLink).toContain(
      `?inviteCode=${encodeURIComponent(result.inviteCode)}`,
    );
    expect(eventsRepository.update).toHaveBeenCalledWith('event-id', {
      inviteCode: result.inviteCode,
    });
  });

  it('rejects the invite link for events that are not INVITE_ONLY', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue({
      ...inviteOnlyEvent(null),
      accessType: EventAccessType.OPEN,
    });

    await expect(service.getInviteLink('event-id', user)).rejects.toThrow(
      'Ссылка приглашения доступна только для событий по приглашению',
    );
  });
  // Правка опубликованного события возвращала его в DRAFT «на повторную
  // модерацию». Для уже идущего/прошедшего события это тупик: завершить нельзя
  // (нужен PUBLISHED), на модерацию нельзя (нужна будущая дата старта).
  const publishedEvent = (
    startDate: Date,
    endDate: Date,
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 'event-id',
    organizationId: '11111111-1111-4111-8111-111111111111',
    title: 'AI Hackathon',
    slug: 'ai-hackathon',
    shortDescription: 'Short',
    status: EventStatus.PUBLISHED,
    format: EventFormat.OFFLINE,
    accessType: EventAccessType.OPEN,
    startDate,
    endDate,
    registrationDeadline: null,
    publishedAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-02T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  });

  it('sends an edited upcoming event back to DRAFT for re-moderation', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      publishedEvent(hoursFromNow(48), hoursFromNow(52)),
    );
    eventsRepository.slugExists.mockResolvedValue(false);

    await service.update('event-id', { shortDescription: 'Updated' }, user);

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.PUBLISHED,
      expect.any(Date),
      expect.objectContaining({ status: EventStatus.DRAFT }),
    );
  });

  it('keeps an already started event PUBLISHED when it is edited', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      publishedEvent(hoursFromNow(-48), hoursFromNow(-44)),
    );
    eventsRepository.slugExists.mockResolvedValue(false);

    await service.update('event-id', { shortDescription: 'Updated' }, user);

    const [, , , data] = eventsRepository.updateIfCurrent.mock.calls[0];
    expect(data).not.toHaveProperty('status');
  });

  it('completes a finished event that was published but fell back to DRAFT', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      publishedEvent(hoursFromNow(-48), hoursFromNow(-44), {
        status: EventStatus.DRAFT,
      }),
    );

    await expect(service.complete('event-id', user)).resolves.toMatchObject({
      status: EventStatus.COMPLETED,
    });

    expect(eventsRepository.updateIfCurrent).toHaveBeenCalledWith(
      'event-id',
      EventStatus.DRAFT,
      expect.any(Date),
      { status: EventStatus.COMPLETED },
    );
  });

  it('refuses to complete a draft that was never published (would publish it past moderation)', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      publishedEvent(hoursFromNow(-48), hoursFromNow(-44), {
        status: EventStatus.DRAFT,
        publishedAt: null,
      }),
    );

    await expect(service.complete('event-id', user)).rejects.toThrow(
      'Можно завершить только опубликованное или уже прошедшее опубликованное мероприятие',
    );
    expect(eventsRepository.updateIfCurrent).not.toHaveBeenCalled();
  });

  it('refuses to complete a still running event that fell back to DRAFT', async () => {
    const { eventsRepository, service } = createService();
    eventsRepository.findById.mockResolvedValue(
      publishedEvent(hoursFromNow(-1), hoursFromNow(3), {
        status: EventStatus.DRAFT,
      }),
    );

    await expect(service.complete('event-id', user)).rejects.toThrow(
      'Можно завершить только опубликованное или уже прошедшее опубликованное мероприятие',
    );
  });
});
