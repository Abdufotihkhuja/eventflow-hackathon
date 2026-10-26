import { apiClient } from '@api/apiClient'
import type { MonthlyStatsResponse, StatsParams } from './stats.types'

export const statsService = {
  /**
   * Get monthly statistics
   * @param params - Query parameters (month, year)
   * @returns Monthly statistics
   */
  async getMonthlyStats(params?: StatsParams): Promise<MonthlyStatsResponse> {
    const queryString = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()}`
      : ''
    return apiClient.get<MonthlyStatsResponse>(`/api/v1/stats/monthly${queryString}`)
  },
}
