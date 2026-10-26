import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Gender,
  Prisma,
  QuestionCategory,
  QuestionType,
  RegistrationStatus,
  UserType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { ICurrentUser } from '../../common/interfaces';

import {
  AnalyticsAgeGroup,
  AnalyticsGenderFilter,
  AnalyticsTestStatusFilter,
  EventAnalyticsQueryDto,
  REGION_UNKNOWN,
} from './dto/analytics-query.dto';
import { UZ_REGION_ALIASES, type UzRegionKey } from './lib/uz-regions';

// ============================================================================
// Public DTO shape (used by controller & SDK consumers)
// ============================================================================

export interface IEventAnalyticsOverview {
  totalRegistrations: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
  attended: number;
  /** % approved / total (0–100, integer). null если нет регистраций. */
  approvalRate: number | null;
  /** % attended / approved (0–100, integer). null если нет approved. */
  attendanceRate: number | null;
  /** % attended / total (0–100, integer). null если нет регистраций. */
  endToEndConversion: number | null;
  /** Средний результат теста (0–100, integer). null если нет данных. */
  averageTestScore: number | null;
  /** % зарегистрированных, завершивших тест (0–100, integer). null если у евента нет тестов. */
  testCompletionRate: number | null;
}

export interface IEventAnalyticsBucket {
  key: string;
  label: string;
  count: number;
}

export interface IEventAnalyticsDemographics {
  gender: IEventAnalyticsBucket[];
  ageGroups: IEventAnalyticsBucket[];
  regions: IEventAnalyticsBucket[]; // top-N + "other"
  /** Доступны ли вообще демографические поля. Если у всех unknown — UI покажет honest empty state. */
  hasGenderData: boolean;
  hasAgeData: boolean;
  hasRegionData: boolean;
}

export interface IEventAnalyticsTrendPoint {
  date: string; // YYYY-MM-DD
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
}

export interface IEventAnalyticsTests {
  /** Есть ли у евента сами тесты (maxTestScore > 0 или есть registrations с testScore). */
  available: boolean;
  started: number;
  completed: number;
  passed: number;
  failed: number;
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  /** Распределение по результатам теста (% от maxScore). */
  scoreDistribution: IEventAnalyticsBucket[];
  /** % правильности порога для UX-блока "needs review / strong performance". */
  passRate: number | null;
}

export interface IEventAnalyticsFunnel {
  registered: number;
  approved: number;
  /** Сколько одобренных дошли хотя бы до одного check-in. */
  checkedIn: number;
  /** Сколько завершили тест (если есть тесты), иначе null — UI скроет ступеньку. */
  testCompleted: number | null;
}

/**
 * Per-question analytics. Registration questions ≠ tests:
 *  - SELECT / CHECKBOX → option counts (chartable)
 *  - NUMBER           → min/max/avg
 *  - TEXT / TEXTAREA  → only answered/skipped counts (free text, no aggregation, no PII)
 *  - RHETORICAL (informational) → skipped entirely
 */
export interface IEventQuestionAnalytics {
  questionId: string;
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired: boolean;
  /** Total registrations that submitted any non-empty answer to this question. */
  answeredCount: number;
  /** Total registrations that should have answered but did not (only counted for required Qs). */
  skippedCount: number;
  /** Present only for SELECT / CHECKBOX. */
  options?: Array<{ option: string; count: number }>;
  /** Present only for NUMBER. */
  numberStats?: { min: number; max: number; avg: number; count: number };
}

export interface IEventQuestionsAnalytics {
  /** False when the event's registration form has no aggregatable questions. */
  available: boolean;
  totalQuestions: number;
  questions: IEventQuestionAnalytics[];
}

export interface IEventAnalyticsMeta {
  /** Истинно, если в данном эвенте нет вообще ни одной регистрации. */
  isEmpty: boolean;
  /** Перечень секций, которые недоступны (нет данных / нет тестов и т.п.). */
  unavailable: Array<
    | 'gender'
    | 'age'
    | 'region'
    | 'tests'
    | 'questions'
    | 'attendance'
    | 'registrationTrend'
  >;
  generatedAt: string;
}

export interface IEventAnalyticsResult {
  overview: IEventAnalyticsOverview;
  demographics: IEventAnalyticsDemographics;
  registrationTrend: IEventAnalyticsTrendPoint[];
  tests: IEventAnalyticsTests;
  questions: IEventQuestionsAnalytics;
  funnel: IEventAnalyticsFunnel;
  meta: IEventAnalyticsMeta;
}

// ============================================================================
// Constants
// ============================================================================

const AGE_GROUP_ORDER: AnalyticsAgeGroup[] = [
  AnalyticsAgeGroup.UNDER_18,
  AnalyticsAgeGroup.AGE_18_21,
  AnalyticsAgeGroup.AGE_22_25,
  AnalyticsAgeGroup.AGE_26_30,
  AnalyticsAgeGroup.AGE_31_35,
  AnalyticsAgeGroup.AGE_36_45,
  AnalyticsAgeGroup.AGE_46_PLUS,
  AnalyticsAgeGroup.UNKNOWN,
];

const AGE_GROUP_LABELS: Record<AnalyticsAgeGroup, string> = {
  [AnalyticsAgeGroup.UNDER_18]: '< 18',
  [AnalyticsAgeGroup.AGE_18_21]: '18–21',
  [AnalyticsAgeGroup.AGE_22_25]: '22–25',
  [AnalyticsAgeGroup.AGE_26_30]: '26–30',
  [AnalyticsAgeGroup.AGE_31_35]: '31–35',
  [AnalyticsAgeGroup.AGE_36_45]: '36–45',
  [AnalyticsAgeGroup.AGE_46_PLUS]: '46+',
  [AnalyticsAgeGroup.UNKNOWN]: 'Unknown',
};

const SCORE_BUCKETS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: '0_20', label: '0–20%', min: 0, max: 20 },
  { key: '21_40', label: '21–40%', min: 21, max: 40 },
  { key: '41_60', label: '41–60%', min: 41, max: 60 },
  { key: '61_80', label: '61–80%', min: 61, max: 80 },
  { key: '81_100', label: '81–100%', min: 81, max: 100 },
];

const REGION_TOP_LIMIT = 8;
const TREND_LIMIT_DAYS = 90; // защитный максимум

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class EventAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Возвращает агрегированную аналитику по конкретному event, ограниченную организацией текущего пользователя.
   * Cross-tenant утечки невозможны: первая проверка — событие принадлежит организации.
   */
  async getEventAnalytics(
    eventId: string,
    query: EventAnalyticsQueryDto,
    user: ICurrentUser,
  ): Promise<IEventAnalyticsResult> {
    const event = await this.assertEventAccess(eventId, user);

    // Базовый where для регистраций с применением фильтров. Search обрабатывается отдельно
    // (через user-include, иначе nested-where взрывает count и groupBy).
    const baseWhere = this.buildRegistrationsWhere(eventId, query);

    const [registrations, questionDefs] = await Promise.all([
      this.prisma.registration.findMany({
        where: baseWhere,
        select: {
          id: true,
          status: true,
          createdAt: true,
          testScore: true,
          testMaxScore: true,
          testPassed: true,
          testCompletedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              gender: true,
              dateOfBirth: true,
              region: true,
            },
          },
          attendances: { select: { id: true }, take: 1 },
          answers: { select: { questionId: true, answer: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.registrationQuestion.findMany({
        where: { eventId },
        select: {
          id: true,
          question: true,
          type: true,
          category: true,
          isRequired: true,
          options: true,
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Search-фильтр применяем в памяти — устраняет необходимость в Prisma OR-цепочке и
    // совпадает с тем, как frontend ожидает реактивный фильтр.
    const filtered = query.search?.trim()
      ? this.applySearchFilter(registrations, query.search)
      : registrations;

    const filteredWithDerived = filtered.map((r) => ({
      ...r,
      ageGroup: bucketAge(r.user?.dateOfBirth ?? null),
    }));

    // ageGroup-фильтр (post-aggregation, так как Prisma не считает возраст из date_of_birth напрямую).
    const final =
      query.ageGroup !== undefined
        ? filteredWithDerived.filter((r) => r.ageGroup === query.ageGroup)
        : filteredWithDerived;

    const overview = this.computeOverview(final, event);
    const demographics = this.computeDemographics(final);
    const registrationTrend = this.computeTrend(final, event);
    const tests = this.computeTests(final, event);
    const questions = this.computeQuestions(final, questionDefs);
    const funnel = this.computeFunnel(final, event);

    const meta: IEventAnalyticsMeta = {
      isEmpty: final.length === 0,
      unavailable: this.computeUnavailable(
        demographics,
        tests,
        questions,
        registrationTrend,
      ),
      generatedAt: new Date().toISOString(),
    };

    return {
      overview,
      demographics,
      registrationTrend,
      tests,
      questions,
      funnel,
      meta,
    };
  }

  // ==========================================================================
  // Access control
  // ==========================================================================

  private async assertEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<{ id: string; organizationId: string; maxTestScore: number | null; startDate: Date; endDate: Date; createdAt: Date }> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizationId: true,
        maxTestScore: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('No access to this event');
    }
    return event;
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Only organizers can view event analytics');
  }

  // ==========================================================================
  // Filters → Prisma where
  // ==========================================================================

  private buildRegistrationsWhere(
    eventId: string,
    query: EventAnalyticsQueryDto,
  ): Prisma.RegistrationWhereInput {
    const where: Prisma.RegistrationWhereInput = { eventId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.dateFrom) {
        const from = parseDateOnly(query.dateFrom);
        if (from) createdAt.gte = from;
      }
      if (query.dateTo) {
        const to = parseDateOnly(query.dateTo);
        if (to) {
          // верхняя граница включительна — конец дня UTC
          const inclusive = new Date(to);
          inclusive.setUTCHours(23, 59, 59, 999);
          createdAt.lte = inclusive;
        }
      }
      where.createdAt = createdAt;
    }

    if (query.gender) {
      if (query.gender === AnalyticsGenderFilter.UNKNOWN) {
        where.user = { gender: null };
      } else {
        where.user = { gender: query.gender as unknown as Gender };
      }
    }

    if (query.testStatus) {
      switch (query.testStatus) {
        case AnalyticsTestStatusFilter.NOT_STARTED:
          where.testScore = null;
          where.testCompletedAt = null;
          break;
        case AnalyticsTestStatusFilter.COMPLETED:
          where.testCompletedAt = { not: null };
          break;
        case AnalyticsTestStatusFilter.PASSED:
          where.testPassed = true;
          break;
        case AnalyticsTestStatusFilter.FAILED:
          where.testPassed = false;
          where.testCompletedAt = { not: null };
          break;
      }
    }

    if (query.region) {
      const userFilter = (where.user as Prisma.UserWhereInput | undefined) ?? {};
      if (query.region === REGION_UNKNOWN) {
        // "Не указано" — either NULL in DB or stored as empty string after past edits.
        where.user = { ...userFilter, OR: [{ region: null }, { region: '' }] };
      } else {
        const aliases = UZ_REGION_ALIASES[query.region as UzRegionKey] ?? [];
        if (aliases.length > 0) {
          where.user = {
            ...userFilter,
            OR: aliases.map((alias) => ({
              region: { contains: alias, mode: 'insensitive' as const },
            })),
          };
        }
      }
    }

    return where;
  }

  private applySearchFilter<T extends { user: { firstName: string | null; lastName: string | null; email: string } | null }>(
    rows: T[],
    search: string,
  ): T[] {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u = r.user;
      if (!u) return false;
      const haystack = [
        u.firstName ?? '',
        u.lastName ?? '',
        u.email,
        `${u.firstName ?? ''} ${u.lastName ?? ''}`,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  // ==========================================================================
  // Aggregations
  // ==========================================================================

  private computeOverview(
    registrations: AnalyticsRegistration[],
    event: { maxTestScore: number | null },
  ): IEventAnalyticsOverview {
    const total = registrations.length;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let cancelled = 0;
    let attended = 0;

    let testCompleted = 0;
    let testScoreSum = 0;
    let testScorePctCount = 0;

    for (const r of registrations) {
      switch (r.status) {
        case RegistrationStatus.APPROVED:
          approved++;
          break;
        case RegistrationStatus.PENDING:
          pending++;
          break;
        case RegistrationStatus.REJECTED:
          rejected++;
          break;
        case RegistrationStatus.CANCELLED:
          cancelled++;
          break;
      }
      if (r.attendances && r.attendances.length > 0) attended++;
      if (r.testCompletedAt) testCompleted++;

      const pct = scorePercent(r.testScore, r.testMaxScore ?? event.maxTestScore);
      if (pct !== null) {
        testScoreSum += pct;
        testScorePctCount++;
      }
    }

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : null;
    const attendanceRate = approved > 0 ? Math.round((attended / approved) * 100) : null;
    const endToEndConversion = total > 0 ? Math.round((attended / total) * 100) : null;

    const hasTests = (event.maxTestScore ?? 0) > 0 || testScorePctCount > 0;
    const averageTestScore = testScorePctCount > 0 ? Math.round(testScoreSum / testScorePctCount) : null;
    const testCompletionRate = hasTests && total > 0
      ? Math.round((testCompleted / total) * 100)
      : null;

    return {
      totalRegistrations: total,
      approved,
      pending,
      rejected,
      cancelled,
      attended,
      approvalRate,
      attendanceRate,
      endToEndConversion,
      averageTestScore,
      testCompletionRate,
    };
  }

  private computeDemographics(
    registrations: AnalyticsRegistration[],
  ): IEventAnalyticsDemographics {
    // ---- gender ----
    const genderMap: Record<string, number> = { MALE: 0, FEMALE: 0, UNKNOWN: 0 };
    let knownGender = 0;
    for (const r of registrations) {
      const g = r.user?.gender;
      if (g === Gender.MALE) {
        genderMap.MALE++;
        knownGender++;
      } else if (g === Gender.FEMALE) {
        genderMap.FEMALE++;
        knownGender++;
      } else {
        genderMap.UNKNOWN++;
      }
    }

    const gender: IEventAnalyticsBucket[] = [
      { key: 'MALE', label: 'Male', count: genderMap.MALE },
      { key: 'FEMALE', label: 'Female', count: genderMap.FEMALE },
      { key: 'UNKNOWN', label: 'Unknown', count: genderMap.UNKNOWN },
    ];

    // ---- ageGroups ----
    const ageMap = new Map<AnalyticsAgeGroup, number>(AGE_GROUP_ORDER.map((k) => [k, 0]));
    let knownAge = 0;
    for (const r of registrations) {
      const bucket = r.ageGroup;
      ageMap.set(bucket, (ageMap.get(bucket) ?? 0) + 1);
      if (bucket !== AnalyticsAgeGroup.UNKNOWN) knownAge++;
    }
    const ageGroups: IEventAnalyticsBucket[] = AGE_GROUP_ORDER.map((k) => ({
      key: k,
      label: AGE_GROUP_LABELS[k],
      count: ageMap.get(k) ?? 0,
    }));

    // ---- regions ----
    const regionMap = new Map<string, number>();
    let knownRegion = 0;
    let unknownRegion = 0;
    for (const r of registrations) {
      const region = r.user?.region?.trim() || null;
      if (region) {
        regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
        knownRegion++;
      } else {
        unknownRegion++;
      }
    }
    const sortedRegions = Array.from(regionMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top = sortedRegions.slice(0, REGION_TOP_LIMIT);
    const rest = sortedRegions.slice(REGION_TOP_LIMIT).reduce((sum, [, c]) => sum + c, 0);

    const regions: IEventAnalyticsBucket[] = top.map(([key, count]) => ({
      key,
      label: key,
      count,
    }));
    if (rest > 0) regions.push({ key: '__other__', label: 'Other', count: rest });
    if (unknownRegion > 0) regions.push({ key: '__unknown__', label: 'Unknown', count: unknownRegion });

    return {
      gender,
      ageGroups,
      regions,
      hasGenderData: knownGender > 0,
      hasAgeData: knownAge > 0,
      hasRegionData: knownRegion > 0,
    };
  }

  private computeTrend(
    registrations: AnalyticsRegistration[],
    event: { startDate: Date; endDate: Date; createdAt: Date },
  ): IEventAnalyticsTrendPoint[] {
    if (registrations.length === 0) return [];

    // Диапазон: от первой регистрации (или создания эвента) до сегодня/конца эвента.
    const firstReg = registrations[0]?.createdAt ?? event.createdAt;
    const start = startOfUtcDay(firstReg);
    const lastObserved = registrations.reduce(
      (max, r) => (r.createdAt > max ? r.createdAt : max),
      firstReg,
    );
    const end = startOfUtcDay(lastObserved);

    const dayMs = 86_400_000;
    const dayCount = Math.min(
      TREND_LIMIT_DAYS,
      Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1),
    );

    const buckets = new Map<string, IEventAnalyticsTrendPoint>();
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start.getTime() + i * dayMs);
      const key = formatDateKey(d);
      buckets.set(key, {
        date: key,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
      });
    }

    for (const r of registrations) {
      const key = formatDateKey(r.createdAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total++;
      switch (r.status) {
        case RegistrationStatus.APPROVED:
          bucket.approved++;
          break;
        case RegistrationStatus.PENDING:
          bucket.pending++;
          break;
        case RegistrationStatus.REJECTED:
          bucket.rejected++;
          break;
        case RegistrationStatus.CANCELLED:
          bucket.cancelled++;
          break;
      }
    }

    return Array.from(buckets.values());
  }

  private computeTests(
    registrations: AnalyticsRegistration[],
    event: { maxTestScore: number | null },
  ): IEventAnalyticsTests {
    const eventHasTests = (event.maxTestScore ?? 0) > 0;

    const started = registrations.filter((r) => r.testScore !== null || r.testCompletedAt !== null).length;
    const completedRows = registrations.filter((r) => r.testCompletedAt !== null);
    const completed = completedRows.length;
    const passed = registrations.filter((r) => r.testPassed === true).length;
    const failed = registrations.filter(
      (r) => r.testPassed === false && r.testCompletedAt !== null,
    ).length;

    const scorePercents: number[] = [];
    for (const r of registrations) {
      const pct = scorePercent(r.testScore, r.testMaxScore ?? event.maxTestScore);
      if (pct !== null) scorePercents.push(pct);
    }

    const available = eventHasTests || scorePercents.length > 0;

    let averageScore: number | null = null;
    let minScore: number | null = null;
    let maxScore: number | null = null;
    if (scorePercents.length > 0) {
      averageScore = Math.round(scorePercents.reduce((s, v) => s + v, 0) / scorePercents.length);
      minScore = Math.min(...scorePercents);
      maxScore = Math.max(...scorePercents);
    }

    const distribution = SCORE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: scorePercents.filter((v) => v >= b.min && v <= b.max).length,
    }));

    const passRate = completed > 0 ? Math.round((passed / completed) * 100) : null;

    return {
      available,
      started,
      completed,
      passed,
      failed,
      averageScore,
      minScore,
      maxScore,
      scoreDistribution: distribution,
      passRate,
    };
  }

  private computeFunnel(
    registrations: AnalyticsRegistration[],
    event: { maxTestScore: number | null },
  ): IEventAnalyticsFunnel {
    const registered = registrations.length;
    const approved = registrations.filter((r) => r.status === RegistrationStatus.APPROVED).length;
    const checkedIn = registrations.filter(
      (r) => r.status === RegistrationStatus.APPROVED && (r.attendances?.length ?? 0) > 0,
    ).length;

    const eventHasTests = (event.maxTestScore ?? 0) > 0;
    const testCompleted = eventHasTests
      ? registrations.filter((r) => r.testCompletedAt !== null).length
      : null;

    return { registered, approved, checkedIn, testCompleted };
  }

  private computeUnavailable(
    demographics: IEventAnalyticsDemographics,
    tests: IEventAnalyticsTests,
    questions: IEventQuestionsAnalytics,
    trend: IEventAnalyticsTrendPoint[],
  ): IEventAnalyticsMeta['unavailable'] {
    const out: IEventAnalyticsMeta['unavailable'] = [];
    if (!demographics.hasGenderData) out.push('gender');
    if (!demographics.hasAgeData) out.push('age');
    if (!demographics.hasRegionData) out.push('region');
    if (!tests.available) out.push('tests');
    if (!questions.available) out.push('questions');
    if (trend.length === 0) out.push('registrationTrend');
    return out;
  }

  /**
   * Aggregates answers per question. Skips RHETORICAL items (informational, not answers) and
   * skips registrations that were never approved past the answer-submission point — we use the
   * full filtered cohort, because organizers want to know what the audience that registered said,
   * not only those approved.
   */
  private computeQuestions(
    registrations: AnalyticsRegistrationWithAnswers[],
    questionDefs: QuestionDef[],
  ): IEventQuestionsAnalytics {
    // Drop informational ("текст для отображения") — those have no answers by design.
    const answerable = questionDefs.filter((q) => q.category !== QuestionCategory.RHETORICAL);

    if (answerable.length === 0) {
      return { available: false, totalQuestions: 0, questions: [] };
    }

    // Index answers by questionId for O(N) aggregation.
    const answersByQuestion = new Map<string, string[]>();
    for (const r of registrations) {
      for (const a of r.answers) {
        if (!answersByQuestion.has(a.questionId)) answersByQuestion.set(a.questionId, []);
        if (a.answer && a.answer.trim()) {
          answersByQuestion.get(a.questionId)!.push(a.answer);
        }
      }
    }

    const totalRegs = registrations.length;
    const out: IEventQuestionAnalytics[] = answerable.map((q) => {
      const raw = answersByQuestion.get(q.id) ?? [];
      const answeredCount = raw.length;
      const skippedCount = q.isRequired ? 0 : Math.max(0, totalRegs - answeredCount);

      const base: IEventQuestionAnalytics = {
        questionId: q.id,
        question: q.question,
        type: q.type,
        category: q.category,
        isRequired: q.isRequired,
        answeredCount,
        skippedCount,
      };

      if (q.type === QuestionType.SELECT) {
        base.options = aggregateSelectOptions(q.options, raw);
      } else if (q.type === QuestionType.CHECKBOX) {
        base.options = aggregateCheckboxOptions(q.options, raw);
      } else if (q.type === QuestionType.NUMBER) {
        base.numberStats = aggregateNumberAnswers(raw);
      }

      return base;
    });

    return {
      available: true,
      totalQuestions: out.length,
      questions: out,
    };
  }
}

// ============================================================================
// Local helpers
// ============================================================================

type AnalyticsRegistration = {
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
  ageGroup: AnalyticsAgeGroup;
};

type AnalyticsRegistrationWithAnswers = AnalyticsRegistration & {
  answers: { questionId: string; answer: string }[];
};

type QuestionDef = {
  id: string;
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired: boolean;
  options: string[];
};

/**
 * SELECT — single value per registration. Count exact matches against each defined option.
 * Anything unrecognised falls into an `__other__` bucket so legacy/edited options don't disappear
 * silently.
 */
function aggregateSelectOptions(
  defined: string[],
  answers: string[],
): Array<{ option: string; count: number }> {
  const counts = new Map<string, number>(defined.map((o) => [o, 0]));
  let other = 0;
  for (const raw of answers) {
    const v = raw.trim();
    if (counts.has(v)) {
      counts.set(v, counts.get(v)! + 1);
    } else if (v) {
      other++;
    }
  }
  const out = defined.map((option) => ({ option, count: counts.get(option) ?? 0 }));
  if (other > 0) out.push({ option: '__other__', count: other });
  return out;
}

/**
 * CHECKBOX — comma-separated values per registration (mirrors registrations.service.ts encoding).
 * Same buckets as SELECT, but count each selected option independently — totals may exceed
 * `answeredCount` because of multi-select.
 */
function aggregateCheckboxOptions(
  defined: string[],
  answers: string[],
): Array<{ option: string; count: number }> {
  const counts = new Map<string, number>(defined.map((o) => [o, 0]));
  let other = 0;
  for (const raw of answers) {
    const picks = raw
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    for (const pick of picks) {
      if (counts.has(pick)) counts.set(pick, counts.get(pick)! + 1);
      else other++;
    }
  }
  const out = defined.map((option) => ({ option, count: counts.get(option) ?? 0 }));
  if (other > 0) out.push({ option: '__other__', count: other });
  return out;
}

/**
 * NUMBER — parse loosely. Non-numeric answers are skipped (organizer should not see "NaN").
 */
function aggregateNumberAnswers(
  answers: string[],
): { min: number; max: number; avg: number; count: number } | undefined {
  const nums: number[] = [];
  for (const a of answers) {
    const v = Number(a.replace(',', '.').trim());
    if (Number.isFinite(v)) nums.push(v);
  }
  if (nums.length === 0) return undefined;
  const sum = nums.reduce((s, v) => s + v, 0);
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: Math.round((sum / nums.length) * 100) / 100,
    count: nums.length,
  };
}

function parseDateOnly(input: string): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Возраст вычисляется по году рождения относительно "сегодня" (UTC). Если dateOfBirth = null —
 * UNKNOWN. Это интенциональный leak: если организатор хочет точную аналитику, нужно поощрять
 * пользователей заполнять поле в профиле.
 */
export function bucketAge(dob: Date | null): AnalyticsAgeGroup {
  if (!dob) return AnalyticsAgeGroup.UNKNOWN;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  if (age < 0 || age > 130) return AnalyticsAgeGroup.UNKNOWN;
  if (age < 18) return AnalyticsAgeGroup.UNDER_18;
  if (age <= 21) return AnalyticsAgeGroup.AGE_18_21;
  if (age <= 25) return AnalyticsAgeGroup.AGE_22_25;
  if (age <= 30) return AnalyticsAgeGroup.AGE_26_30;
  if (age <= 35) return AnalyticsAgeGroup.AGE_31_35;
  if (age <= 45) return AnalyticsAgeGroup.AGE_36_45;
  return AnalyticsAgeGroup.AGE_46_PLUS;
}

function scorePercent(score: number | null, max: number | null): number | null {
  if (score === null || max === null || max <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}
