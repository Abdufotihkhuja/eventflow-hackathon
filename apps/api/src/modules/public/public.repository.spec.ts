import {
  EventAccessType,
  EventStatus,
  OrganizationVerificationStatus,
  RegistrationStatus,
} from '@prisma/client';
import { EventTimeFilter } from './dto';
import { PublicRepository } from './public.repository';

describe('PublicRepository', () => {
  const prisma = {
    event: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const repository = new PublicRepository(prisma as never);

  beforeEach(() => {
    prisma.event.findFirst.mockReset();
    prisma.event.findFirst.mockResolvedValue(null);
    prisma.event.findMany.mockReset();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockReset();
    prisma.event.count.mockResolvedValue(0);
  });

  it('selects agenda fields needed by the public localizer', async () => {
    // materials/materialLabels are now selected so the localizer can resolve
    // per-locale label maps in the response without n+1 queries.
    // localizePublicAgendaItem strips raw materialLabels translations and
    // emits a flattened locale-resolved map; materials remain part of the
    // public payload by design (see commit 3b957de feat(public): localize
    // event detail by visitor locale).
    await repository.getPublicEventById('event-id');

    const args = prisma.event.findFirst.mock.calls[0][0];
    expect(args.include.agendaItems.select.title).toBe(true);
    expect(args.include.agendaItems.select.translations).toBe(true);
  });

  it('allows direct public slug lookup for invite-only events only with invite code', async () => {
    await repository.getPublicEventBySlug('invite-event', 'EVT-ABC123');

    const args = prisma.event.findFirst.mock.calls[0][0];
    expect(args.where.OR).toContainEqual({
      accessType: EventAccessType.INVITE_ONLY,
      inviteCode: 'EVT-ABC123',
    });
  });

  it('keeps invite-only events hidden from slug lookup without invite code', async () => {
    await repository.getPublicEventBySlug('invite-event');

    const args = prisma.event.findFirst.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      {
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
      },
    ]);
  });

  it('opens closed events to their own participant (slug + id)', async () => {
    // Приглашённый заходит по ссылке с inviteCode один раз, а возвращается уже
    // без кода — из «Моих событий» или из письма-напоминания. Без этой ветки
    // страница отдавала 404 подтверждённому участнику.
    const participantBranch = {
      registrations: {
        some: {
          userId: 'user-1',
          status: {
            in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
          },
        },
      },
    };

    await repository.getPublicEventBySlug('invite-event', undefined, 'user-1');
    expect(prisma.event.findFirst.mock.calls[0][0].where.OR).toContainEqual(
      participantBranch,
    );

    await repository.getPublicEventById('invite-event-id', 'user-1');
    expect(prisma.event.findFirst.mock.calls[1][0].where.OR).toContainEqual(
      participantBranch,
    );
  });

  it('keeps closed events hidden from anonymous id lookup', async () => {
    await repository.getPublicEventById('invite-event-id');

    expect(prisma.event.findFirst.mock.calls[0][0].where.OR).toEqual([
      {
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
      },
    ]);
  });

  it('keeps completed events viewable on the detail page (slug + id)', async () => {
    // Finished events flip to COMPLETED but still appear in the past listing,
    // so the detail lookups must accept them — otherwise the page 404s.
    await repository.getPublicEventBySlug('completed-event');
    expect(prisma.event.findFirst.mock.calls[0][0].where.status).toEqual({
      in: [EventStatus.PUBLISHED, EventStatus.COMPLETED],
    });

    await repository.getPublicEventById('completed-event-id');
    expect(prisma.event.findFirst.mock.calls[1][0].where.status).toEqual({
      in: [EventStatus.PUBLISHED, EventStatus.COMPLETED],
    });
  });

  it('filters upcoming public lists by event end date and public visibility', async () => {
    await repository.getPublicEvents({
      filter: EventTimeFilter.UPCOMING,
      category: 'hackathon',
    });

    const args = prisma.event.findMany.mock.calls[0][0];
    expect(args.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        status: EventStatus.PUBLISHED,
        endDate: { gte: expect.any(Date) },
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
        categories: { some: { slug: 'hackathon', isActive: true } },
      }),
    );
    expect(args.where.startDate).toBeUndefined();
    expect(args.select.categories).toEqual({
      select: { slug: true, name: true, translations: true },
    });
  });
});
