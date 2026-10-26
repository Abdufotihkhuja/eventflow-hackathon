/**
 * API-сервис для работы с сертификатами пользователя
 * Endpoints: /api/v1/account/me/certificates
 */

/** Фиксированный размер и формат сертификата за мероприятие (альбомная ориентация) */
export const CERTIFICATE_PDF_EXTENSION = ".pdf";
export const CERTIFICATE_PDF_WIDTH = 842;
export const CERTIFICATE_PDF_HEIGHT = 595;
/** Соотношение сторон для плейсхолдеров и превью (width/height) */
export const CERTIFICATE_PDF_ASPECT_RATIO =
  CERTIFICATE_PDF_WIDTH / CERTIFICATE_PDF_HEIGHT;

import { toUtcIsoString } from "../lib/date";
import { accountSdk, publicSdk } from "./sdk";

// ============================================================================
// Типы
// ============================================================================

/**
 * Сертификат пользователя
 */
export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expirationDate?: string;
  credentialId: string;
  verificationUrl?: string;
  downloadUrl?: string;
  hours?: number;
  description?: string;
  skills?: string[];
  /** Градиент для карточки (CSS class) */
  accent?: string;
  /** Иконка: shield | sparkles | bookmark */
  icon?: "shield" | "sparkles" | "bookmark";
  createdAt: string;
  updatedAt: string;
}

/** Фильтр сертификатов (API_USER) */
export type CertificateFilter = "all" | "verified" | "unverified";

/**
 * Параметры для получения списка сертификатов (API_USER GET me/certificates)
 */
export interface GetCertificatesParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: CertificateFilter;
  /** Локаль для локализованных бизнес-полей события (ru/uz/en) */
  locale?: string;
}

/**
 * Сертификат за мероприятие (элемент eventCertificates[] в ответе GET /me/certificates)
 */
export interface EventCertificate {
  id: string;
  registrationId: string;
  eventName: string;
  eventDate: string;
  certificateUrl: string;
  generatedAt: string;
  verificationCode: string;
}

/**
 * Статистика сертификатов (поле stats в ответе GET /me/certificates и GET /me/certificates/stats)
 */
export interface CertificatesStatsResponse {
  totalCertificates: number;
  verifiedCertificates: number;
  totalTrainingHours: number;
}

/**
 * Ответ GET /api/v1/account/me/certificates
 */
export interface CertificatesResponse {
  stats: CertificatesStatsResponse;
  certificates: Certificate[];
  eventCertificates: EventCertificate[];
}

/**
 * Данные для создания сертификата (API_USER CreateUserCertificateDto)
 */
export interface CreateCertificateDto {
  title: string;
  provider: string;
  description?: string;
  issueDate: string;
  expiryDate?: string;
  trainingHours?: number;
  credentialId?: string;
  credentialUrl?: string;
  certificateUrl?: string;
  skills?: string[];
  isVerified?: boolean;
  color?: string;
  /** Алиасы для обратной совместимости */
  issuer?: string;
  expirationDate?: string;
  verificationUrl?: string;
  downloadUrl?: string;
  hours?: number;
  accent?: string;
  icon?: "shield" | "sparkles" | "bookmark";
}

/**
 * Данные для обновления сертификата (Partial CreateUserCertificateDto)
 */
export interface UpdateCertificateDto {
  title?: string;
  provider?: string;
  description?: string;
  issueDate?: string;
  expiryDate?: string;
  trainingHours?: number;
  credentialId?: string;
  credentialUrl?: string;
  certificateUrl?: string;
  skills?: string[];
  isVerified?: boolean;
  color?: string;
  issuer?: string;
  expirationDate?: string;
  verificationUrl?: string;
  downloadUrl?: string;
  hours?: number;
  accent?: string;
  icon?: "shield" | "sparkles" | "bookmark";
}

/**
 * Ответ при создании/обновлении сертификата
 */
export interface CertificateResponse {
  certificate: Certificate;
  message: string;
}

/**
 * Ответ при удалении сертификата
 */
export interface DeleteCertificateResponse {
  message: string;
  success: boolean;
}

/**
 * Тело запроса публичной верификации (POST /api/v1/certificates/verify).
 * Достаточно одного из полей: code или certificateId.
 */
export interface VerifyCertificateRequest {
  code?: string;
  certificateId?: string;
}

/** Данные сертификата в ответе публичной верификации */
export interface CertificateVerifyPayload {
  id: string;
  eventName: string;
  recipientName: string;
  recipientEmail: string;
  issuedAt: string;
  eventDate: string;
  /** Организация-выдавшая (название + логотип) */
  organizerName?: string | null;
  organizerLogoUrl?: string | null;
  /** Роль получателя (Participant / Speaker / VIP …) */
  recipientRole?: string | null;
  /** Место/город события */
  eventLocation?: string | null;
}

/** Ответ публичной верификации (certificate только при valid === true) */
export interface VerifyCertificateResponse {
  valid: boolean;
  certificate?: CertificateVerifyPayload;
}

// ============================================================================
// Endpoints
// ============================================================================

export const CERTIFICATES_QUERY_KEYS = {
  all: ["certificates"] as const,
  list: (params?: GetCertificatesParams) =>
    [...CERTIFICATES_QUERY_KEYS.all, "list", params] as const,
  stats: () => [...CERTIFICATES_QUERY_KEYS.all, "stats"] as const,
  detail: (id: string) =>
    [...CERTIFICATES_QUERY_KEYS.all, "detail", id] as const,
} as const;

export const certificatesService = {
  /**
   * Получить сертификаты пользователя
   * GET /api/v1/account/me/certificates
   */
  getCertificates: async (
    params?: GetCertificatesParams
  ): Promise<CertificatesResponse> => {
    return accountSdk.certificates.getCertificates(
      params as never
    ) as unknown as Promise<CertificatesResponse>;
  },

  /**
   * Получить статистику сертификатов
   * GET /api/v1/account/me/certificates/stats
   */
  /**
   * GET /api/v1/account/me/certificates/stats — только статистика
   */
  getStats: async (): Promise<CertificatesStatsResponse> => {
    return accountSdk.certificates.getStats() as Promise<CertificatesStatsResponse>;
  },

  /**
   * Получить сертификат по ID
   * GET /api/v1/account/me/certificates/{id}
   */
  getCertificateById: async (id: string): Promise<Certificate> => {
    return accountSdk.certificates.getCertificateById(id) as unknown as Promise<Certificate>;
  },

  /**
   * Добавить сертификат
   * POST /api/v1/account/me/certificates
   */
  createCertificate: async (
    data: CreateCertificateDto
  ): Promise<CertificateResponse> => {
    const expiry = data.expiryDate ?? data.expirationDate;
    const body = {
      title: data.title,
      provider: data.provider ?? data.issuer,
      description: data.description,
      issueDate: data.issueDate ? toUtcIsoString(data.issueDate) : data.issueDate,
      expiryDate: expiry ? toUtcIsoString(expiry) : expiry,
      trainingHours: data.trainingHours ?? data.hours,
      credentialId: data.credentialId,
      credentialUrl: data.credentialUrl ?? data.verificationUrl,
      certificateUrl: data.certificateUrl ?? data.downloadUrl,
      skills: data.skills,
      isVerified: data.isVerified,
      color: data.color ?? data.accent,
    };
    const certificate = await accountSdk.certificates.createCertificate(body as never);
    return {
      certificate: certificate as unknown as Certificate,
      message: "Certificate created",
    };
  },

  /**
   * Обновить сертификат
   * PATCH /api/v1/account/me/certificates/{id}
   */
  updateCertificate: async (
    id: string,
    data: UpdateCertificateDto
  ): Promise<CertificateResponse> => {
    const payload = {
      ...data,
      issueDate: data.issueDate ? toUtcIsoString(data.issueDate) : data.issueDate,
      expiryDate: data.expiryDate
        ? toUtcIsoString(data.expiryDate)
        : data.expiryDate,
      expirationDate: data.expirationDate
        ? toUtcIsoString(data.expirationDate)
        : data.expirationDate,
    };
    const certificate = await accountSdk.certificates.updateCertificate(id, payload as never);
    return {
      certificate: certificate as unknown as Certificate,
      message: "Certificate updated",
    };
  },

  /**
   * Удалить сертификат
   * DELETE /api/v1/account/me/certificates/{id}
   */
  deleteCertificate: async (id: string): Promise<DeleteCertificateResponse> => {
    await accountSdk.certificates.deleteCertificate(id);
    return { message: "Certificate deleted", success: true };
  },

  /**
   * Скачать PDF сертификата за мероприятие
   * GET /api/v1/certificates/{certificateId}/download
   * Возвращает Blob; на бэкенде увеличивается downloadCount
   */
  downloadEventCertificate: async (
    certificateId: string
  ): Promise<Blob> => {
    return accountSdk.certificates.downloadCertificate(certificateId) as Promise<Blob>;
  },

  /**
   * Публичная верификация подлинности сертификата (без авторизации).
   * POST /api/v1/certificates/verify
   */
  verifyCertificatePublic: async (
    body: VerifyCertificateRequest
  ): Promise<VerifyCertificateResponse> => {
    return publicSdk.certificates.verifyPublic(
      body as never
    ) as Promise<VerifyCertificateResponse>;
  },
};
