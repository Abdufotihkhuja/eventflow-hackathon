import { useMutation } from '@tanstack/react-query'

import { uploadsService, type UploadFileResponse } from '@api/services'
import type { ApiError } from '@api/types'

type UploadSpeakerAvatarPayload = {
  file: File
  onProgress?: (percent: number) => void
}

/**
 * Загрузка фото спикера через /uploads/image
 */
export function useUploadSpeakerAvatar() {
  return useMutation<UploadFileResponse, ApiError, UploadSpeakerAvatarPayload>({
    mutationFn: ({ file, onProgress }) =>
      uploadsService.uploadImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 90,
        onUploadProgress: onProgress,
      }),
  })
}
