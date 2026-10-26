export type ApiDateTimeString = string;
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
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
    <TResponse, TBody = unknown>(request: ApiTransportRequest<TBody>): Promise<TResponse>;
}
export declare function unwrapApiPayload<T>(payload: ApiEnvelope<T> | T): T;
//# sourceMappingURL=runtime.d.ts.map