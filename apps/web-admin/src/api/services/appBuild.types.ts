/**
 * Типы для сборок мобильного приложения (внутренняя дистрибуция, Super Admin)
 */

export type AppBuildPlatform = 'ANDROID' | 'IOS'

export interface AppBuild {
  id: string
  platform: AppBuildPlatform
  version: string
  notes: string | null
  originalName: string
  mimeType: string
  size: number
  uploadedByEmail: string | null
  createdAt: string
}

export interface UploadAppBuildRequest {
  file: File
  platform: AppBuildPlatform
  version: string
  notes?: string
  onUploadProgress?: (percent: number) => void
}
