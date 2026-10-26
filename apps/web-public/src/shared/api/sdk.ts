import { createAccountSdk } from "@eventflow/sdk-account";
import { createPublicSdk } from "@eventflow/sdk-public";
import type {
  ApiTransport,
  ApiTransportRequest,
} from "@eventflow/api-contracts";
import { getInitialLocale } from "@eventflow/i18n";
import {
  clearAuthSession,
  getAuthToken,
  getWebCsrfToken,
  isAuthenticated,
  refreshSession,
  tryRecoverCsrf,
} from "../lib/apiClient";

function getCurrentLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getInitialLocale({ includeBrowserLocale: true });
  } catch {
    return null;
  }
}

/**
 * CSRF-токен web-сессии для небезопасных методов.
 *
 * Кука `ef_csrf` — host-only на домене API (api.eventflow.uz), поэтому со
 * страницы публичного сайта (eventflow.uz) она в `document.cookie` НЕ видна.
 * В этом случае берём токен из sessionStorage — его туда кладут
 * login/register/refresh и bootstrapWebCsrf по ответу сервера. Без этого
 * fallback любой PATCH/POST через SDK уходил без заголовка и получал 403
 * WEB_CSRF_REJECTED (тот же fallback есть в apiClient).
 *
 * Возвращает уже декодированное значение.
 */
function getCsrfToken(): string | undefined {
  if (typeof document !== "undefined") {
    const cookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find(
        (part) =>
          part.startsWith("__Host-ef_csrf=") || part.startsWith("ef_csrf=")
      );
    if (cookie) {
      return decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1));
    }
  }
  return getWebCsrfToken() ?? undefined;
}

const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_BASE_URL =
  typeof window !== "undefined" && process.env.NODE_ENV !== "production"
    ? ""
    : CONFIGURED_API_BASE_URL;
const API_TIMEOUT = parseInt(
  process.env.NEXT_PUBLIC_API_TIMEOUT || "30000",
  10
);

/**
 * Эндпоинты, которые принимают `?locale=` query-параметр (соответствует
 * подходу в существующих сервисах: eventService, blogService и т.д.).
 * Account/auth-эндпоинты используют `forbidNonWhitelisted`, поэтому им
 * передавать `locale` НЕЛЬЗЯ — будет 400 BAD_REQUEST.
 */
const LOCALE_WHITELIST_PREFIXES = [
  "/api/v1/public/",
  "/api/v1/blog",
  "/api/v1/categories",
  "/api/v1/collections",
  "/api/v1/organizations/",
  "/api/v1/events/tags",
];

function pathAcceptsLocale(pathname: string): boolean {
  return LOCALE_WHITELIST_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = new URL(`${API_BASE_URL}${path}`, "http://eventflow.local");

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  // Прокидываем локаль только в эндпоинты, которые её ожидают (whitelist).
  // Иначе бэк с `forbidNonWhitelisted` валидацией ответит 400.
  if (!url.searchParams.has("locale") && pathAcceptsLocale(url.pathname)) {
    const locale = getCurrentLocale();
    if (locale) {
      url.searchParams.set("locale", locale);
    }
  }

  return `${url.pathname}${url.search}`;
}

function redirectToLogin() {
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.replace("/login");
  }
}

async function publicSdkTransport<TResponse, TBody = unknown>(
  request: ApiTransportRequest<TBody>,
  isRetry = false,
  isCsrfRetry = false
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  const url = buildUrl(request.url, request.params);
  const isFormData = request.data instanceof FormData;
  const headers: Record<string, string> = {
    ...(request.headers ?? {}),
  };

  if (!isFormData && request.data !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  // Локаль уезжает на бэк через query-параметр `?locale=` в buildUrl —
  // соответствует подходу остальных API-сервисов проекта.

  const hadSession = !request.skipAuth && isAuthenticated();

  if (!request.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: request.method,
      headers,
      body:
        request.data === undefined
          ? undefined
          : isFormData
            ? (request.data as FormData)
            : JSON.stringify(request.data),
      signal: controller.signal,
      credentials: "include",
    });

    // 401 «разлогинивает» только того, у кого сессия была: у гостя нечему
    // истекать, а публичные страницы (событие, статья) обязаны открываться
    // анонимно — иначе один защищённый запрос уводит их на /login.
    if (
      response.status === 401 &&
      !request.skipAuth &&
      !isRetry &&
      hadSession
    ) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return publicSdkTransport<TResponse, TBody>(request, true, isCsrfRetry);
      }

      clearAuthSession();
      redirectToLogin();
    }

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({ message: response.statusText }))) as {
        message?: string;
        code?: string;
      };

      // Сессия жива, но CSRF-токена на руках не было (новая вкладка) —
      // перевыдаём его и повторяем запрос один раз.
      if (await tryRecoverCsrf(response.status, errorData.code, isCsrfRetry)) {
        return publicSdkTransport<TResponse, TBody>(request, isRetry, true);
      }

      throw new Error(errorData.message || response.statusText);
    }

    if (request.responseType === "blob") {
      return (await response.blob()) as TResponse;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as TResponse) : (null as TResponse);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const publicSdk = createPublicSdk(publicSdkTransport as ApiTransport);
export const accountSdk = createAccountSdk(publicSdkTransport as ApiTransport);
