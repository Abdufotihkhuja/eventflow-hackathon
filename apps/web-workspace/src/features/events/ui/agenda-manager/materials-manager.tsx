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
import { useLocale, useT } from '@eventflow/i18n/react'

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
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'

const MATERIAL_TITLE_FIELD_KEYS = ['title'] as const
const MATERIAL_BUSINESS_LOCALES: readonly AppLocale[] = ['ru', 'uz', 'en']

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
  const uiLocale = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false)
  const [deletingMaterial, setDeletingMaterial] = useState<AgendaMaterial | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkActiveLocale, setLinkActiveLocale] = useState<AppLocale>('ru')
  const [linkTranslationValues, setLinkTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(MATERIAL_TITLE_FIELD_KEYS, undefined, { title: '' })
  )
  const [linkTranslationMeta, setLinkTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(
      MATERIAL_TITLE_FIELD_KEYS,
      undefined,
      linkTranslationValues,
    )
  )
  /** Локальный кэш имён: originalName при загрузке файлов (нет в БД) */
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({})

  const { data: materialsResponse, isLoading } = useAgendaMaterialsQuery(
    eventId,
    agendaItemId || '',
    !!agendaItemId
  )
  const materials = normalizeMaterials(
    materialsResponse?.items ?? [],
    uiLocale,
    nameOverrides,
  )

  const uploadMutation = useUploadMultipleAgendaFiles(eventId, agendaItemId || '')
  const addLinkMutation = useAddAgendaLink(eventId, agendaItemId || '')
  const deleteMutation = useDeleteAgendaMaterial(eventId, agendaItemId || '')
  const translateBatch = useTranslateBatch()

  const linkTitleFields: BusinessTranslationFieldConfig[] = [
    {
      key: 'title',
      label: t('events.agenda.materials.linkTitle'),
      placeholder: t('events.agenda.materials.linkTitlePlaceholder'),
      maxLength: 200,
    },
  ]

  const handleLinkTitleChange = (
    fieldKey: string,
    locale: AppLocale,
    value: string,
  ) => {
    const next = setBusinessTranslationValue(
      linkTranslationValues,
      linkTranslationMeta,
      fieldKey,
      locale,
      value,
    )
    setLinkTranslationValues(next.values)
    setLinkTranslationMeta(next.meta)
  }

  const linkSourceLocale = resolveBusinessSourceLocale(
    linkTranslationValues,
    MATERIAL_TITLE_FIELD_KEYS,
    linkActiveLocale,
  )

  const handleLinkAutoTranslate = (mode: TranslationApplyMode) => {
    if (!linkSourceLocale) {
      toast.error(t('common.translations.addTextBeforeTranslating'))
      return
    }
    const items = getBatchTranslationItems(
      linkTranslationValues,
      linkTranslationMeta,
      MATERIAL_TITLE_FIELD_KEYS,
      linkSourceLocale,
      mode,
    )
    if (items.length === 0) {
      toast.info(t('common.translations.noEligibleFields'))
      return
    }
    const beforeValues = linkTranslationValues
    const beforeMeta = linkTranslationMeta
    translateBatch.mutate(
      {
        sourceLocale: linkSourceLocale,
        targetLocales: MATERIAL_BUSINESS_LOCALES.filter(l => l !== linkSourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          setLinkTranslationValues(applied.values)
          setLinkTranslationMeta(applied.meta)
          toast.success(t('common.translations.translatedSummary', summary))
        },
        onError: error => {
          toast.error(error?.message ?? t('common.translations.serviceFailed'))
        },
      },
    )
  }

  const resetLinkDialog = () => {
    setLinkUrl('')
    setLinkActiveLocale('ru')
    const fresh = createBusinessTranslationValues(MATERIAL_TITLE_FIELD_KEYS, undefined, {
      title: '',
    })
    setLinkTranslationValues(fresh)
    setLinkTranslationMeta(
      createBusinessTranslationMeta(MATERIAL_TITLE_FIELD_KEYS, undefined, fresh),
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!agendaItemId) {
      toast.error(t('events.agenda.validation.saveItemFirst'))
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
      toast.error(t('events.agenda.toasts.filesUploadError'))
    }
  }

  const handleAddLink = async () => {
    const url = linkUrl.trim()
    if (!url) {
      toast.error(t('events.agenda.validation.linkRequired'))
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error(t('events.agenda.validation.invalidLink'))
      return
    }
    if (!agendaItemId) {
      toast.error(t('events.agenda.validation.saveItemFirst'))
      return
    }

    // Собираем непустые локали для отправки на бэк.
    const titleField = linkTranslationValues.title ?? {}
    const titleTranslations: Partial<Record<AppLocale, string>> = {}
    for (const locale of MATERIAL_BUSINESS_LOCALES) {
      const value = titleField[locale]?.trim()
      if (value) titleTranslations[locale] = value
    }

    try {
      await addLinkMutation.mutateAsync({
        url,
        ...(Object.keys(titleTranslations).length > 0 && { titleTranslations }),
      })
      toast.success(t('events.agenda.toasts.linkAdded'))
      resetLinkDialog()
      setIsAddLinkOpen(false)
    } catch {
      toast.error(t('events.agenda.toasts.linkAddError'))
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
      toast.success(t('events.agenda.toasts.materialDeleted'))
    } catch {
      toast.error(t('events.agenda.toasts.materialDeleteError'))
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
        toast.error(t('events.agenda.toasts.downloadError'))
      }
    },
    [eventId, agendaItemId, t]
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
        <Label className="text-sm font-medium mb-2 block">{t('events.agenda.materials.title')}</Label>
        <Card className="border-dashed p-6 text-center bg-muted">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {t('events.agenda.materials.saveItemFirst')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('events.agenda.materials.saveItemFirstDescription')}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{t('events.agenda.materials.title')}</Label>
        {materials.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('events.agenda.materials.count', { count: materials.length })}
          </span>
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
              )}
              {t('events.agenda.materials.uploadFiles')}
            </Button>
            <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addLinkMutation.isPending}
                className="flex-1"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {t('events.agenda.materials.addLink')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{t('events.agenda.materials.addLink')}</DialogTitle>
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

                {/* Локализованная подпись на 3 языках + Tilmoch авто-перевод */}
                <MultilingualTabsField
                  fields={linkTitleFields}
                  values={linkTranslationValues}
                  meta={linkTranslationMeta}
                  activeLocale={linkActiveLocale}
                  onLocaleChange={setLinkActiveLocale}
                  onValueChange={handleLinkTitleChange}
                />
                <TranslateFieldsToolbar
                  sourceLocale={linkSourceLocale}
                  activeLocale={linkActiveLocale}
                  isPending={translateBatch.isPending}
                  disabled={!linkSourceLocale}
                  onTranslateEmpty={() => handleLinkAutoTranslate('fill_empty')}
                  onUpdateAuto={() => handleLinkAutoTranslate('update_auto')}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetLinkDialog()
                      setIsAddLinkOpen(false)
                    }}
                  >
                    {t('actions.cancel')}
                  </Button>
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
                    )}
                    {t('actions.add')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('events.agenda.materials.uploadHint', {
              count: MAX_FILES_PER_UPLOAD,
              size: MAX_FILE_SIZE_MB,
            })}
          </p>
        </div>
      )}

      {/* Список материалов */}
      {isLoading ? (
        <div className="flex items-center justify-center p-4 border border-border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      ) : materials.length === 0 ? (
        <Card className="border-dashed p-4 text-center bg-muted">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t('events.agenda.materials.emptyTitle')}
          </p>
          {!isReadOnly && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('events.agenda.materials.emptyDescription')}
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-lg p-2 bg-card">
          {materials.map(material => (
            <div
              key={material.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-md transition-colors',
                isReadOnly ? 'hover:bg-muted/40' : 'hover:bg-muted'
              )}
            >
              {/* Иконка */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded shrink-0',
                  material.type === 'FILE' ? 'bg-info-soft' : 'bg-success-soft'
                )}
              >
                {material.type === 'FILE' ? (
                  <FileText className="h-4 w-4 text-info" />
                ) : (
                  <LinkIcon className="h-4 w-4 text-success" />
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{material.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {material.type === 'FILE'
                      ? t('events.agenda.materials.file')
                      : t('events.agenda.materials.link')}
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
                    title={t('actions.download')}
                    aria-label={t('actions.download')}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t('events.agenda.materials.openLink')}
                    aria-label={t('events.agenda.materials.openLink')}
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
                    title={t('actions.delete')}
                    aria-label={t('actions.delete')}
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
            <AlertDialogTitle>{t('events.agenda.materials.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMaterial
                ? t('events.agenda.materials.deleteDescriptionWithName', {
                    name: deletingMaterial.name,
                  })
                : t('events.agenda.materials.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMaterial(null)}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingMaterial) return
                void handleDelete(deletingMaterial)
                setDeletingMaterial(null)
              }}
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
