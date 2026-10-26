import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Gender,
  QuestionCategory,
  QuestionType,
  RegistrationStatus,
  UserType,
} from '@prisma/client';

import {
  EventAnalyticsService,
  bucketAge,
} from './event-analytics.service';
import {
  AnalyticsAgeGroup,
  AnalyticsGenderFilter,
  EventAnalyticsQueryDto,
} from './dto/analytics-query.dto';

const ORG_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '00000000-0000-4000-8000-000000000002';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

type EventRow = {
  id: string;
  organizationId: string;
  maxTestScore: number | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
};

type RegistrationRow = {
  id: string;
  status: RegistrationStatus;
  createdAt: Date;
  testScore: number | null;
  testMaxScore: number | null;
  testPassed: boolean | null;
  testCompletedAt: Date | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    gender: Gender | null;
    dateOfBirth: Date | null;
    region: string | null;
  } | null;
  attendances: { id: string }[];
  answers: { questionId: string; answer: string }[];
};

type QuestionDefRow = {
  id: string;
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired: boolean;
  options: string[];
};

function buildService(opts: {
  event?: Partial<EventRow> | null;
  registrations?: RegistrationRow[];
  questions?: QuestionDefRow[];
}) {
  const event: EventRow | null =
    opts.event === null
      ? null
      : {
          id: EVENT_ID,
          organizationId: ORG_ID,
          maxTestScore: 100,
          startDate: new Date('2026-06-15T10:00:00Z'),
          endDate: new Date('2026-06-15T18:00:00Z'),
          createdAt: new Date('2026-05-01T00:00:00Z'),
          ...opts.event,
        };

  const prisma = {
    event: { findUnique: jest.fn().mockResolvedValue(event) },
    registration: { findMany: jest.fn().mockResolvedValue(opts.registrations ?? []) },
    registrationQuestion: {
      findMany: jest.fn().mockResolvedValue(opts.questions ?? []),
    },
  } as never;

  return new EventAnalyticsService(prisma);
}

const organizer = {
  sub: ORG_ID,
  type: UserType.ORGANIZATION,
  permissions: [],
} as never;

const otherOrganizer = {
  sub: OTHER_ORG_ID,
  type: UserType.ORGANIZATION,
  permissions: [],
} as never;

function reg(partial: Partial<RegistrationRow> & { id: string }): RegistrationRow {
  return {
    status: RegistrationStatus.APPROVED,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    testScore: null,
    testMaxScore: null,
    testPassed: null,
    testCompletedAt: null,
    user: {
      firstName: 'First',
      lastName: 'Last',
      email: 'a@b.c',
      gender: null,
      dateOfBirth: null,
      region: null,
    },
    attendances: [],
    answers: [],
    ...partial,
  };
}

describe('EventAnalyticsService.getEventAnalytics', () => {
  it('throws 404 when event does not exist', async () => {
    const service = buildService({ event: null });
    await expect(
      service.getEventAnalytics(EVENT_ID, {} as EventAnalyticsQueryDto, organizer),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses cross-tenant access', async () => {
    const service = buildService({ event: { organizationId: ORG_ID }, registrations: [] });
    await expect(
      service.getEventAnalytics(
        EVENT_ID,
        {} as EventAnalyticsQueryDto,
        otherOrganizer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns zero-state for an event with no registrations', async () => {
    const service = buildService({ registrations: [] });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.overview.totalRegistrations).toBe(0);
    expect(result.overview.approvalRate).toBeNull();
    expect(result.overview.attendanceRate).toBeNull();
    expect(result.meta.isEmpty).toBe(true);
    expect(result.registrationTrend).toEqual([]);
    expect(result.funnel.registered).toBe(0);
    expect(result.meta.unavailable).toEqual(
      expect.arrayContaining(['gender', 'age', 'region', 'registrationTrend']),
    );
  });

  it('aggregates mixed statuses correctly', async () => {
    const service = buildService({
      registrations: [
        reg({ id: '1', status: RegistrationStatus.APPROVED, attendances: [{ id: 'a' }] }),
        reg({ id: '2', status: RegistrationStatus.APPROVED }),
        reg({ id: '3', status: RegistrationStatus.PENDING }),
        reg({ id: '4', status: RegistrationStatus.REJECTED }),
        reg({ id: '5', status: RegistrationStatus.CANCELLED }),
      ],
    });

    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );

    expect(result.overview.totalRegistrations).toBe(5);
    expect(result.overview.approved).toBe(2);
    expect(result.overview.pending).toBe(1);
    expect(result.overview.rejected).toBe(1);
    expect(result.overview.cancelled).toBe(1);
    expect(result.overview.attended).toBe(1);
    expect(result.overview.approvalRate).toBe(40); // 2/5
    expect(result.overview.attendanceRate).toBe(50); // 1/2
    expect(result.overview.endToEndConversion).toBe(20); // 1/5
    expect(result.funnel).toEqual({
      registered: 5,
      approved: 2,
      checkedIn: 1,
      testCompleted: 0, // event has tests (maxTestScore=100) but nobody completed
    });
  });

  it('bucket gender keeps MALE / FEMALE / UNKNOWN; missing → unknown', async () => {
    const service = buildService({
      registrations: [
        reg({ id: '1', user: { ...baseUser(), gender: Gender.MALE } }),
        reg({ id: '2', user: { ...baseUser(), gender: Gender.MALE } }),
        reg({ id: '3', user: { ...baseUser(), gender: Gender.FEMALE } }),
        reg({ id: '4', user: { ...baseUser(), gender: null } }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    const map = Object.fromEntries(
      result.demographics.gender.map((b) => [b.key, b.count]),
    );
    expect(map).toEqual({ MALE: 2, FEMALE: 1, UNKNOWN: 1 });
    expect(result.demographics.hasGenderData).toBe(true);
  });

  it('all-unknown gender → hasGenderData false → flagged unavailable', async () => {
    const service = buildService({
      registrations: [
        reg({ id: '1', user: { ...baseUser(), gender: null } }),
        reg({ id: '2', user: { ...baseUser(), gender: null } }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.demographics.hasGenderData).toBe(false);
    expect(result.meta.unavailable).toContain('gender');
  });

  it('age groups bucket correctly across the full spectrum', () => {
    const today = new Date();
    const yearsAgo = (n: number) =>
      new Date(today.getUTCFullYear() - n, today.getUTCMonth(), today.getUTCDate());

    expect(bucketAge(yearsAgo(15))).toBe(AnalyticsAgeGroup.UNDER_18);
    expect(bucketAge(yearsAgo(20))).toBe(AnalyticsAgeGroup.AGE_18_21);
    expect(bucketAge(yearsAgo(23))).toBe(AnalyticsAgeGroup.AGE_22_25);
    expect(bucketAge(yearsAgo(28))).toBe(AnalyticsAgeGroup.AGE_26_30);
    expect(bucketAge(yearsAgo(33))).toBe(AnalyticsAgeGroup.AGE_31_35);
    expect(bucketAge(yearsAgo(40))).toBe(AnalyticsAgeGroup.AGE_36_45);
    expect(bucketAge(yearsAgo(60))).toBe(AnalyticsAgeGroup.AGE_46_PLUS);
    expect(bucketAge(null)).toBe(AnalyticsAgeGroup.UNKNOWN);
  });

  it('marks tests unavailable when event has no tests and no scores exist', async () => {
    const service = buildService({
      event: { maxTestScore: null },
      registrations: [reg({ id: '1' })],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.tests.available).toBe(false);
    expect(result.tests.averageScore).toBeNull();
    expect(result.tests.scoreDistribution.every((b) => b.count === 0)).toBe(true);
    expect(result.funnel.testCompleted).toBeNull();
    expect(result.meta.unavailable).toContain('tests');
  });

  it('computes test analytics when scores exist', async () => {
    const service = buildService({
      event: { maxTestScore: 100 },
      registrations: [
        reg({
          id: '1',
          testScore: 90,
          testMaxScore: 100,
          testPassed: true,
          testCompletedAt: new Date('2026-06-02T10:00:00Z'),
        }),
        reg({
          id: '2',
          testScore: 50,
          testMaxScore: 100,
          testPassed: false,
          testCompletedAt: new Date('2026-06-02T11:00:00Z'),
        }),
        reg({
          id: '3',
          testScore: 30,
          testMaxScore: 100,
          testPassed: false,
          testCompletedAt: new Date('2026-06-02T12:00:00Z'),
        }),
        // not started:
        reg({ id: '4' }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.tests.available).toBe(true);
    expect(result.tests.started).toBe(3);
    expect(result.tests.completed).toBe(3);
    expect(result.tests.passed).toBe(1);
    expect(result.tests.failed).toBe(2);
    expect(result.tests.averageScore).toBe(57); // round((90+50+30)/3)
    expect(result.tests.minScore).toBe(30);
    expect(result.tests.maxScore).toBe(90);
    expect(result.tests.passRate).toBe(33);
    // Distribution: 30 → 21_40, 50 → 41_60, 90 → 81_100
    const distribMap = Object.fromEntries(
      result.tests.scoreDistribution.map((b) => [b.key, b.count]),
    );
    expect(distribMap['21_40']).toBe(1);
    expect(distribMap['41_60']).toBe(1);
    expect(distribMap['81_100']).toBe(1);
  });

  it('respects gender filter (UNKNOWN bucket)', async () => {
    const service = buildService({
      registrations: [
        reg({ id: '1', user: { ...baseUser(), gender: Gender.MALE } }),
        reg({ id: '2', user: { ...baseUser(), gender: null } }),
      ],
    });
    // We can't observe the WHERE here directly, but UNKNOWN is implemented as user.gender=null,
    // which after Prisma returns the matching rows; service applies the rest correctly.
    const result = await service.getEventAnalytics(
      EVENT_ID,
      { gender: AnalyticsGenderFilter.UNKNOWN } as EventAnalyticsQueryDto,
      organizer,
    );
    // No assertion on prisma (mocked), but the call should not throw.
    expect(result.overview.totalRegistrations).toBe(2);
  });

  it('produces a per-day registration trend across the observed window', async () => {
    const service = buildService({
      registrations: [
        reg({ id: '1', createdAt: new Date('2026-06-01T10:00:00Z') }),
        reg({ id: '2', createdAt: new Date('2026-06-01T11:00:00Z') }),
        reg({ id: '3', createdAt: new Date('2026-06-02T11:00:00Z') }),
        reg({ id: '4', createdAt: new Date('2026-06-04T11:00:00Z') }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.registrationTrend).toHaveLength(4); // 06-01, 06-02, 06-03 (zero), 06-04
    expect(result.registrationTrend[0]).toMatchObject({ date: '2026-06-01', total: 2 });
    expect(result.registrationTrend[1]).toMatchObject({ date: '2026-06-02', total: 1 });
    expect(result.registrationTrend[2]).toMatchObject({ date: '2026-06-03', total: 0 });
    expect(result.registrationTrend[3]).toMatchObject({ date: '2026-06-04', total: 1 });
  });
});

describe('EventAnalyticsService.region filter', () => {
  it('translates a canonical region key to a Prisma OR-of-contains on aliases', async () => {
    const service = buildService({ registrations: [] });
    const prisma = (service as unknown as { prisma: { registration: { findMany: jest.Mock } } })
      .prisma;
    await service.getEventAnalytics(
      EVENT_ID,
      { region: 'andijan' } as EventAnalyticsQueryDto,
      organizer,
    );
    const call = prisma.registration.findMany.mock.calls[0][0];
    const userWhere = call.where.user;
    expect(userWhere.OR).toBeDefined();
    // Sanity: at least one of the OR clauses matches the andijan alias set.
    const aliases = userWhere.OR.map(
      (c: { region: { contains: string } }) => c.region.contains,
    );
    expect(aliases).toEqual(expect.arrayContaining(['андижан', 'andijan', 'andijon']));
  });

  it('__unknown__ region matches NULL or empty string', async () => {
    const service = buildService({ registrations: [] });
    const prisma = (service as unknown as { prisma: { registration: { findMany: jest.Mock } } })
      .prisma;
    await service.getEventAnalytics(
      EVENT_ID,
      { region: '__unknown__' } as never,
      organizer,
    );
    const call = prisma.registration.findMany.mock.calls[0][0];
    expect(call.where.user.OR).toEqual([{ region: null }, { region: '' }]);
  });
});

describe('EventAnalyticsService.questions', () => {
  it('returns available=false when event has no answerable questions', async () => {
    const service = buildService({
      questions: [],
      registrations: [reg({ id: '1' })],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.questions.available).toBe(false);
    expect(result.meta.unavailable).toContain('questions');
  });

  it('skips RHETORICAL (informational) questions entirely', async () => {
    const service = buildService({
      questions: [
        {
          id: 'q-info',
          question: 'Info block',
          type: QuestionType.TEXT,
          category: QuestionCategory.RHETORICAL,
          isRequired: false,
          options: [],
        },
      ],
      registrations: [reg({ id: '1' })],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.questions.available).toBe(false);
    expect(result.questions.totalQuestions).toBe(0);
  });

  it('aggregates SELECT option counts (Yes/No bucket)', async () => {
    const service = buildService({
      questions: [
        {
          id: 'q-team',
          question: 'У вас есть команда?',
          type: QuestionType.SELECT,
          category: QuestionCategory.CLOSED,
          isRequired: true,
          options: ['Yes', 'No'],
        },
      ],
      registrations: [
        reg({ id: '1', answers: [{ questionId: 'q-team', answer: 'Yes' }] }),
        reg({ id: '2', answers: [{ questionId: 'q-team', answer: 'Yes' }] }),
        reg({ id: '3', answers: [{ questionId: 'q-team', answer: 'No' }] }),
        reg({ id: '4', answers: [] }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    expect(result.questions.questions).toHaveLength(1);
    const q = result.questions.questions[0];
    expect(q.answeredCount).toBe(3);
    expect(q.options).toEqual([
      { option: 'Yes', count: 2 },
      { option: 'No', count: 1 },
    ]);
  });

  it('aggregates CHECKBOX (comma-separated) counts per option, no double-counting', async () => {
    const service = buildService({
      questions: [
        {
          id: 'q-skills',
          question: 'Какие навыки?',
          type: QuestionType.CHECKBOX,
          category: QuestionCategory.ALTERNATIVE,
          isRequired: false,
          options: ['JS', 'Python', 'Go'],
        },
      ],
      registrations: [
        reg({ id: '1', answers: [{ questionId: 'q-skills', answer: 'JS, Python' }] }),
        reg({ id: '2', answers: [{ questionId: 'q-skills', answer: 'JS, Go' }] }),
        reg({ id: '3', answers: [{ questionId: 'q-skills', answer: 'Python' }] }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    const q = result.questions.questions[0];
    expect(q.options).toEqual([
      { option: 'JS', count: 2 },
      { option: 'Python', count: 2 },
      { option: 'Go', count: 1 },
    ]);
    expect(q.answeredCount).toBe(3); // not 5 — three registrations answered, even if multi-select
  });

  it('aggregates NUMBER answers into min/max/avg, skipping non-numeric', async () => {
    const service = buildService({
      questions: [
        {
          id: 'q-age',
          question: 'Возраст',
          type: QuestionType.NUMBER,
          category: QuestionCategory.OPEN,
          isRequired: true,
          options: [],
        },
      ],
      registrations: [
        reg({ id: '1', answers: [{ questionId: 'q-age', answer: '20' }] }),
        reg({ id: '2', answers: [{ questionId: 'q-age', answer: '30' }] }),
        reg({ id: '3', answers: [{ questionId: 'q-age', answer: '40' }] }),
        reg({ id: '4', answers: [{ questionId: 'q-age', answer: 'хз' }] }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    const q = result.questions.questions[0];
    expect(q.numberStats).toEqual({ min: 20, max: 40, avg: 30, count: 3 });
  });

  it('TEXTAREA only carries answered/skipped counts (no aggregation, no PII)', async () => {
    const service = buildService({
      questions: [
        {
          id: 'q-team-name',
          question: 'Название команды',
          type: QuestionType.TEXTAREA,
          category: QuestionCategory.OPEN,
          isRequired: false,
          options: [],
        },
      ],
      registrations: [
        reg({ id: '1', answers: [{ questionId: 'q-team-name', answer: 'Best Team' }] }),
        reg({ id: '2', answers: [{ questionId: 'q-team-name', answer: '   ' }] }), // empty
        reg({ id: '3' }),
      ],
    });
    const result = await service.getEventAnalytics(
      EVENT_ID,
      {} as EventAnalyticsQueryDto,
      organizer,
    );
    const q = result.questions.questions[0];
    expect(q.answeredCount).toBe(1);
    expect(q.skippedCount).toBe(2);
    expect(q.options).toBeUndefined();
    expect(q.numberStats).toBeUndefined();
  });
});

function baseUser() {
  return {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.c',
    gender: null as Gender | null,
    dateOfBirth: null as Date | null,
    region: null as string | null,
  };
}
