/**
 * Универсальный API клиент для выполнения HTTP запросов
 * Поддерживает обработку ошибок, автоматическое добавление токена и перезагрузку при 401
 */

import { getInitialLocale } from "@eventflow/i18n";

import { rotatePublicQueryScope } from "./queryClient";

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: ApiErrorResponse
  ) {
    super(data.message);
    this.name = "ApiError";
  }
}

const WEB_CSRF_STORAGE_KEY = "auth.webCsrf";

export function setWebCsrfToken(token: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(WEB_CSRF_STORAGE_KEY, token);
  }
}

export function getWebCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(WEB_CSRF_STORAGE_KEY);
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  /** Пропустить добавление токена авторизации (для публичных эндпоинтов) */
  skipAuth?: boolean;
  /**
   * Не редиректить на /login при 401. Токен всё ещё отправляется (если есть),
   * но публичная страница не должна выкидывать гостя на логин из-за
   * необязательно-авторизованного запроса (OptionalJwtAuthGuard-эндпоинты).
   */
  skipAuthRedirect?: boolean;
  /** Внутренний флаг: повторный запрос после refresh, не пытаться снова refresh при 401 */
  _isRetry?: boolean;
  /** Внутренний флаг: повторный запрос после перевыдачи CSRF, не пытаться снова при 403 */
  _isCsrfRetry?: boolean;
}

const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_BASE_URL =
  typeof window !== "undefined" && process.env.NODE_ENV !== "production"
    ? ""
    : CONFIGURED_API_BASE_URL;
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000");

/**
 * Подготовка заголовков для запроса
 * @param customHeaders - Кастомные заголовки
 * @param skipAuth - Пропустить добавление токена (для анонимных запросов к публичным эндпоинтам)
 * @param _url - URL (не используется; токен передаём при наличии, если не skipAuth)
 */
/**
 * Достаёт текущую локаль на клиенте: localStorage → cookie → браузер → fallback.
 * Бэкенд читает локаль из query-параметра `?locale=ru` (см. eventService,
 * blogService и т.д.) — автоматически прокидываем его в каждый запрос ниже.
 */
function getCurrentLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getInitialLocale({ includeBrowserLocale: true });
  } catch {
    return null;
  }
}

/**
 * Эндпоинты, которые принимают `?locale=`.
 * Account/auth используют `forbidNonWhitelisted` валидацию — там нельзя.
 */
const LOCALE_WHITELIST_PREFIXES = [
  "/api/v1/public/",
  "/api/v1/blog",
  "/api/v1/categories",
  "/api/v1/collections",
  "/api/v1/organizations/",
  "/api/v1/events/tags",
];

function pathAcceptsLocale(url: string): boolean {
  const pathname = url.split("?")[0] ?? url;
  return LOCALE_WHITELIST_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

/**
 * Добавляет `locale=<current>` к URL, если его там ещё нет И эндпоинт
 * допускает этот параметр. Явно выставленный сервисом locale остаётся
 * в приоритете.
 */
export function appendLocaleToUrl(url: string): string {
  if (!pathAcceptsLocale(url)) return url;
  if (/[?&]locale=/.test(url)) return url;

  const locale = getCurrentLocale();
  if (!locale) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}locale=${encodeURIComponent(locale)}`;
}

function prepareHeaders(
  customHeaders: HeadersInit,
  skipAuth = false,
  _url = "",
  body?: BodyInit | null,
  method = "GET"
): HeadersInit {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {};

  // Копируем кастомные заголовки если это объект
  if (typeof customHeaders === "object" && !Array.isArray(customHeaders)) {
    Object.assign(headers, customHeaders);
  }

  if (
    !isFormData &&
    body !== undefined &&
    body !== null &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  if (
    !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) &&
    typeof document !== "undefined"
  ) {
    const csrfCookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find(
        (part) =>
          part.startsWith("__Host-ef_csrf=") || part.startsWith("ef_csrf=")
      );
    const prefix = csrfCookie?.startsWith("__Host-")
      ? "__Host-ef_csrf="
      : "ef_csrf=";
    const csrfToken = csrfCookie
      ? decodeURIComponent(csrfCookie.slice(prefix.length))
      : getWebCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Добавляем токен, если он есть и не передан skipAuth (для GET события по id/slug с JWT приходит myRegistration)
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Извлечение ошибки из ответа
 */
async function extractErrorFromResponse(
  response: Response
): Promise<ApiErrorResponse> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return data;
  } catch {
    return {
      message: response.statusText,
    };
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function normalizeRequestError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAbortError(error)) {
    return new ApiError(408, {
      message: "Request timeout",
      code: "TIMEOUT",
    });
  }

  return new ApiError(500, {
    message: "Network error",
    code: "NETWORK_ERROR",
    details: error instanceof Error ? error.message : String(error),
  });
}

const REFRESH_PATH = "/api/v1/auth/refresh";

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** Код 409 от API: refresh-токен уже ротирован параллельным запросом. */
const REFRESH_ROTATION_RACE = "REFRESH_TOKEN_ROTATION_RACE";

/**
 * Проиграна ли гонка ротации: сервер ответил 409 REFRESH_TOKEN_ROTATION_RACE.
 * Это значит, что другой запрос (соседняя вкладка) уже обновил сессию, и
 * новая сессия действительна — повторять запрос можно.
 */
async function lostRotationRace(res: Response): Promise<boolean> {
  if (res.status !== 409) return false;
  const body = (await res.json().catch(() => null)) as {
    code?: string;
  } | null;
  return body?.code === REFRESH_ROTATION_RACE;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Обновить сессию. Вызывается только на клиенте, при 401 от API.
 *
 * Single-flight: экран делает несколько запросов параллельно, и каждый из них
 * при истёкшем access-токене получает 401. Без общего промиса они все разом
 * шли ротировать один и тот же refresh-токен: побеждал один, остальные
 * получали ошибку и выбрасывали пользователя на /login.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= performSessionRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Один сетевой refresh. Не использует request(), чтобы не зациклиться на 401. */
async function performSessionRefresh(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = getRefreshToken();
  try {
    if (!refreshToken) {
      const csrfCookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find(
          (part) =>
            part.startsWith("__Host-ef_csrf=") || part.startsWith("ef_csrf=")
        );
      const csrfToken = csrfCookie?.slice(csrfCookie.indexOf("=") + 1);
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/web/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken
            ? { "X-CSRF-Token": decodeURIComponent(csrfToken) }
            : {}),
        },
        body: "{}",
      });
      // Куки новой сессии уже выставил победивший запрос.
      if (await lostRotationRace(res)) return true;
      if (!res.ok) return false;
      const data = (await res.json()) as { csrfToken?: string };
      if (data.csrfToken) setWebCsrfToken(data.csrfToken);
      return true;
    }
    const res = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    // Победившая вкладка уже записала новую пару в localStorage.
    if (await lostRotationRace(res)) return getRefreshToken() !== refreshToken;
    if (!res.ok) return false;
    const data = (await res.json()) as RefreshResponse;
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Перевыдать CSRF-токен активной web-сессии.
 *
 * Кука `ef_csrf` host-only на домене API, поэтому со страницы публичного сайта
 * она в `document.cookie` не видна, а sessionStorage живёт в пределах вкладки:
 * в новой вкладке токена нет ни там, ни там, и любая мутация ловит 403
 * WEB_CSRF_REJECTED. Этот запрос отдаёт токен активной cookie-сессии, после
 * чего запрос повторяется.
 */
export async function recoverWebCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/web/csrf`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { csrfToken?: string };
    if (!data.csrfToken) return null;
    setWebCsrfToken(data.csrfToken);
    return data.csrfToken;
  } catch {
    return null;
  }
}

/**
 * Стоит ли повторить запрос: сервер отверг его как CSRF, попытка ещё не
 * делалась и токен удалось перевыдать.
 */
export async function tryRecoverCsrf(
  status: number,
  code: string | undefined,
  isCsrfRetry: boolean
): Promise<boolean> {
  if (status !== 403 || code !== "WEB_CSRF_REJECTED" || isCsrfRetry) {
    return false;
  }
  return (await recoverWebCsrfToken()) !== null;
}

/**
 * Редирект на страницу входа при неавторизованном доступе или неудачном refresh.
 * Только в браузере; не редиректим если уже на /login.
 */
function redirectToLogin(): void {
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login");
  }
}

/**
 * Главная функция для выполнения API запросов
 * @param url - Относительный URL эндпоинта
 * @param options - Опции fetch запроса
 * @returns Promise с данными ответа
 */
export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = API_TIMEOUT,
    headers: customHeaders = {},
    skipAuth = false,
    skipAuthRedirect = false,
    _isRetry = false,
    _isCsrfRetry = false,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = prepareHeaders(
      customHeaders,
      skipAuth,
      url,
      (fetchOptions.body as BodyInit | null | undefined) ?? null,
      String(fetchOptions.method ?? "GET")
    );

    const finalUrl = appendLocaleToUrl(url);
    const response = await fetch(`${API_BASE_URL}${finalUrl}`, {
      ...fetchOptions,
      credentials: "include",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await extractErrorFromResponse(response);
      // Сессия жива, но CSRF-токена на руках не было (новая вкладка) —
      // перевыдаём его и повторяем запрос один раз.
      if (await tryRecoverCsrf(response.status, errorData.code, _isCsrfRetry)) {
        clearTimeout(timeoutId);
        const { signal: _csrfSignal, ...retryOptions } = options;
        return request<T>(url, { ...retryOptions, _isCsrfRetry: true });
      }
      if (response.status === 401) {
        if (!skipAuth) {
          if (!_isRetry && (await refreshSession())) {
            clearTimeout(timeoutId);
            const { signal: _s, ...retryOptions } = options;
            return request<T>(url, { ...retryOptions, _isRetry: true });
          }
          clearAuthSession();
          // Public pages opt out of the forced /login redirect: a failed
          // optionally-authenticated request must not yank a guest away.
          if (!skipAuthRedirect) {
            redirectToLogin();
          }
        } else {
          clearAuthSession();
        }
      }
      throw new ApiError(response.status, errorData);
    }

    const text = await response.text();
    let responseData: T;
    if (text.trim()) {
      try {
        responseData = JSON.parse(text) as T;
      } catch {
        responseData = text as unknown as T;
      }
    } else {
      responseData = null as unknown as T;
    }

    return {
      data: responseData,
      status: response.status,
    };
  } catch (error) {
    throw normalizeRequestError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET запрос
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  const response = await request<T>(url, {
    ...options,
    method: "GET",
  });
  return response.data;
}

/**
 * POST запрос
 */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const response = await request<T>(url, {
    ...options,
    method: "POST",
    body:
      body === undefined
        ? undefined
        : typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  return response.data;
}

/**
 * PUT запрос
 */
export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const response = await request<T>(url, {
    ...options,
    method: "PUT",
    body:
      body === undefined
        ? undefined
        : typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  return response.data;
}

/**
 * PATCH запрос
 */
export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const response = await request<T>(url, {
    ...options,
    method: "PATCH",
    body:
      body === undefined
        ? undefined
        : typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  return response.data;
}

/**
 * DELETE запрос
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  const response = await request<T>(url, {
    ...options,
    method: "DELETE",
  });
  return response.data;
}

/**
 * GET запрос с возвратом Blob (для скачивания файлов, например PDF)
 * Использует тот же токен и таймаут, что и остальные запросы
 */
export async function apiGetBlob(
  url: string,
  options?: { _isRetry?: boolean }
): Promise<Blob> {
  const _isRetry = options?._isRetry ?? false;
  const headers = prepareHeaders({});
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const finalUrl = appendLocaleToUrl(url);
    const response = await fetch(`${API_BASE_URL}${finalUrl}`, {
      method: "GET",
      headers,
      signal: controller.signal,
      credentials: "include",
    });
    if (!response.ok) {
      const errorData = await extractErrorFromResponse(response);
      if (response.status === 401) {
        if (!_isRetry && (await refreshSession())) {
          clearTimeout(timeoutId);
          return apiGetBlob(url, { _isRetry: true });
        }
        clearAuthSession();
        redirectToLogin();
      }
      throw new ApiError(response.status, errorData);
    }
    return await response.blob();
  } catch (error) {
    throw normalizeRequestError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Получить токен авторизации из localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("authToken");
}

/**
 * Установить токен авторизации
 */
export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token);
  }
}

/**
 * Удалить токен авторизации
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
  }
}

// ============================================================================
// Refresh Token Helpers
// ============================================================================

const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "user";

/**
 * Получить refresh токен из localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Установить refresh токен
 */
export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

/**
 * Установить оба токена (access + refresh)
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
}

/**
 * Очистить все токены и данные авторизации
 */
export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem("organization");
    sessionStorage.removeItem(WEB_CSRF_STORAGE_KEY);
  }
}

/**
 * Очистить всю сессию пользователя:
 * - токены и auth-данные в localStorage
 * - react-query кеш, чтобы UI не использовал stale user/me данные
 */
export function clearAuthSession(): void {
  clearTokens();
  rotatePublicQueryScope("anonymous");
}

/**
 * Проверить, авторизован ли пользователь
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (localStorage.getItem("authToken") || getWebCsrfToken()) {
    return true;
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some(
      (part) =>
        part.startsWith("__Host-ef_csrf=") || part.startsWith("ef_csrf=")
    );
}
