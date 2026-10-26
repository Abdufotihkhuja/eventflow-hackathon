/**
 * API сервис для управления посещаемостью событий
 */

import { request } from '@api/apiClient'

import type {
  AttendanceRecord,
  MarkAttendanceRequest,
  BulkMarkAttendanceRequest,
  BulkMarkAttendanceResponse,
  GetAttendanceParams,
  GetAttendanceResponse,
  GetAttendanceStatsResponse,
  CheckInRequest,
  CheckOutRequest,
  QRCheckInRequest,
  CheckInLandingQrResponse,
  CheckInByCodeResponse,
} from './attendance.types'

const getAttendanceUrl = (eventId: string) => `/v1/events/${eventId}/attendance`

/**
 * QR на бейджах/билетах кодирует полный URL (`https://…/check-in?code=…`),
 * и сканеры вставляют его в поле кода как есть. Если пришёл http(s)-URL —
 * достаём значение `?code=` (URL-декодирование выполняет new URL);
 * иначе отправляем строку без изменений.
 */
function extractQrCode(raw: string): string {
  const value = raw.trim()
  if (!/^https?:\/\//i.test(value)) return value
  try {
    const code = new URL(value).searchParams.get('code')
    return code && code.trim() ? code.trim() : value
  } catch {
    return value
  }
}

export const attendanceService = {
  /** Получить записи посещаемости */
  getAttendance: (eventId: string, params?: GetAttendanceParams) =>
    request<GetAttendanceResponse>({
      method: 'GET',
      url: getAttendanceUrl(eventId),
      params,
    }),

  /** Получить статистику посещаемости */
  getAttendanceStats: (eventId: string) =>
    request<GetAttendanceStatsResponse>({
      method: 'GET',
      url: `${getAttendanceUrl(eventId)}/stats`,
    }),

  /** Отметить посещаемость */
  markAttendance: (eventId: string, data: MarkAttendanceRequest) =>
    request<AttendanceRecord, MarkAttendanceRequest>({
      method: 'POST',
      url: `${getAttendanceUrl(eventId)}/mark`,
      data,
    }),

  /** Массовая отметка посещаемости */
  bulkMarkAttendance: (eventId: string, data: BulkMarkAttendanceRequest) =>
    request<BulkMarkAttendanceResponse, BulkMarkAttendanceRequest>({
      method: 'POST',
      url: `${getAttendanceUrl(eventId)}/bulk-mark`,
      data,
    }),

  /** Check-in участника */
  checkIn: (eventId: string, data: CheckInRequest) =>
    request<AttendanceRecord, CheckInRequest>({
      method: 'POST',
      url: `${getAttendanceUrl(eventId)}/check-in`,
      data,
    }),

  /** Check-out участника */
  checkOut: (eventId: string, data: CheckOutRequest) =>
    request<AttendanceRecord, CheckOutRequest>({
      method: 'POST',
      url: `${getAttendanceUrl(eventId)}/check-out`,
      data,
    }),

  /** Check-in по QR коду (для конкретного события) */
  qrCheckIn: (eventId: string, data: QRCheckInRequest) =>
    request<AttendanceRecord, QRCheckInRequest>({
      method: 'POST',
      url: `${getAttendanceUrl(eventId)}/qr-check-in`,
      data,
    }),

  /** Глобальный check-in по QR коду (из билета). Ответ 200: attendance, participant, registration, ticketUrls */
  checkInByCode: (qrCode: string) =>
    request<CheckInByCodeResponse, { qrCode: string }>({
      method: 'POST',
      url: '/v1/attendance/check-in',
      data: { qrCode: extractQrCode(qrCode) },
    }),

  /** QR «один для всех» — участники сканируют при входе (GET .../check-in-landing-qr, docs/CHECK_IN_FRONTEND.md) */
  getCheckInLandingQr: (eventId: string) =>
    request<CheckInLandingQrResponse>({
      method: 'GET',
      url: `${getAttendanceUrl(eventId)}/check-in-landing-qr`,
    }),

  /** Обновить запись посещаемости */
  updateAttendance: (eventId: string, recordId: string, data: Partial<MarkAttendanceRequest>) =>
    request<AttendanceRecord, Partial<MarkAttendanceRequest>>({
      method: 'PATCH',
      url: `${getAttendanceUrl(eventId)}/${recordId}`,
      data,
    }),

  /** Удалить запись посещаемости */
  deleteAttendance: (eventId: string, recordId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getAttendanceUrl(eventId)}/${recordId}`,
    }),
} as const
