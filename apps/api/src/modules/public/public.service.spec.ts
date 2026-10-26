import {
  EventAccessType,
  EventFormat,
  EventStatus,
  EventType,
  Prisma,
  UserType,
} from '@prisma/client';
import type { ICurrentUser } from '../../common/interfaces';
import { PublicRepository } from './public.repository';
import { PublicService } from './public.service';
import { RegistrationsRepository } from '../registrations/registrations.repository';

const originalDescription = [
  {
    id: 'original',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Original event description', styles: {} }],
    children: [],
  },
];

const ruDescription = [
  {
    id: 'ru',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Описание события', styles: {} }],
    children: [],
  },
];

const uzDescription = [
  {
    id: 'uz',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Tadbir tavsifi', styles: {} }],
    children: [],
  },
];

describe('PublicService rich text localization', () => {
  function createService(eventOverride: Record<string, unknown> = {}) {
    const event = {
      id: 'event-id',
      slug: 'event-slug',
      title: 'Event',
      shortDescription: 'Short',
      description: originalDescription,
      richTranslations: {
        description: {
          ru: ruDescription,
          uz: uzDescription,
        },
      },
      richTranslationMeta: {
        description: {
          uz: { status: 'auto_translated', provider: 'tahrirchi' },
        },
      },
      translations: {},
      translationMeta: {},
      status: EventStatus.PUBLISHED,
      accessType: EventAccessType.OPEN,
      format: EventFormat.OFFLINE,
      type: EventType.FREE,
      startDate: new Date('2026-06-01T10:00:00Z'),
      endDate: new Date('2026-06-01T12:00:00Z'),
      organizationId: 'org-id',
      organization: {
        id: 'org-id',
        name: 'Org',
        companyName: 'Org LLC',
        translations: {},
        translationMeta: {},
        logoUrl: null,
      },
      _count: { registrations: 0 },
      ...eventOverride,
    };

    const publicRepository = {
      getEventBySlugForDeletedCheck: jest.fn().mockResolvedValue(null),
      getPublicEventBySlug: jest.fn().mockResolvedValue(event),
      incrementEventViews: jest.fn().mockResolvedValue(undefined),
    };
    const registrationsRepository = {
      findByEventAndUser: jest.fn(),
    };

    return {
      service: new PublicService(
        publicRepository as unknown as PublicRepository,
        registrationsRepository as unknown as RegistrationsRepository,
      ),
      publicRepository,
    };
  }

  it('returns localized public event description and strips rich metadata', async () => {
    const { service } = createService();

    const result = await service.getPublicEventBySlug(
      'event-slug',
      undefined,
      'uz',
    );

    expect(result.description).toBe(uzDescription);
    expect(result).not.toHaveProperty('richTranslations');
    expect(result).not.toHaveProperty('richTranslationMeta');
    expect(result).not.toHaveProperty('translationMeta');
  });

  it('keeps old records without rich translations rendering from description', async () => {
    const { service } = createService({
      richTranslations: undefined,
      richTranslationMeta: undefined,
    });

    const result = await service.getPublicEventBySlug(
      'event-slug',
      undefined,
      'en',
    );

    expect(result.description).toBe(originalDescription);
  });

  it('increments the public view counter for an anonymous visitor', async () => {
    const { service, publicRepository } = createService();

    await service.getPublicEventBySlug('event-slug', undefined, 'en');

    expect(publicRepository.incrementEventViews).toHaveBeenCalledTimes(1);
    expect(publicRepository.incrementEventViews).toHaveBeenCalledWith('event-id');
  });

  it('does not count a view when the owning organization previews its own event', async () => {
    const { service, publicRepository } = createService();
    const owner = {
      sub: 'org-id',
      type: UserType.ORGANIZATION,
    } as unknown as ICurrentUser;

    await service.getPublicEventBySlug('event-slug', owner, 'en');

    expect(publicRepository.incrementEventViews).not.toHaveBeenCalled();
  });
});

describe('PublicService.getPublicEvents — geo + price list fields (Stage 2 / B1)', () => {
  type ListQuery = Parameters<PublicService['getPublicEvents']>[0];

  function makeService(eventOverride: Record<string, unknown> = {}) {
    const event = {
      id: 'event-id',
      slug: 'event-slug',
      title: 'Event',
      translations: {},
      shortDescription: 'Short',
      coverImage: null,
      startDate: new Date('2026-06-01T10:00:00Z'),
      endDate: new Date('2026-06-01T12:00:00Z'),
      format: EventFormat.OFFLINE,
      type: EventType.PAID,
      status: EventStatus.PUBLISHED,
      city: 'Tashkent',
      venue: 'Technopark',
      price: new Prisma.Decimal('240000.00'),
      currency: 'UZS',
      latitude: new Prisma.Decimal('41.311081'),
      longitude: new Prisma.Decimal('69.240562'),
      categories: [],
      maxParticipants: 100,
      registrationsCount: 5,
      isFeatured: true,
      organization: {
        id: 'org-id',
        name: 'Org',
        companyName: 'Org LLC',
        translations: {},
        logoUrl: null,
      },
      ...eventOverride,
    };

    const publicRepository = {
      getPublicEvents: jest.fn().mockResolvedValue({
        events: [event],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    };
    const registrationsRepository = { findByEventAndUser: jest.fn() };

    return new PublicService(
      publicRepository as unknown as PublicRepository,
      registrationsRepository as unknown as RegistrationsRepository,
    );
  }

  it('maps venue/price/currency/latitude/longitude and coerces Decimals to numbers', async () => {
    const service = makeService();

    const result = await service.getPublicEvents({ locale: 'en' } as ListQuery);
    const item = result.items[0];

    expect(item.venue).toBe('Technopark');
    expect(item.price).toBe(240000);
    expect(typeof item.price).toBe('number');
    expect(item.currency).toBe('UZS');
    expect(item.latitude).toBeCloseTo(41.311081, 5);
    expect(item.longitude).toBeCloseTo(69.240562, 5);
    expect(typeof item.latitude).toBe('number');
    expect(typeof item.longitude).toBe('number');
  });

  it('returns undefined geo/price for an online/free event (nulls)', async () => {
    const service = makeService({
      venue: null,
      price: null,
      latitude: null,
      longitude: null,
    });

    const result = await service.getPublicEvents({ locale: 'en' } as ListQuery);
    const item = result.items[0];

    expect(item.venue).toBeUndefined();
    expect(item.price).toBeUndefined();
    expect(item.latitude).toBeUndefined();
    expect(item.longitude).toBeUndefined();
    expect(item.currency).toBe('UZS');
  });
});
