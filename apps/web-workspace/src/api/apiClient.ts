import { api } from './config'
import { executeRefresh, redirectToLogin } from './apiAuthFlow'
import type { ApiError, ApiResponse, RequestConfig } from './types'

type ResponseEnvelope<T> = ApiResponse<T> | T

export async function request<T, D = unknown>(config: RequestConfig<D>): Promise<T> {
  try {
    const response = await api.request<ResponseEnvelope<T>>(config)
    return unwrapResponse(response.data)
  } catch (error) {
    const apiError = error as ApiError

    // Запасная обработка 401 (основная — в response interceptor в config.ts)
    if (apiError.status === 401 && !config.skipAuth) {
      const refreshedToken = await executeRefresh()

      if (refreshedToken) {
        return request<T, D>({ ...config })
      }

      redirectToLogin()
    }

    throw apiError
  }
}

function unwrapResponse<T>(payload: ResponseEnvelope<T>): T {
  // Если ответ содержит data + другие поля пагинации (total, page, etc.) — это не envelope, а реальный ответ
  // Не разворачиваем его
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const obj = payload as Record<string, unknown>
    // Если есть поля пагинации — это ответ со списком, возвращаем как есть
    if ('total' in obj || 'page' in obj || 'totalPages' in obj || 'limit' in obj) {
      return payload as T
    }
    // Иначе это envelope { data: T } — разворачиваем
    const { data } = payload as ApiResponse<T>
    return data
  }

  return payload as T
}

/**
 * API клиент с удобными методами
 */
export const apiClient = {
  get: <T>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<T> => {
    return request<T>({ ...config, method: 'GET', url })
  },

  post: <T, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<RequestConfig<D>, 'method' | 'url' | 'data'>
  ): Promise<T> => {
    return request<T, D>({ ...config, method: 'POST', url, data })
  },

  patch: <T, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<RequestConfig<D>, 'method' | 'url' | 'data'>
  ): Promise<T> => {
    return request<T, D>({ ...config, method: 'PATCH', url, data })
  },

  put: <T, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<RequestConfig<D>, 'method' | 'url' | 'data'>
  ): Promise<T> => {
    return request<T, D>({ ...config, method: 'PUT', url, data })
  },

  delete: <T>(url: string, config?: Omit<RequestConfig, 'method' | 'url'>): Promise<T> => {
    return request<T>({ ...config, method: 'DELETE', url })
  },
}
