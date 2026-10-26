import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserType } from '@prisma/client';

import { AgendaService } from './agenda.service';

type MockRepo = {
  getNextSortOrder: jest.Mock;
  create: jest.Mock;
  findByEvent: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  reorder: jest.Mock;
  findEventAccess: jest.Mock;
  findEventOrganizationAccess: jest.Mock;
  findOverlapCandidates: jest.Mock;
};

const ORG_ID = 'org-1';
const EVENT_ID = 'event-1';
const USER = {
  sub: ORG_ID,
  type: UserType.ORGANIZATION,
  email: 'org@example.com',
} as never;

const baseEvent = {
  organizationId: ORG_ID,
  startDate: new Date('2026-06-15T00:00:00.000Z'),
  endDate: new Date('2026-06-17T23:59:59.999Z'),
};

function makeTime(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function makeItem(overrides: Partial<{
  id: string;
  startMin: number;
  duration: number;
  location: string | null;
  date: Date;
}>): {
  id: string;
  eventId: string;
  title: string;
  type: 'PRESENTATION';
  date: Date;
  startTime: Date;
  duration: number;
  location: string | null;
  sortOrder: number;
} {
  const startMin = overrides.startMin ?? 600; // 10:00
  return {
    id: overrides.id ?? 'item-' + Math.random().toString(36).slice(2, 8),
    eventId: EVENT_ID,
    title: 'Existing item',
    type: 'PRESENTATION',
    date: overrides.date ?? new Date('2026-06-15T00:00:00.000Z'),
    startTime: makeTime(Math.floor(startMin / 60), startMin % 60),
    duration: overrides.duration ?? 60,
    location: overrides.location ?? null,
    sortOrder: 0,
  };
}

function buildService(): { service: AgendaService; repo: MockRepo } {
  const repo: MockRepo = {
    getNextSortOrder: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((data) => ({ id: 'created', ...data })),
    findByEvent: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
    delete: jest.fn(),
    reorder: jest.fn(),
    findEventAccess: jest.fn().mockResolvedValue(baseEvent),
    findEventOrganizationAccess: jest
      .fn()
      .mockResolvedValue({ organizationId: ORG_ID }),
    findOverlapCandidates: jest.fn().mockResolvedValue([]),
  };
  const service = new AgendaService(repo as never);
  return { service, repo };
}

const baseDto = {
  title: 'New session',
  type: 'PRESENTATION' as const,
  date: '2026-06-15',
  startTime: '10:00',
  duration: 60,
};

describe('AgendaService — parallel sessions', () => {
  it('creates a non-overlapping item without location', async () => {
    const { service, repo } = buildService();

    await service.create(EVENT_ID, { ...baseDto }, USER);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.findOverlapCandidates).toHaveBeenCalledWith(
      EVENT_ID,
      expect.any(Date),
      undefined,
    );
  });

  it('allows two overlapping items with distinct locations', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValueOnce([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
    ]);

    await service.create(
      EVENT_ID,
      { ...baseDto, location: 'Hall B' },
      USER,
    );

    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('allows three overlapping items in three distinct rooms', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValueOnce([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
      makeItem({ id: 'b', startMin: 615, duration: 30, location: 'Hall B' }),
    ]);

    await service.create(
      EVENT_ID,
      { ...baseDto, location: 'Hall C' },
      USER,
    );

    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a 4th overlap with AGENDA_PARALLEL_LIMIT_EXCEEDED', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValue([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
      makeItem({ id: 'b', startMin: 615, duration: 30, location: 'Hall B' }),
      makeItem({ id: 'c', startMin: 605, duration: 50, location: 'Hall C' }),
    ]);

    await expect(
      service.create(EVENT_ID, { ...baseDto, location: 'Hall D' }, USER),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.create(EVENT_ID, { ...baseDto, location: 'Hall D' }, USER),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AGENDA_PARALLEL_LIMIT_EXCEEDED',
      }),
    });
  });

  it('rejects same-room overlap case-insensitively', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValue([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
    ]);

    await expect(
      service.create(EVENT_ID, { ...baseDto, location: '  hall a ' }, USER),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AGENDA_ROOM_TIME_CONFLICT',
        details: expect.objectContaining({ field: 'location' }),
      }),
    });
  });

  it('rejects overlap when new item has empty location', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValue([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
    ]);

    await expect(
      service.create(EVENT_ID, { ...baseDto }, USER),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AGENDA_ROOM_REQUIRED_FOR_PARALLEL',
      }),
    });

    await expect(
      service.create(EVENT_ID, { ...baseDto, location: '   ' }, USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duration that overruns the day with AGENDA_TIME_INVALID', async () => {
    const { service } = buildService();
    await expect(
      service.create(
        EVENT_ID,
        { ...baseDto, startTime: '23:30', duration: 90 },
        USER,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AGENDA_TIME_INVALID' }),
    });
  });

  it('treats adjacent items (10:00-11:00 + 11:00-12:00) as non-overlapping', async () => {
    const { service, repo } = buildService();
    repo.findOverlapCandidates.mockResolvedValue([
      makeItem({ id: 'a', startMin: 600, duration: 60, location: 'Hall A' }),
    ]);

    await service.create(
      EVENT_ID,
      { ...baseDto, startTime: '11:00', location: 'Hall A' },
      USER,
    );
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('does not run overlap validation on a title-only update', async () => {
    const { service, repo } = buildService();
    repo.findById.mockResolvedValue(makeItem({ id: 'x' }));

    await service.update(EVENT_ID, 'x', { title: 'Renamed' }, USER);

    expect(repo.findOverlapCandidates).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      'x',
      expect.objectContaining({ title: 'Renamed' }),
    );
  });

  it('excludes self when validating an update at same time/location', async () => {
    const { service, repo } = buildService();
    const existing = makeItem({
      id: 'self',
      startMin: 600,
      duration: 60,
      location: 'Hall A',
    });
    repo.findById.mockResolvedValue(existing);
    repo.findOverlapCandidates.mockResolvedValue([]);

    await service.update(
      EVENT_ID,
      'self',
      { startTime: '10:00', duration: 60, location: 'Hall A' },
      USER,
    );

    expect(repo.findOverlapCandidates).toHaveBeenCalledWith(
      EVENT_ID,
      expect.any(Date),
      'self',
    );
    expect(repo.update).toHaveBeenCalled();
  });

  it('does not re-run overlap validation on reorder', async () => {
    const { service, repo } = buildService();
    await service.reorder(EVENT_ID, ['a', 'b'], USER);

    expect(repo.reorder).toHaveBeenCalledWith(['a', 'b']);
    expect(repo.findOverlapCandidates).not.toHaveBeenCalled();
  });

  it('throws AGENDA_EVENT_NOT_FOUND for missing event', async () => {
    const { service, repo } = buildService();
    repo.findEventAccess.mockResolvedValueOnce(null);

    await expect(
      service.create(EVENT_ID, { ...baseDto }, USER),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AGENDA_EVENT_NOT_FOUND' }),
    });
  });

  it('throws AGENDA_ITEM_NOT_FOUND for missing item', async () => {
    const { service, repo } = buildService();
    repo.findById.mockResolvedValueOnce(null);

    await expect(
      service.update(EVENT_ID, 'missing', { title: 'x' }, USER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
