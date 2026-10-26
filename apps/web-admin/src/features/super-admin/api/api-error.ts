import type { ApiError } from '@api/types'

/**
 * Достаёт человекочитаемое сообщение из нормализованной ошибки API
 * (apiClient уже кладёт сообщение бэкенда в `.message`). Используется, чтобы
 * показать в тосте причину отказа гарда (self-delete, защищённый аккаунт,
 * неверная строка подтверждения и т.п.).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiError | undefined)?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }
  if (Array.isArray(message) && message.length > 0) {
    return String(message[0])
  }
  return fallback
}

/**
 * Машиночитаемый `code` из контракта ошибок AllExceptionsFilter
 * (`{ statusCode, message, code?, details? }` — apiClient кладёт всё тело в
 * `.details`). UI ветвится по code, а не по тексту (E-13/CR-13), например
 * PAYMENT_DUPLICATE_REF или BILLING_REQUEST_DUPLICATE.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  const body = (error as ApiError | undefined)?.details
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
