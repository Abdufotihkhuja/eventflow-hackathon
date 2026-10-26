/**
 * API-сервис для работы с регистрациями пользователя
 * Endpoints согласно EventFlow Swagger API v1
 */

import { apiDelete, apiGet, apiPost } from "../lib/apiClient";
import { toUtcIsoString } from "../lib/date";

import { publicSdk } from "./sdk";

/** Файл-ответ, загруженный участником (до отправки регистрации). */
export interface RegistrationAnswerFile {
  id: string;
  questionId: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: "PENDING" | "ATTACHED";
  uploadedAt: string;
}

// ============================================================================
// Типы регистраций
// ============================================================================

export type RegistrationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "ATTENDED"
  | "WAITLISTED";

export interface RegistrationEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  address?: string;
  imageUrl?: string;
  category?: string;
  format: "ONLINE" | "OFFLINE" | "HYBRID";
  isFree: boolean;
  price?: number;
  currency?: string;
}

export interface RegistrationUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface RegistrationAnswer {
  questionId: string;
  questionLabel: string;
  value: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  ticketNumber?: string;
  qrCode?: string;
  registeredAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  checkedInAt?: string;
  waitlistPosition?: number;
  rejectionReason?: string;
  answers?: RegistrationAnswer[];
  event: RegistrationEvent;
  user?: RegistrationUser;
}

export interface RegistrationQrResponse {
  qrCode: string;
  ticketNumber: string;
  eventTitle: string;
  eventDate: string;
  userName: string;
  validUntil?: string;
}

// ============================================================================
// Типы запросов
// ============================================================================

/** Ответ на вопрос регистрации */
export interface RegistrationAnswerDto {
  questionId: string;
  answer: string;
}

export interface CreateRegistrationDto {
  /** Ответы на вопросы регистрации */
  answers?: RegistrationAnswerDto[];
  /** Роль: PARTICIPANT, SPEAKER, MENTOR (по умолчанию PARTICIPANT) */
  role?: RegistrationRole;
  /** Дата начала перелёта/дороги (ISO Date) */
  travelStartDate?: string;
  /** Дата окончания перелёта/дороги (ISO Date) */
  travelEndDate?: string;
  /** Дни на подготовку (0–30) */
  preparationDays?: number;
}

/**
 * Роль участника на мероприятии
 */
export type RegistrationRole = "PARTICIPANT" | "SPEAKER" | "MENTOR";

export interface RegistrationResponse {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  ticketNumber?: string;
  qrCode?: string;
  registeredAt: string;
  waitlistPosition?: number;
  message?: string;
}

export interface CancelRegistrationResponse {
  message: string;
  success: boolean;
}

// ============================================================================
// Типы заказа билета (M-4 / P-15)
// ============================================================================

/** Статус заказа билета (Order.status глазами покупателя). */
export type TicketOrderStatus =
  | "REQUESTED"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

/**
 * Заказ билета глазами покупателя (BuyerTicketOrderDto): комиссия платформы
 * не раскрывается; деньги — строка минорных единиц (тийины, D-3).
 */
export interface TicketOrder {
  id: string;
  status: TicketOrderStatus;
  /** Сумма в тийинах строкой (D-3 string-on-wire). */
  amountMinor: string;
  currency: string;
  /** Бронь места до (ISO 8601); null — брони нет. */
  holdExpiresAt: string | null;
  /** Доступна ли онлайн-оплата через VIA (тумблеры провайдера на бэке). */
  viaAvailable: boolean;
}

/** Старт оплаты VIA: hosted-ссылка платёжной страницы провайдера. */
export interface ViaPaymentStart {
  orderId: string;
  invoiceId: string;
  paymentUrl: string;
  holdExpiresAt: string | null;
}

/** Итог серверной сверки оплаты VIA (единственный доверенный источник). */
export interface ViaPaymentConfirmation {
  orderId: string;
  eventId: string | null;
  orderStatus: TicketOrderStatus;
  invoiceStatus: "DRAFT" | "OPEN" | "PAID" | "EXPIRED" | "CANCEL" | "UNKNOWN";
  paid: boolean;
}

/**
 * Машинный код 409 «билет уже оплачен». Тело ошибки — { message, code,
 * details }: глобальный AllExceptionsFilter пропускает наружу только эти
 * поля, UI ветвится строго по code, не по тексту message.
 */
export const TICKET_ALREADY_PAID_CODE = "TICKET_ALREADY_PAID";

export const REGISTRATION_QUERY_KEYS = {
  all: ["registrations"] as const,
  qr: (registrationId: string) =>
    [...REGISTRATION_QUERY_KEYS.all, "qr", registrationId] as const,
} as const;

// ============================================================================
// Registration Service
// ============================================================================

export const registrationService = {
  /**
   * Зарегистрироваться на мероприятие
   * POST /api/v1/events/{eventId}/register
   * Требует авторизации.
   * Для событий INVITE_ONLY передайте inviteCode в query.
   */
  register: async (
    eventId: string,
    data?: CreateRegistrationDto,
    options?: { inviteCode?: string }
  ): Promise<RegistrationResponse> => {
    const payload = data
      ? {
          ...data,
          travelStartDate: data.travelStartDate
            ? toUtcIsoString(data.travelStartDate)
            : data.travelStartDate,
          travelEndDate: data.travelEndDate
            ? toUtcIsoString(data.travelEndDate)
            : data.travelEndDate,
        }
      : {};
    return publicSdk.registrations.register(
      eventId,
      payload as never,
      options
    ) as unknown as Promise<RegistrationResponse>;
  },

  /**
   * Загрузить файл-ответ на вопрос FILE_UPLOAD (до отправки регистрации).
   * POST /api/v1/events/{eventId}/registration-files/{questionId} (multipart).
   * Требует авторизации.
   */
  uploadAnswerFile: async (
    eventId: string,
    questionId: string,
    file: File
  ): Promise<RegistrationAnswerFile> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<RegistrationAnswerFile>(
      `/api/v1/events/${eventId}/registration-files/${questionId}`,
      formData
    );
  },

  /**
   * Удалить ранее загруженный файл-ответ (до отправки регистрации).
   * DELETE /api/v1/events/{eventId}/registration-files/{fileId}.
   */
  deleteAnswerFile: async (
    eventId: string,
    fileId: string
  ): Promise<void> => {
    await apiDelete(
      `/api/v1/events/${eventId}/registration-files/${fileId}`
    );
  },

  /**
   * Черновик регистрации: свои ещё не отправленные файлы.
   * GET /api/v1/events/{eventId}/registration-files/draft
   *
   * Форма опроса читает черновик на входе, чтобы предложить продолжить
   * прошлую попытку или начать заново.
   */
  getAnswerFilesDraft: async (
    eventId: string
  ): Promise<RegistrationAnswerFile[]> => {
    return apiGet<RegistrationAnswerFile[]>(
      `/api/v1/events/${eventId}/registration-files/draft`
    );
  },

  /**
   * Сбросить черновик регистрации: удалить свои ещё не отправленные файлы.
   * DELETE /api/v1/events/{eventId}/registration-files/draft
   *
   * Вызывается по выбору «начать заново»: иначе файлы прошлой незавершённой
   * попытки занимают лимит загрузок, а форма при этом выглядит пустой.
   * Файлы отправленной регистрации не затрагиваются.
   */
  resetAnswerFilesDraft: async (
    eventId: string
  ): Promise<{ message: string; removed: number }> => {
    return apiDelete<{ message: string; removed: number }>(
      `/api/v1/events/${eventId}/registration-files/draft`
    );
  },

  /**
   * Отменить свою регистрацию
   * PATCH /api/v1/registrations/{id}/cancel
   * Требует авторизации
   */
  cancelRegistration: async (
    registrationId: string
  ): Promise<CancelRegistrationResponse> => {
    return publicSdk.registrations.cancelRegistration(
      registrationId
    ) as unknown as Promise<CancelRegistrationResponse>;
  },

  /**
   * Получить QR-код для регистрации
   * GET /api/v1/registrations/{id}/qr
   * Требует авторизации
   */
  getRegistrationQr: async (
    registrationId: string
  ): Promise<RegistrationQrResponse> => {
    return publicSdk.registrations.getQrCode(
      registrationId
    ) as Promise<RegistrationQrResponse>;
  },

  /**
   * Оформить заказ на билет для своей PENDING-регистрации платного события
   * (M-4). POST /api/v1/registrations/{registrationId}/ticket-order
   * Идемпотентно: при живой броне возвращает тот же заказ; оплаченный
   * билет — 409 { code: "TICKET_ALREADY_PAID" }. Требует авторизации.
   *
   * Нарочно через apiPost, а не publicSdk.billing.checkoutTicket: транспорт
   * SDK в web-public сводит ошибки к plain Error без status/code, а UI
   * обязан ветвиться по машинному коду TICKET_ALREADY_PAID (прецедент —
   * attendanceService.selfCheckIn).
   */
  checkoutTicket: async (registrationId: string): Promise<TicketOrder> => {
    return apiPost<TicketOrder>(
      `/api/v1/registrations/${registrationId}/ticket-order`
    );
  },

  /**
   * Начать онлайн-оплату билета через VIA (M-5).
   * POST /api/v1/registrations/{registrationId}/ticket-order/via
   * Возвращает hosted-ссылку платёжной страницы VIA; 403 VIA_UNAVAILABLE —
   * провайдер выключен для организации события.
   */
  startViaPayment: async (
    registrationId: string,
    locale: string
  ): Promise<ViaPaymentStart> => {
    return apiPost<ViaPaymentStart>(
      `/api/v1/registrations/${registrationId}/ticket-order/via`,
      { locale }
    );
  },

  /**
   * Серверная сверка оплаты VIA после возврата покупателя.
   * POST /api/v1/registrations/{registrationId}/ticket-order/via/confirm
   * Браузерный возврат — только триггер: факт оплаты бэкенд перепроверяет
   * запросом статуса инвойса у VIA.
   */
  confirmViaPayment: async (
    registrationId: string
  ): Promise<ViaPaymentConfirmation> => {
    return apiPost<ViaPaymentConfirmation>(
      `/api/v1/registrations/${registrationId}/ticket-order/via/confirm`
    );
  },

  /**
   * Скачать билет регистрации в формате PDF (с авторизацией через заголовок)
   * GET /api/v1/registrations/{id}/ticket?design={design}
   * Использует public SDK с авторизацией.
   */
  downloadTicketAsBlob: async (
    registrationId: string,
    design: "branded" | "simple" = "branded"
  ): Promise<Blob> => {
    const ticket = await publicSdk.registrations.downloadTicket(registrationId);
    return ticket as Blob;
  },
};
