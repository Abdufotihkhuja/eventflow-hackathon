// ================================
// Attendance Types
// ================================

export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const

export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus]

export type AttendanceRecord = {
  id: string
  eventId: string
  registrationId: string
  date: string // ISO date (YYYY-MM-DD)
  status: AttendanceStatus
  checkInTime?: string // ISO datetime
  checkOutTime?: string // ISO datetime
  notes?: string
  markedBy?: string // userId кто отметил
  createdAt: string
  updatedAt: string

  // Связанные данные
  registration?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }

  // Ссылки на билеты (возвращаются при check-in)
  ticketUrls?: {
    branded: string // URL для скачивания фирменного билета
    simple: string // URL для скачивания простого билета
  }
}

export type DailyAttendanceSummary = {
  date: string
  total: number
  present: number
  absent: number
  late: number
  excused: number
  rate: number // процент посещаемости
}

// ================================
// Request/Response Types
// ================================

export type MarkAttendanceRequest = {
  registrationId: string
  date: string
  status: AttendanceStatus
  checkInTime?: string
  notes?: string
}

export type BulkMarkAttendanceRequest = {
  date: string
  records: {
    registrationId: string
    status: AttendanceStatus
    checkInTime?: string
    notes?: string
  }[]
}

export type BulkMarkAttendanceResponse = {
  marked: number
  failed: number
  errors?: { registrationId: string; error: string }[]
}

export type GetAttendanceParams = {
  date?: string // Фильтр по дате
  status?: AttendanceStatus
  search?: string
  page?: number
  limit?: number
}

export type GetAttendanceResponse = {
  records: AttendanceRecord[]
  total: number
  page: number
  limit: number
  dates: string[] // Доступные даты события
  summary: DailyAttendanceSummary
}

export type AttendanceByDate = {
  date: string // ISO date (YYYY-MM-DD)
  totalRegistrations: number
  totalAttended: number
  attendanceRate: number // процент посещаемости
}

export type GetAttendanceStatsResponse = {
  totalRegistrations: number // Общее количество зарегистрированных
  totalAttended: number // Общее количество посетивших
  attendanceByDate: AttendanceByDate[] // Статистика по датам
}

export type CheckInRequest = {
  registrationId: string
  date?: string // по умолчанию сегодня
}

export type CheckOutRequest = {
  registrationId: string
  date?: string
}

export type QRCheckInRequest = {
  qrCode: string // может содержать registrationId или специальный токен
  date?: string
}

/** Ответ GET /events/:eventId/attendance/check-in-landing-qr (QR «один для всех», docs/CHECK_IN_FRONTEND.md) */
export type CheckInLandingQrResponse = {
  qrCode: string // data:image/png;base64,... — изображение QR, в нём ссылка на publicUrl/check-in?eventId=...
}

// ================================
// POST /api/v1/attendance/check-in (200)
// ================================

export type CheckInByCodeAttendance = {
  id: string
  checkInAt: string // ISO datetime
  checkInDate: string // ISO date
}

export type CheckInByCodeParticipant = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string // PARTICIPANT, etc.
}

export type CheckInByCodeRegistration = {
  id: string
  status: string // APPROVED, etc.
}

export type CheckInByCodeTicketUrls = {
  branded: string // относительный путь
  simple: string
}

/** Ответ 200 POST /api/v1/attendance/check-in */
export type CheckInByCodeResponse = {
  attendance: CheckInByCodeAttendance
  participant: CheckInByCodeParticipant
  registration: CheckInByCodeRegistration
  ticketUrls: CheckInByCodeTicketUrls
}
