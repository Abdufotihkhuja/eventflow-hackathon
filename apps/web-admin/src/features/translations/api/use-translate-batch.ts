import { useMutation } from '@tanstack/react-query'

import { adminSdk } from '@api/adminSdk'
import type { ApiError } from '@api/types'
import type { TranslateBatchRequest, TranslateBatchResponse } from '../model/types'

export function useTranslateBatch() {
  return useMutation<TranslateBatchResponse, ApiError, TranslateBatchRequest>({
    mutationFn: body =>
      adminSdk.translations.translateBatch(body as never) as Promise<TranslateBatchResponse>,
  })
}
