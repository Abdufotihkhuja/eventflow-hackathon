import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { EventCheckpointsRepository } from './event-checkpoints.repository';
import { EventCheckpointsService } from './event-checkpoints.service';

const ORG_ID = 'org-1';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const CHECKPOINT_ID = '33333333-3333-4333-8333-333333333333';
const REG_ID = '11111111-1111-4111-8111-111111111111';

const organizerUser = { sub: ORG_ID, type: UserType.ORGANIZATION } as never;

function checkpoint(overrides: Partial<{
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? CHECKPOINT_ID,
    eventId: EVENT_ID,
    name: overrides.name ?? 'Обед',
    startsAt: overrides.startsAt ?? new Date('2026-08-06T05:00:00Z'),
    endsAt: overrides.endsAt ?? new Date('2026-08-06T07:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };
}

function buildService(opts: {
  checkpoints?: ReturnType<typeof checkpoint>[];
  eventOrgId?: string;
  existingAttendance?: { checkInAt: Date } | null;
} = {}) {
  const list = opts.checkpoints ?? [];
  // findMany отдаёт только те чекпоинты, что попадают под where — так тесты
  // проверяют реальные предикаты окна, а не заранее заготовленный ответ.
  const findManyCheckpoints = jest.fn(
    ({ where }: { where: Record<string, never> }) => {
      const w = where as Record<string, { lte?: Date; lt?: Date; gt?: Date } | string | { not: string }>;
      return Promise.resolve(
        list.filter(cp => {
          const starts = w.startsAt as { lte?: Date; lt?: Date } | undefined;
          const ends = w.endsAt as { gt?: Date } | undefined;
          const id = w.id as { not: string } | undefined;
          if (id && cp.id === id.not) return false;
          if (starts?.lte && cp.startsAt > starts.lte) return false;
          if (starts?.lt && cp.startsAt >= starts.lt) return false;
          if (ends?.gt && cp.endsAt <= ends.gt) return false;
          return true;
        }),
      );
    },
  );

  const prisma = {
    event: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ organizationId: opts.eventOrgId ?? ORG_ID }),
    },
    eventCheckpoint: {
      findMany: findManyCheckpoints,
      findUnique: jest.fn().mockResolvedValue(list[0] ?? null),
      create: jest.fn(args => Promise.resolve({ ...checkpoint(), ...args.data })),
      update: jest.fn(args =>
        Promise.resolve({ ...checkpoint(), ...args.data }),
      ),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    attendance: {
      findFirst: jest.fn().mockResolvedValue(opts.existingAttendance ?? null),
      create: jest.fn(args => Promise.resolve({ id: 'att-1', ...args.data })),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  } as never;

  const service = new EventCheckpointsService(
    prisma,
    new EventCheckpointsRepository(prisma),
  );
  return { service, prisma: prisma as unknown as Record<string, never> };
}

describe('EventCheckpointsService — window validation', () => {
  it('rejects a window that ends before it starts', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        EVENT_ID,
        {
          name: 'Обед',
          startsAt: '2026-08-06T07:00:00Z',
          endsAt: '2026-08-06T05:00:00Z',
        },
        organizerUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a zero-length window', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        EVENT_ID,
        {
          name: 'Обед',
          startsAt: '2026-08-06T07:00:00Z',
          endsAt: '2026-08-06T07:00:00Z',
        },
        organizerUser,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EVENT_CHECKPOINT_INVALID_WINDOW',
      }),
    });
  });

  it('rejects a window longer than 24 hours', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        EVENT_ID,
        {
          name: 'Весь фестиваль',
          startsAt: '2026-08-06T00:00:00Z',
          endsAt: '2026-08-08T00:00:00Z',
        },
        organizerUser,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EVENT_CHECKPOINT_WINDOW_TOO_LONG',
      }),
    });
  });

  it('rejects a window overlapping an existing checkpoint', async () => {
    const { service } = buildService({ checkpoints: [checkpoint()] });
    await expect(
      service.create(
        EVENT_ID,
        {
          name: 'Кофе-брейк',
          startsAt: '2026-08-06T06:00:00Z',
          endsAt: '2026-08-06T08:00:00Z',
        },
        organizerUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows a window that starts exactly when the previous one ends', async () => {
    // Окно полуоткрытое [startsAt, endsAt) — стык не считается пересечением.
    const { service } = buildService({ checkpoints: [checkpoint()] });
    const created = await service.create(
      EVENT_ID,
      {
        name: 'Вторая сессия',
        startsAt: '2026-08-06T07:00:00Z',
        endsAt: '2026-08-06T09:00:00Z',
      },
      organizerUser,
    );
    expect(created.name).toBe('Вторая сессия');
    expect(created.checkedInCount).toBe(0);
  });

  it('trims and collapses whitespace in the name', async () => {
    const { service } = buildService();
    const created = await service.create(
      EVENT_ID,
      {
        name: '  Регистрация   участников  ',
        startsAt: '2026-08-06T05:00:00Z',
        endsAt: '2026-08-06T07:00:00Z',
      },
      organizerUser,
    );
    expect(created.name).toBe('Регистрация участников');
  });

  it('refuses access to another organization event', async () => {
    const { service } = buildService({ eventOrgId: 'org-2' });
    await expect(service.findByEvent(EVENT_ID, organizerUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404s on a checkpoint that belongs to another event', async () => {
    const { service } = buildService({
      checkpoints: [{ ...checkpoint(), eventId: 'other-event' }],
    });
    await expect(
      service.remove(EVENT_ID, CHECKPOINT_ID, organizerUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EventCheckpointsService — check-in slot', () => {
  const inside = new Date('2026-08-06T06:00:00Z');
  const outside = new Date('2026-08-06T09:00:00Z');

  it('resolves the checkpoint covering the scan instant', async () => {
    const { service } = buildService({ checkpoints: [checkpoint()] });
    const slot = await service.resolveCheckInSlot(EVENT_ID, REG_ID, inside);
    expect(slot.checkpoint).toMatchObject({ id: CHECKPOINT_ID });
    expect(slot.existing).toBeNull();
  });

  it('resolves to null outside every window (day-scoped fallback)', async () => {
    const { service } = buildService({ checkpoints: [checkpoint()] });
    const slot = await service.resolveCheckInSlot(EVENT_ID, REG_ID, outside);
    expect(slot.checkpoint).toBeNull();
    expect(slot.checkInDate).toEqual(new Date('2026-08-06'));
  });

  it('treats endsAt as exclusive', async () => {
    const { service } = buildService({ checkpoints: [checkpoint()] });
    const slot = await service.resolveCheckInSlot(
      EVENT_ID,
      REG_ID,
      new Date('2026-08-06T07:00:00Z'),
    );
    expect(slot.checkpoint).toBeNull();
  });

  it('surfaces an existing attendance as a duplicate pass', async () => {
    const lastCheckInAt = new Date('2026-08-06T05:10:00Z');
    const { service } = buildService({
      checkpoints: [checkpoint()],
      existingAttendance: { checkInAt: lastCheckInAt },
    });
    const slot = await service.resolveCheckInSlot(EVENT_ID, REG_ID, inside);
    expect(slot.existing).toMatchObject({ checkInAt: lastCheckInAt });
  });
});
