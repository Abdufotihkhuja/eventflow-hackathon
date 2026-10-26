import axios, { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios'

import { executeRefresh, redirectToLogin, resetRefreshPromise } from './apiAuthFlow'
import type { ApiError, ApiErrorResponse, RequestConfig } from './types'

const ACCESS_TOKEN_KEY = 'auth.accessToken'
const REFRESH_TOKEN_KEY = 'auth.refreshToken'
const ELEVATION_TOKEN_KEY = 'auth.platformElevation'

export type UserType = 'organization' | 'member' | 'super_admin'

const isBrowser = typeof window !== 'undefined'

function normalizeApiBaseUrl(rawUrl?: string): string {
  const trimmedUrl = rawUrl?.trim() ?? ''

  if (!trimmedUrl) {
    return ''
  }

  return trimmedUrl.replace(/\/api\/?$/, '')
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_URL ?? 'http://api.localhost'
export const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost'
const DEFAULT_TIMEOUT = 15_000
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? DEFAULT_TIMEOUT)

export function getMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  // Консоль/кабинет ходят по Bearer из localStorage. Куку web-сессии
  // (её ставит публичный сайт на домен API) слать не надо: аутентификации
  // она не даёт, а CookieCsrfGuard от одного её присутствия отвечал 403.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

let elevationPromise: Promise<string | null> | null = null

/**
 * Консоль работает под одним WRITE-elevation: он покрывает и чтение, и запись,
 * поэтому 403 PLATFORM_* лечится одним и тем же перезапросом.
 */
async function renewElevation(): Promise<string | null> {
  if (!elevationPromise) {
    elevationPromise = api
      .post<{ token?: string | null }>('/api/v1/super-admin/elevations', {
        mode: 'WRITE',
        reason: 'Renew platform console access',
      })
      .then(response => {
        const token = response.data.token ?? null
        if (token) setPlatformElevationToken(token)
        return token
      })
      .finally(() => {
        elevationPromise = null
      })
  }
  return elevationPromise
}

export function getAccessToken(): string | null {
  if (!isBrowser) {
    return null
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (!isBrowser) {
    return null
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getPlatformElevationToken(): string | null {
  if (!isBrowser) return null
  return sessionStorage.getItem(ELEVATION_TOKEN_KEY)
}

export function setPlatformElevationToken(token: string): void {
  if (isBrowser) sessionStorage.setItem(ELEVATION_TOKEN_KEY, token)
}

export function clearPlatformElevationToken(): void {
  if (isBrowser) sessionStorage.removeItem(ELEVATION_TOKEN_KEY)
}

type PersistTokensParams = {
  accessToken: string
  refreshToken?: string | null
}

export function setAuthTokens({ accessToken, refreshToken }: PersistTokensParams): void {
  if (!isBrowser) {
    return
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

  if (typeof refreshToken === 'string') {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    return
  }

  if (refreshToken === null) {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function clearAuthTokens(): void {
  if (!isBrowser) {
    return
  }

  resetRefreshPromise()
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  clearPlatformElevationToken()
}

export const tokenStorageKeys = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
} as const

function applyAuthHeader(config: RequestConfig<unknown>): void {
  const token = getAccessToken()

  if (!token) {
    return
  }

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`)
    return
  }

  config.headers = {
    ...(config.headers ?? {}),
    Authorization: `Bearer ${token}`,
  }
}

function applyElevationHeader(config: RequestConfig<unknown>): void {
  if (
    !config.url?.includes('/super-admin/') ||
    config.url.includes('/super-admin/elevations')
  ) {
    return
  }
  const token = getPlatformElevationToken()
  if (!token) return
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('X-EventFlow-Elevation', token)
    return
  }
  config.headers = {
    ...(config.headers ?? {}),
    'X-EventFlow-Elevation': token,
  }
}

function normalizeApiError(error: AxiosError<ApiErrorResponse>): ApiError {
  if (error.response) {
    const { status, data } = error.response

    return {
      status,
      message: data?.message ?? error.message,
      isNetworkError: false,
      details: data,
    }
  }

  if (error.request) {
    return {
      status: 0,
      message: 'Не удалось подключиться к серверу. Повторите попытку позже.',
      isNetworkError: true,
    }
  }

  return {
    status: 0,
    message: error.message,
    isNetworkError: true,
  }
}

api.interceptors.request.use(config => {
  const typedConfig = config as RequestConfig<unknown>

  if (!typedConfig.skipAuth) {
    applyAuthHeader(typedConfig)
    applyElevationHeader(typedConfig)
  }

  if (typeof FormData !== 'undefined' && typedConfig.data instanceof FormData) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete('Content-Type')
    } else if (config.headers) {
      delete config.headers['Content-Type']
    }
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status
    const config = error.config as
      | (RequestConfig<unknown> & { _elevationRetry?: boolean })
      | undefined
    const skipAuth = (config as RequestConfig<unknown> | undefined)?.skipAuth

    const elevationCode = error.response?.data?.code
    // Гвард отклоняет запрос до обработчика, поэтому повтор безопасен и для
    // неидемпотентных мутаций: на сервере ничего не успело произойти.
    if (
      status === 403 &&
      config &&
      !config._elevationRetry &&
      [
        'PLATFORM_ELEVATION_REQUIRED',
        'PLATFORM_ELEVATION_INVALID',
        'PLATFORM_WRITE_ELEVATION_REQUIRED',
      ].includes(String(elevationCode))
    ) {
      config._elevationRetry = true
      clearPlatformElevationToken()
      const elevation = await renewElevation()
      if (elevation) return api.request(config)
    }

    if (status === 401 && !skipAuth && config) {
      const newToken = await executeRefresh()
      if (newToken) {
        return api.request(config)
      }
      redirectToLogin()
    }

    return Promise.reject(normalizeApiError(error))
  }
)

export type { ApiResponse, ApiError } from './types'
