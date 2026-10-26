import axios, { type AxiosInstance } from 'axios'

import { clearAuthTokens, getRefreshToken, setAuthTokens } from './config'
import type { ApiResponse } from './types'
import type { AuthTokens } from './services/auth.types'

type ResponseEnvelope<T> = ApiResponse<T> | T

let refreshClient: AxiosInstance | null = null
let refreshPromise: Promise<string | null> | null = null

async function getRefreshClient(): Promise<AxiosInstance> {
  if (!refreshClient) {
    const { API_BASE_URL, API_TIMEOUT } = await import('./config')
    refreshClient = axios.create({
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
  }
  return refreshClient
}

function unwrapRefreshResponse(payload: ResponseEnvelope<AuthTokens>): AuthTokens {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as ApiResponse<AuthTokens>).data
  }
  return payload as AuthTokens
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return

  clearAuthTokens()
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

export async function executeRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doExecuteRefresh()
  }

  return refreshPromise
}

async function doExecuteRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    refreshPromise = null
    return null
  }

  try {
    const client = await getRefreshClient()
    const response = await client.post<ResponseEnvelope<AuthTokens>>('/api/v1/auth/refresh', {
      refreshToken,
    })

    const tokens = unwrapRefreshResponse(response.data)
    setAuthTokens(tokens)

    return tokens.accessToken
  } catch {
    redirectToLogin()
    return null
  } finally {
    refreshPromise = null
  }
}

export function resetRefreshPromise(): void {
  refreshPromise = null
}
