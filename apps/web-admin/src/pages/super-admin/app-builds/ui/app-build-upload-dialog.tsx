/**
 * Диалог загрузки сборки мобильного приложения (Super Admin)
 * Файл уходит multipart'ом в POST /api/v1/super-admin/app-builds.
 */

import { useRef, useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import { FileUp, Loader2 } from 'lucide-react'

import type { AppBuildPlatform } from '@api/services'
import { useUploadAppBuild } from '@features/super-admin'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'

import { formatBuildSize } from './app-builds-columns'

const PLATFORM_ACCEPT: Record<AppBuildPlatform, string> = {
  ANDROID: '.apk,.aab',
  IOS: '.ipa',
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppBuildUploadDialog({ open, onOpenChange }: Props) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [platform, setPlatform] = useState<AppBuildPlatform>('ANDROID')
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)

  const upload = useUploadAppBuild()

  const reset = () => {
    setPlatform('ANDROID')
    setVersion('')
    setNotes('')
    setFile(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (upload.isPending) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handlePlatformChange = (value: string) => {
    setPlatform(value as AppBuildPlatform)
    // Расширения платформ не пересекаются — выбранный файл сбрасываем.
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = () => {
    if (!file || !version.trim()) return
    setProgress(0)
    upload.mutate(
      {
        file,
        platform,
        version: version.trim(),
        notes: notes.trim() || undefined,
        onUploadProgress: setProgress,
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  const canSubmit = !!file && !!version.trim() && !upload.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.appBuilds.uploadTitle')}</DialogTitle>
          <DialogDescription>{t('admin.appBuilds.uploadDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('admin.appBuilds.columns.platform')}</Label>
            <Select value={platform} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANDROID">Android (.apk / .aab)</SelectItem>
                <SelectItem value="IOS">iOS (.ipa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-build-version">{t('admin.appBuilds.columns.version')}</Label>
            <Input
              id="app-build-version"
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder={t('admin.appBuilds.versionPlaceholder')}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-build-notes">{t('admin.appBuilds.columns.notes')}</Label>
            <Textarea
              id="app-build-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('admin.appBuilds.notesPlaceholder')}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('admin.appBuilds.columns.file')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={PLATFORM_ACCEPT[platform]}
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
            >
              <FileUp className="mr-2 size-4" />
              {file
                ? `${file.name} (${formatBuildSize(file.size)})`
                : t('admin.appBuilds.chooseFile')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('admin.appBuilds.fileHint')}</p>
          </div>

          {upload.isPending && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.appBuilds.uploading', { percent: progress })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={upload.isPending}>
            {t('admin.actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {upload.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {t('admin.appBuilds.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
