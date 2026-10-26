import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'

import { Check, Upload, X } from 'lucide-react'

import { MEDIA_BASE_URL } from '@api/config'
import { uploadsService } from '@api/services'
import { cn } from '@shared/lib/cn'
import { Button, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from '@shared/ui'

import {
  BANNER_TEMPLATES,
  BANNER_TEMPLATE_GRADIENTS,
  BANNER_TEMPLATE_LABELS,
  type BannerTemplate,
} from '../../lib/banner-templates'

type EventMediaValue = {
  type: 'file' | 'template'
  url?: string
  template?: BannerTemplate
}

type EventMediaUploadProps = {
  value?: EventMediaValue
  onChange: (value: EventMediaValue | undefined) => void
  hideTemplates?: boolean
}

export function EventMediaUpload({
  value,
  onChange,
  hideTemplates = false,
}: EventMediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
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
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    const maxSize = 2 * 1024 * 1024
    if (!validTypes.includes(file.type)) {
      setUploadError('Пожалуйста, загрузите изображение в формате PNG или JPG')
      return false
    }
    if (file.size > maxSize) {
      setUploadError('Размер файла не должен превышать 2MB')
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
        maxWidth: 1200,
        maxHeight: 600,
        quality: 85,
        onUploadProgress: setUploadProgress,
      })
      onChange({ type: 'file', url: response.url })
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError('Не удалось загрузить файл. Попробуйте ещё раз.')
      setPreviewUrl(null)
      onChange(undefined)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleTemplateSelect = (template: BannerTemplate) => {
    setPreviewUrl(null)
    setUploadError(null)
    onChange({ type: 'template', template })
  }

  const handleUploadClick = () => {
    if (!isUploading) fileInputRef.current?.click()
  }

  const handleClear = () => {
    setPreviewUrl(null)
    setUploadError(null)
    onChange(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getFullUrl = (url: string) => {
    if (url.startsWith('http') || url.startsWith('blob:')) return url
    return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const displayUrl = previewUrl || (value?.url ? getFullUrl(value.url) : null)

  return (
    <FormItem>
      <FormLabel>Event Media</FormLabel>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Загрузить баннер</p>
        <FormControl>
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            className={cn(
              'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
              isDragging
                ? 'border-brand-secondary bg-brand-secondary/5'
                : uploadError
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                  : 'border-border bg-muted/50 hover:border-border hover:bg-muted',
              isUploading && 'pointer-events-none'
            )}
          >
            {displayUrl ? (
              <div className="relative h-full w-full">
                <img src={displayUrl} alt="Preview" className="h-full w-full object-cover" />
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
                    <div className="w-48 space-y-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white transition duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-center text-xs font-medium text-white tabular-nums">
                        {uploadProgress}%
                      </p>
                    </div>
                  </div>
                )}
                {!isUploading && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={e => {
                      e.stopPropagation()
                      handleClear()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : isUploading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-48 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
                    Загрузка... {uploadProgress}%
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="mb-1 text-sm font-medium text-foreground">
                  Нажмите для загрузки или перетащите файл
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG до 2MB (1200x600 рекомендуется)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </FormControl>

        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        {!hideTemplates && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">или</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Выбрать шаблон</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(BANNER_TEMPLATES).map(([, template]) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={cn(
                      'relative h-32 overflow-hidden rounded-lg transition',
                      BANNER_TEMPLATE_GRADIENTS[template],
                      value?.type === 'template' && value.template === template
                        ? 'ring-2 ring-brand-secondary ring-offset-2'
                        : 'hover:shadow-sm'
                    )}
                  >
                    {value?.type === 'template' && value.template === template && (
                      <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                        <Check className="h-4 w-4 text-brand-secondary" />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3">
                      <p className="text-sm font-semibold text-white drop-shadow-lg">
                        {BANNER_TEMPLATE_LABELS[template]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <FormDescription>
        Загрузите собственный баннер или выберите один из готовых шаблонов
      </FormDescription>
      <FormMessage />
    </FormItem>
  )
}
