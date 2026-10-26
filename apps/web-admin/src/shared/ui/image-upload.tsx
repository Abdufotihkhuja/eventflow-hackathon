import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { useT } from '@eventflow/i18n/react'

import { ImageIcon, Upload, X } from 'lucide-react'

import { uploadsService } from '@api/services'
import { getMediaUrl } from '@api/config'
import { cn } from '@shared/lib/cn'

import { Button } from './shadcn/button'

type ImageUploadProps = {
  value?: string
  onChange: (url: string | undefined) => void
  disabled?: boolean
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeMB?: number
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 85,
  maxSizeMB = 5,
  className,
}: ImageUploadProps) {
  const t = useT()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileUpload(files[0])
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFileUpload(files[0])
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    const maxSize = maxSizeMB * 1024 * 1024
    if (!validTypes.includes(file.type)) {
      setUploadError(t('common.imageUpload.invalidType'))
      return false
    }
    if (file.size > maxSize) {
      setUploadError(t('common.imageUpload.maxSize', { size: maxSizeMB }))
      return false
    }
    return true
  }

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return

    setUploadError(null)
    setIsUploading(true)
    setUploadProgress(0)

    const localPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(localPreviewUrl)

    try {
      const response = await uploadsService.uploadImage(file, {
        maxWidth,
        maxHeight,
        quality,
        onUploadProgress: setUploadProgress,
      })
      onChange(response.url)
      setPreviewUrl(response.url)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError(t('common.imageUpload.uploadFailed'))
      setPreviewUrl(null)
      onChange(undefined)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemove = () => {
    onChange(undefined)
    setPreviewUrl(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClickUpload = () => {
    if (!disabled) fileInputRef.current?.click()
  }

  const displayUrl = getMediaUrl(value) || previewUrl

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {displayUrl ? (
        <div className="group relative">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            <img
              src={displayUrl}
              alt={t('common.imageUpload.previewAlt')}
              className="h-full w-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                <div className="w-48 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
                    {uploadProgress}%
                  </p>
                </div>
              </div>
            )}
          </div>
          {!disabled && !isUploading && (
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="button" variant="destructive" size="icon" onClick={handleRemove} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className={cn(
            'relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:bg-muted',
            isDragging && 'border-primary bg-primary/5',
            disabled && 'cursor-not-allowed opacity-50',
            uploadError && 'border-destructive'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-48 space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
                  {t('common.imageUpload.uploading')} {uploadProgress}%
                </p>
              </div>
            </div>
          ) : (
            <>
              {isDragging ? (
                <Upload className="h-10 w-10 text-primary" />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging
                    ? t('common.imageUpload.dropHere')
                    : t('common.imageUpload.clickOrDrag')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('common.imageUpload.formatsHint', { size: maxSizeMB })}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
    </div>
  )
}
