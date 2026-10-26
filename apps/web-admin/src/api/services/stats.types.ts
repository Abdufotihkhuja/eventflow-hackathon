/** Monthly statistics response */
export interface MonthlyStatsResponse {
  revenue: number | undefined
  subscriptions: number | undefined
  eventViews: number | undefined
  registeredParticipants: number | undefined
  participants: number | undefined
  previousMonthRevenue?: number
  previousMonthSubscriptions?: number
  previousMonthEventViews?: number
  previousMonthRegisteredParticipants?: number
  previousMonthParticipants?: number
}

/** Statistics request parameters */
export interface StatsParams {
  month?: number
  year?: number
}
