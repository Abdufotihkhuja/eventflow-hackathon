// ================================
// Event Analytics Types — must mirror apps/api/src/modules/event-analytics/event-analytics.service.ts
// (Backend uses class-validator DTOs; we maintain hand-rolled types here because the SDK is not
// regenerated as part of this change. If the backend shape evolves, update both sides.)
// ================================

import type { RegistrationStatus } from './registration.types'

export type AnalyticsGenderFilter = 'MALE' | 'FEMALE' | 'UNKNOWN'

export type AnalyticsAgeGroup =
  | 'UNDER_18'
  | 'AGE_18_21'
  | 'AGE_22_25'
  | 'AGE_26_30'
  | 'AGE_31_35'
  | 'AGE_36_45'
  | 'AGE_46_PLUS'
  | 'UNKNOWN'

export type AnalyticsTestStatusFilter = 'NOT_STARTED' | 'COMPLETED' | 'PASSED' | 'FAILED'

/** Same canonical region keys as packages/analytics/lib/uz-regions; `__unknown__` matches users with no region. */
export type AnalyticsRegionFilter =
  | 'karakalpakstan'
  | 'khorezm'
  | 'navoiy'
  | 'bukhara'
  | 'samarkand'
  | 'qashqadaryo'
  | 'surxondaryo'
  | 'jizzakh'
  | 'sirdaryo'
  | 'tashkent_region'
  | 'tashkent_city'
  | 'namangan'
  | 'andijan'
  | 'fergana'
  | '__unknown__'

export type EventAnalyticsQuery = {
  dateFrom?: string
  dateTo?: string
  status?: RegistrationStatus
  gender?: AnalyticsGenderFilter
  ageGroup?: AnalyticsAgeGroup
  testStatus?: AnalyticsTestStatusFilter
  region?: AnalyticsRegionFilter
  search?: string
}

export type AnalyticsBucket = {
  key: string
  label: string
  count: number
}

export type AnalyticsOverview = {
  totalRegistrations: number
  approved: number
  pending: number
  rejected: number
  cancelled: number
  attended: number
  approvalRate: number | null
  attendanceRate: number | null
  endToEndConversion: number | null
  averageTestScore: number | null
  testCompletionRate: number | null
}

export type AnalyticsDemographics = {
  gender: AnalyticsBucket[]
  ageGroups: AnalyticsBucket[]
  regions: AnalyticsBucket[]
  hasGenderData: boolean
  hasAgeData: boolean
  hasRegionData: boolean
}

export type AnalyticsTrendPoint = {
  date: string // YYYY-MM-DD
  total: number
  approved: number
  pending: number
  rejected: number
  cancelled: number
}

export type AnalyticsTests = {
  available: boolean
  started: number
  completed: number
  passed: number
  failed: number
  averageScore: number | null
  minScore: number | null
  maxScore: number | null
  scoreDistribution: AnalyticsBucket[]
  passRate: number | null
}

export type AnalyticsFunnel = {
  registered: number
  approved: number
  checkedIn: number
  testCompleted: number | null
}

export type AnalyticsQuestionType = 'TEXT' | 'NUMBER' | 'SELECT' | 'CHECKBOX' | 'TEXTAREA'

export type AnalyticsQuestionCategory =
  | 'OPEN'
  | 'CLOSED'
  | 'ALTERNATIVE'
  | 'RHETORICAL'

export type AnalyticsQuestion = {
  questionId: string
  question: string
  type: AnalyticsQuestionType
  category: AnalyticsQuestionCategory
  isRequired: boolean
  answeredCount: number
  skippedCount: number
  options?: Array<{ option: string; count: number }>
  numberStats?: { min: number; max: number; avg: number; count: number }
}

export type AnalyticsQuestions = {
  available: boolean
  totalQuestions: number
  questions: AnalyticsQuestion[]
}

export type AnalyticsMeta = {
  isEmpty: boolean
  unavailable: Array<
    'gender' | 'age' | 'region' | 'tests' | 'questions' | 'attendance' | 'registrationTrend'
  >
  generatedAt: string
}

export type EventAnalyticsResponse = {
  overview: AnalyticsOverview
  demographics: AnalyticsDemographics
  registrationTrend: AnalyticsTrendPoint[]
  tests: AnalyticsTests
  questions: AnalyticsQuestions
  funnel: AnalyticsFunnel
  meta: AnalyticsMeta
}
