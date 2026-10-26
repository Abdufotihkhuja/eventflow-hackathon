import { createWorkspaceSdk } from '@eventflow/sdk-workspace';
import type { ApiTransport, ApiTransportRequest } from '@eventflow/api-contracts';
import { request } from './apiClient';
import { api } from './config';

async function workspaceSdkTransport<TResponse, TBody = unknown>(
  config: ApiTransportRequest<TBody>,
): Promise<TResponse> {
  if (config.responseType === 'blob') {
    const response = await api.request<TResponse>({
      method: config.method,
      url: config.url,
      data: config.data,
      params: config.params,
      headers: config.headers,
      responseType: 'blob',
      skipAuth: config.skipAuth,
    });

    return response.data;
  }

  return request<TResponse, TBody>({
    method: config.method,
    url: config.url,
    data: config.data,
    params: config.params,
    headers: config.headers,
    skipAuth: config.skipAuth,
  });
}

export const workspaceSdk = createWorkspaceSdk(workspaceSdkTransport as ApiTransport);
