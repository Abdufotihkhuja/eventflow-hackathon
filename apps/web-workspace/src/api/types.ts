import type { AxiosRequestConfig } from 'axios'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestConfig<D = unknown> = Omit<AxiosRequestConfig<D>, 'method' | 'url' | 'data'> & {
  method: HttpMethod
  url: string
  data?: D
  skipAuth?: boolean
}

export type ApiResponse<T> = {
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export type ApiErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
  [key: string]: unknown
}

export type ApiError = {
  status: number
  message: string
  isNetworkError: boolean
  details?: ApiErrorResponse | unknown
}
