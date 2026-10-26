// ================================
// Upload Types
// ================================

export const UploadType = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AVATAR: 'avatar',
  BANNER: 'banner',
  CERTIFICATE_TEMPLATE: 'certificate_template',
  ATTACHMENT: 'attachment',
} as const

export type UploadType = (typeof UploadType)[keyof typeof UploadType]

export type UploadedFile = {
  id: string
  url: string
  name: string
  originalName: string
  type: UploadType
  mimeType: string
  size: number
  width?: number // для изображений
  height?: number
  thumbnailUrl?: string
  uploadedBy: string
  uploadedAt: string
}

// ================================
// Request/Response Types
// ================================

export type UploadFileRequest = {
  file: File
  type: UploadType
  folder?: string // опциональная подпапка
}

export type UploadFileResponse = UploadedFile

export type UploadMultipleFilesRequest = {
  files: File[]
  type: UploadType
  folder?: string
}

export type UploadMultipleFilesResponse = {
  files: UploadedFile[]
  failed: { name: string; error: string }[]
}

export type GetSignedUrlRequest = {
  fileName: string
  contentType: string
  type: UploadType
}

export type GetSignedUrlResponse = {
  uploadUrl: string
  fileUrl: string
  expiresAt: string
}

export type DeleteFileRequest = {
  fileId: string
  // или
  fileUrl?: string
}
