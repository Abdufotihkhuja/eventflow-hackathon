import { useMutation } from '@tanstack/react-query'

import { request } from '@api/apiClient'
import type { ApiError } from '@api/types'
import type { TranslateBatchRequest, TranslateBatchResponse } from '../model/types'

/**
 * Translating long, rich descriptions across several languages can take well
 * over the global 15s API timeout, which aborts the request and surfaces a
 * misleading "translation service unavailable" error. Route the call through
 * the raw client with a dedicated per-request timeout.
 *
 * NB: we deliberately do NOT use `workspaceSdk.translations.translateBatch`
 * here — the SDK transport doesn't forward a per-request timeout, so the call
 * would fall back to the default 15s and abort on large texts.
 */
const TRANSLATE_BATCH_TIMEOUT = 120_000

export function useTranslateBatch() {
  return useMutation<TranslateBatchResponse, ApiError, TranslateBatchRequest>({
    mutationFn: body =>
      request<TranslateBatchResponse, TranslateBatchRequest>({
        method: 'POST',
        url: '/v1/translations/batch',
        data: body,
        timeout: TRANSLATE_BATCH_TIMEOUT,
      }),
  })
}
