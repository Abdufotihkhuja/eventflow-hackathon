import { useState, useRef, useCallback } from 'react'
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Trash2,
  Download,
  Loader2,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
  Badge,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { agendaMaterialsService } from '@api/services'
import type { AgendaMaterial } from '@api/services'
import {
  useAgendaMaterialsQuery,
  useUploadMultipleAgendaFiles,
  useAddAgendaLink,
  useDeleteAgendaMaterial,
} from '@features/events/api/use-agenda-materials'
import {
  normalizeMaterials,
  isExternalMaterialUrl,
} from '@features/events/lib/normalize-agenda-materials'
import { useT } from '@eventflow/i18n/react'

type MaterialsManagerProps = {
  eventId: string
  agendaItemId: string | null // null для новых элементов
  isReadOnly?: boolean
}

const MAX_FILES_PER_UPLOAD = 10
const MAX_FILE_SIZE_MB = 50

export function MaterialsManager({
  eventId,
  agendaItemId,
  isReadOnly = false,
}: MaterialsManagerProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false)
  const [deletingMaterial, setDeletingMaterial] = useState<AgendaMaterial | null>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  /** Кэш имён: url → отображаемое имя (из originalName при загрузке и title при добавлении ссылки) */
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({})

  const { data: materialUrls = [], isLoading } = useAgendaMaterialsQuery(
    eventId,
    agendaItemId || '',
    !!agendaItemId
  )
  const materials = normalizeMaterials(materialUrls, nameOverrides)

  const uploadMutation = useUploadMultipleAgendaFiles(eventId, agendaItemId || '')
  const addLinkMutation = useAddAgendaLink(eventId, agendaItemId || '')
  const deleteMutation = useDeleteAgendaMaterial(eventId, agendaItemId || '')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!agendaItemId) {
      toast.error(t('events.batch1.materialsManager.s001'))
      return
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      toast.error(t('events.agenda.validation.maxFiles', { count: MAX_FILES_PER_UPLOAD }))
      return
    }
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
    const oversized = files.find(f => f.size > maxBytes)
    if (oversized) {
      toast.error(
        t('events.agenda.validation.fileTooLarge', {
          name: oversized.name,
          size: MAX_FILE_SIZE_MB,
        })
      )
      return
    }

    try {
      const result = await uploadMutation.mutateAsync(files)
      const next: Record<string, string> = { ...nameOverrides }
      result.forEach((item: { url: string; originalName: string }) => {
        next[item.url] = item.originalName
      })
      setNameOverrides(next)
      toast.success(t('events.agenda.toasts.filesUploaded', { count: files.length }))
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      toast.error(t('events.batch1.materialsManager.s002'))
    }
  }

  const handleAddLink = async () => {
    const url = linkUrl.trim()
    if (!url) {
      toast.error(t('events.batch1.materialsManager.s003'))
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error(t('events.batch1.materialsManager.s004'))
      return
    }
    if (!agendaItemId) {
      toast.error(t('events.batch1.materialsManager.s001'))
      return
    }

    try {
      const { url: addedUrl } = await addLinkMutation.mutateAsync({
        url,
        title: linkTitle.trim() || undefined,
      })
      if (linkTitle.trim()) {
        setNameOverrides(prev => ({ ...prev, [addedUrl]: linkTitle.trim() }))
      }
      toast.success(t('events.batch1.materialsManager.s005'))
      setLinkTitle('')
      setLinkUrl('')
      setIsAddLinkOpen(false)
    } catch {
      toast.error(t('events.batch1.materialsManager.s006'))
    }
  }

  const handleDelete = async (material: AgendaMaterial) => {
    try {
      await deleteMutation.mutateAsync(material.url)
      setNameOverrides(prev => {
        const next = { ...prev }
        delete next[material.url]
        return next
      })
      toast.success(t('events.batch1.materialsManager.s007'))
    } catch {
      toast.error(t('events.batch1.materialsManager.s008'))
    }
  }

  const handleDownloadFile = useCallback(
    async (material: AgendaMaterial) => {
      if (!agendaItemId || isExternalMaterialUrl(material.url)) return
      try {
        const blob = await agendaMaterialsService.downloadFile(
          eventId,
          agendaItemId,
          material.url
        )
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = material.name || 'file'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } catch {
        toast.error(t('events.batch1.materialsManager.s009'))
      }
    },
    [eventId, agendaItemId]
  )

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  // Для новых элементов (до сохранения)
  if (!agendaItemId) {
    return (
      <div>
        <Label className="text-sm font-medium mb-2 block">{t('events.batch1.materialsManager.s010')}</Label>
        <Card className="border-dashed p-6 text-center bg-muted/30">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">{t('events.batch1.materialsManager.s011')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('events.batch1.materialsManager.s012')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{t('events.batch1.materialsManager.s010')}</Label>
        {materials.length > 0 && (
          <span className="text-xs text-muted-foreground">{materials.length}{t('events.batch1.materialsManager.s013')}</span>
        )}
      </div>

      {/* Действия */}
      {!isReadOnly && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadMutation.isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex-1"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}{t('events.batch1.materialsManager.s014')}</Button>
            <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addLinkMutation.isPending}
                className="flex-1"
              >
                <LinkIcon className="mr-2 h-4 w-4" />{t('events.batch1.materialsManager.s015')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('events.batch1.materialsManager.s015')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="link-url" className="text-sm font-medium">
                    URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="link-url"
                    type="url"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="link-title" className="text-sm font-medium">{t('events.batch1.materialsManager.s016')}</Label>
                  <Input
                    id="link-title"
                    value={linkTitle}
                    onChange={e => setLinkTitle(e.target.value)}
                    placeholder={t('events.batch1.materialsManager.s017')}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddLinkOpen(false)}
                  >{t('events.batch1.materialsManager.s018')}</Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim() || addLinkMutation.isPending}
                  >
                    {addLinkMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}{t('events.batch1.materialsManager.s019')}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">{t('events.batch1.materialsManager.s020')}{MAX_FILES_PER_UPLOAD}{t('events.batch1.materialsManager.s021')}{MAX_FILE_SIZE_MB}{t('events.batch1.materialsManager.s022')}</p>
        </div>
      )}

      {/* Список материалов */}
      {isLoading ? (
        <div className="flex items-center justify-center p-4 border border-border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('events.batch1.materialsManager.s023')}</span>
        </div>
      ) : materials.length === 0 ? (
        <Card className="border-dashed p-4 text-center bg-muted/30">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.batch1.materialsManager.s024')}</p>
          {!isReadOnly && (
            <p className="mt-1 text-xs text-muted-foreground">{t('events.batch1.materialsManager.s025')}</p>
          )}
        </Card>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-lg p-2 bg-card">
          {materials.map(material => (
            <div
              key={material.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-md transition-colors',
                isReadOnly ? 'hover:bg-muted/50' : 'hover:bg-muted'
              )}
            >
              {/* Иконка */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded shrink-0',
                  'bg-brand-soft'
                )}
              >
                {material.type === 'FILE' ? (
                  <FileText className="h-4 w-4 text-brand-soft-foreground" />
                ) : (
                  <LinkIcon className="h-4 w-4 text-brand-soft-foreground" />
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{material.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {material.type === 'FILE' ? t('events.batch1.materialsManager.s026') : t('events.batch1.materialsManager.s027')}
                  </Badge>
                  {material.size && (
                    <span className="text-xs text-muted-foreground">{formatFileSize(material.size)}</span>
                  )}
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-1 shrink-0">
                {material.type === 'FILE' ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(material)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t('events.batch1.materialsManager.s028')}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t('events.batch1.materialsManager.s029')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setDeletingMaterial(material)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded hover:bg-danger-soft text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    title={t('events.batch1.materialsManager.s030')}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingMaterial} onOpenChange={open => !open && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.batch1.materialsManager.s031')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMaterial
                ? t('events.agenda.materials.deleteDescriptionWithName', {
                    name: deletingMaterial.name,
                  })
                : t('events.agenda.materials.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMaterial(null)}>{t('events.batch1.materialsManager.s018')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingMaterial) return
                void handleDelete(deletingMaterial)
                setDeletingMaterial(null)
              }}
            >{t('events.batch1.materialsManager.s030')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
