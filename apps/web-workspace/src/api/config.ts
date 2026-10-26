import axios, { AxiosError, AxiosHeaders, type AxiosInstance } from 'axios'

import { executeRefresh, redirectToLogin, resetRefreshPromise } from './apiAuthFlow'
import type { ApiError, ApiErrorResponse, RequestConfig } from './types'

const ACCESS_TOKEN_KEY = 'auth.accessToken'
const REFRESH_TOKEN_KEY = 'auth.refreshToken'

/** Тип пользователя: организация или сотрудник */
export type UserType = 'organization' | 'member'

const isBrowser = typeof window !== 'undefined'

function normalizeApiBaseUrl(rawUrl?: string): string {
  const trimmedUrl = rawUrl?.trim() ?? ''

  if (!trimmedUrl) {
    return ''
  }

  return trimmedUrl
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '')
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

function normalizeMediaBaseUrl(rawUrl?: string): string {
  const trimmedUrl = rawUrl?.trim() ?? ''

  if (!trimmedUrl) {
    return ''
  }

  return trimmedUrl
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '')
}

export const MEDIA_BASE_URL =
  normalizeMediaBaseUrl(import.meta.env.VITE_MEDIA_URL) ||
  normalizeMediaBaseUrl(import.meta.env.VITE_API_URL) ||
  'http://api.localhost'

/** Базовый URL публичного сайта (как видят пользователи). Для ссылок «Открыть статью», «Посмотреть на сайте» и т.п. */
function normalizePublicSiteUrl(rawUrl?: string): string {
  const fallbackUrl = 'http://localhost'
  const trimmedUrl = (rawUrl?.trim() || fallbackUrl).replace(/\/+$/, '')

  try {
    const url = new URL(trimmedUrl)

    if (url.hostname.startsWith('app.')) {
      url.hostname = url.hostname.replace(/^app\./, '')
    }

    return url.toString().replace(/\/+$/, '')
  } catch {
    return trimmedUrl
  }
}

export const PUBLIC_SITE_URL = normalizePublicSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL)
const DEFAULT_TIMEOUT = 15_000
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? DEFAULT_TIMEOUT)

/**
 * Формирует полный URL для медиа-файлов (изображения, логотипы и т.д.)
 */
export function getMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  // Если уже полный URL — возвращаем как есть
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // Добавляем базовый URL
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
  clearWorkspaceSelectionPending()
}

/**
 * "Workspace selection pending" flag.
 *
 * After the unified login a USER account holds a bare USER token but has NOT
 * yet entered an organization workspace (it is on the org switcher / empty
 * state). A USER token must never reach `/dashboard` — the workspace app only
 * understands ORGANIZATION/MEMBER actors. This per-tab flag lets the route
 * guards keep such a session on `/login` (and the login page resume the
 * switcher) instead of bouncing to a workspace it cannot render. It is cleared
 * the moment a workspace is entered or the session is torn down.
 */
const WORKSPACE_PENDING_KEY = 'eventflow.workspace.pending'

export function markWorkspaceSelectionPending(): void {
  if (!isBrowser) return
  try {
    sessionStorage.setItem(WORKSPACE_PENDING_KEY, '1')
  } catch {
    // sessionStorage unavailable (private mode quota) — non-fatal.
  }
}

export function clearWorkspaceSelectionPending(): void {
  if (!isBrowser) return
  try {
    sessionStorage.removeItem(WORKSPACE_PENDING_KEY)
  } catch {
    // ignore
  }
}

export function isWorkspaceSelectionPending(): boolean {
  if (!isBrowser) return false
  try {
    return sessionStorage.getItem(WORKSPACE_PENDING_KEY) === '1'
  } catch {
    return false
  }
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

// Обработка 401: попытка refresh; при неудаче — очистка токенов и редирект на логин
api.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status
    const config = error.config
    const skipAuth = (config as RequestConfig<unknown> | undefined)?.skipAuth

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
