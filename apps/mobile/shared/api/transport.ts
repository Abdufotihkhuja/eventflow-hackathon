/**
 * The single `ApiTransport` implementation — the app's ONLY door to the network.
 * Every data call goes through the generated SDK, which calls this. There is no
 * other `fetch`/`axios` in `app/` or `shared/` (MOBILE_API.md preamble).
 *
 * Responsibilities (MOBILE_API.md §1.2):
 *   • prepend the absolute API base URL, serialize query params
 *   • attach `Authorization: Bearer <access>` unless `skipAuth`
 *   • 401 → single-flight refresh → retry-once → session-expired
 *   • honor `responseType: 'blob'` (ticket/cert PDFs, materials)
 *   • `unwrapApiPayload` JSON envelopes/paginated lists
 */
import {
  unwrapApiPayload,
  type ApiTransport,
  type ApiTransportRequest,
} from "@eventflow/api-contracts";

import { env } from "@shared/config/env";

import { emitSessionExpired } from "./auth-events";
import { tokenStore } from "./token-store";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload?: unknown;

  constructor(status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const base = `${env.apiUrl}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || `Request failed (${res.status})`;
  let code: string | undefined;
  let payload: unknown;
  try {
    payload = await res.json();
    if (payload && typeof payload === "object") {
      const body = payload as { message?: unknown; code?: unknown };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message) && body.message.length)
        message = String(body.message[0]);
      if (typeof body.code === "string") code = body.code;
    }
  } catch {
    /* non-JSON error body — keep statusText */
  }
  return new ApiError(res.status, message, code, payload);
}

// ── single-flight refresh ────────────────────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${env.apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await tokenStore.clear();
      return false;
    }
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) {
      await tokenStore.clear();
      return false;
    }
    await tokenStore.setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  // Concurrent 401s share ONE refresh — never fire N refreshes.
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function execute<TResponse>(
  req: ApiTransportRequest,
  isRetry: boolean,
): Promise<TResponse> {
  const headers: Record<string, string> = { ...(req.headers ?? {}) };

  const body = req.data;
  const hasBody = body !== undefined && body !== null;
  const form = isFormData(body);
  if (hasBody && !form && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!req.skipAuth) {
    const access = await tokenStore.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(buildUrl(req.url, req.params), {
    method: req.method,
    headers,
    body: hasBody ? (form ? (body as FormData) : JSON.stringify(body)) : undefined,
  });

  // 401 → refresh once → retry once. Never loop.
  if (res.status === 401 && !req.skipAuth && !isRetry) {
    const ok = await refreshSession();
    if (ok) return execute<TResponse>(req, true);
    emitSessionExpired();
    throw await parseError(res);
  }

  if (!res.ok) throw await parseError(res);

  if (req.responseType === "blob") {
    return (await res.blob()) as TResponse;
  }
  if (req.responseType === "text") {
    return (await res.text()) as TResponse;
  }

  // 204 / empty body.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as TResponse;
  }
  const text = await res.text();
  if (!text) return undefined as TResponse;
  return unwrapApiPayload(JSON.parse(text)) as TResponse;
}

export const apiTransport: ApiTransport = <TResponse>(
  req: ApiTransportRequest,
) => execute<TResponse>(req, false);
