export type ApiDateTimeString = string;
export type ApiMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface PaginationPayload {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiTransportRequest<TBody = unknown> {
  method: ApiMethod;
  url: string;
  params?: Record<string, unknown>;
  data?: TBody;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  responseType?: 'json' | 'blob' | 'text';
}

export interface ApiTransport {
  <TResponse, TBody = unknown>(
    request: ApiTransportRequest<TBody>,
  ): Promise<TResponse>;
}

export function unwrapApiPayload<T>(payload: ApiEnvelope<T> | T): T {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const maybeEnvelope = payload as ApiEnvelope<T> & PaginationPayload;

    if (
      'total' in maybeEnvelope ||
      'page' in maybeEnvelope ||
      'totalPages' in maybeEnvelope ||
      'limit' in maybeEnvelope
    ) {
      return payload as T;
    }

    return maybeEnvelope.data;
  }

  return payload as T;
}
