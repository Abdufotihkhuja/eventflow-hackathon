/**
 * Event analytics (org session) — the mobile half of the web cabinet's
 * «Аналитика». One aggregated, PII-free request per event.
 *
 * The response is honest about what it cannot answer: `meta.unavailable` lists
 * the blocks the data does not support (no ages on file, no test, no questions),
 * and `demographics.hasXData` says the same per block. The screen shows those
 * blocks as "нет данных" instead of drawing an all-zero chart, because an empty
 * bar chart reads as "nobody registered" rather than "we don't know".
 *
 * Filters exist server-side (period, status, gender, age, region, test status,
 * search). The phone exposes the two an organizer actually adjusts on the move —
 * period and status — and leaves the rest to the desk.
 */
import { useQuery } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

export interface AnalyticsBucket {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsOverview {
  totalRegistrations: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
  attended: number;
  approvalRate: number;
  attendanceRate: number;
  endToEndConversion: number;
  averageTestScore: number | null;
  testCompletionRate: number | null;
}

export interface AnalyticsTrendPoint {
  date: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
}

export interface EventAnalytics {
  overview: AnalyticsOverview;
  demographics: {
    gender: AnalyticsBucket[];
    ageGroups: AnalyticsBucket[];
    regions: AnalyticsBucket[];
    hasGenderData: boolean;
    hasAgeData: boolean;
    hasRegionData: boolean;
  };
  registrationTrend: AnalyticsTrendPoint[];
  tests: {
    available: boolean;
    started: number;
    completed: number;
    passed: number;
    failed: number;
    averageScore: number | null;
    minScore: number | null;
    maxScore: number | null;
    scoreDistribution: AnalyticsBucket[];
    passRate: number | null;
  };
  questions: {
    available: boolean;
    totalQuestions: number;
    questions: {
      questionId: string;
      question: string;
      type: string;
      answersCount: number;
      options?: AnalyticsBucket[];
      average?: number | null;
      min?: number | null;
      max?: number | null;
    }[];
  };
  funnel: {
    registered: number;
    approved: number;
    checkedIn: number;
    testCompleted: number | null;
  };
  meta: {
    isEmpty: boolean;
    /** Blocks the data cannot support: "age" | "region" | "tests" | "questions". */
    unavailable: string[];
    generatedAt: string;
  };
}

export interface AnalyticsFilter {
  dateFrom?: string;
  dateTo?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}

export const analyticsKeys = {
  all: ["event-analytics"] as const,
  one: (eventId: string, filter: AnalyticsFilter) => ["event-analytics", eventId, filter] as const,
};

export function useEventAnalyticsQuery(eventId: string | undefined, filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.one(eventId ?? "", filter),
    queryFn: async (): Promise<EventAnalytics> => {
      const q = new URLSearchParams();
      if (filter.dateFrom) q.set("dateFrom", filter.dateFrom);
      if (filter.dateTo) q.set("dateTo", filter.dateTo);
      if (filter.status) q.set("status", filter.status);
      const suffix = q.toString() ? `?${q.toString()}` : "";
      return (await apiTransport({
        method: "GET",
        url: `/api/v1/events/${eventId}/analytics${suffix}`,
      })) as EventAnalytics;
    },
    enabled: Boolean(eventId),
  });
}

/** Largest count in a bucket set — the scale every bar is drawn against. */
export function peak(buckets: AnalyticsBucket[]): number {
  return buckets.reduce((max, b) => (b.count > max ? b.count : max), 0);
}
