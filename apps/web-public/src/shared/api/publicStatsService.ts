/**
 * API сервис для публичной статистики платформы
 * Эндпоинты: /api/v1/public/*
 * Не требует авторизации
 */

import { apiGet } from "@shared/lib/apiClient";

// ==================== ТИПЫ ====================

/** Статистика с изменением (для активных событий) */
export interface PublicStatItem {
  value: number;
  change: number;
  period: string;
}

/** Статистика новых участников */
export interface PublicParticipantsStat {
  value: number;
  changePercent: number;
  changeType: string;
}

/** Статистика конверсии */
export interface PublicConversionStat {
  value: number;
  description: string;
}

/** Полная публичная статистика платформы */
export interface PlatformStats {
  /** Активные события */
  activeEvents: PublicStatItem;
  /** Новые участники */
  newParticipants: PublicParticipantsStat;
  /** Конверсия регистрации */
  registrationConversion: PublicConversionStat;
  /** Всего организаций на платформе */
  totalOrganizations: number;
  /** Всего участников на платформе */
  totalParticipants: number;
  /** Всего событий на платформе */
  totalEvents: number;
}

/** Публичная статистика организации (API_PUBLIC OrganizationPublicStatsDto) */
export interface OrganizationPublicStats {
  id: string;
  name: string;
  logoUrl?: string;
  activeEvents: PublicStatItem;
  newParticipants: PublicParticipantsStat;
  registrationConversion: PublicConversionStat;
  totalEvents: number;
  totalParticipants: number;
}

// ==================== QUERY KEYS ====================

export const PUBLIC_STATS_QUERY_KEYS = {
  /** Ключ для статистики платформы */
  platformStats: ["public", "stats"] as const,
  /** Ключ для статистики организации */
  organizationStats: (orgId: string) =>
    ["public", "organizations", orgId, "stats"] as const,
} as const;

// ==================== API СЕРВИС ====================

/**
 * Сервис для работы с публичной статистикой
 */
export const publicStatsService = {
  /**
   * Получить статистику платформы для лендинга
   * GET /api/v1/public/stats
   * Не требует авторизации
   */
  async getPlatformStats(): Promise<PlatformStats> {
    return apiGet<PlatformStats>("/api/v1/public/stats", { skipAuth: true });
  },

  /**
   * Получить публичную статистику организации
   * GET /api/v1/public/organizations/:id/stats
   * Не требует авторизации
   */
  async getOrganizationStats(
    orgId: string,
    locale?: "ru" | "uz" | "en"
  ): Promise<OrganizationPublicStats> {
    const query = locale ? `?locale=${locale}` : "";
    return apiGet<OrganizationPublicStats>(
      `/api/v1/public/organizations/${orgId}/stats${query}`,
      { skipAuth: true }
    );
  },
};
