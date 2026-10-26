import type { MonthlyStatsResponse } from '@api/services'

/** Mock monthly statistics for development */
export const mockMonthlyStats: MonthlyStatsResponse = {
  revenue: 125_000,
  subscriptions: 542,
  eventViews: 8_932,
  registeredParticipants: 3_421,
  participants: 2_845,
  previousMonthRevenue: 98_500,
  previousMonthSubscriptions: 458,
  previousMonthEventViews: 7_214,
  previousMonthRegisteredParticipants: 2_876,
  previousMonthParticipants: 2_145,
}
