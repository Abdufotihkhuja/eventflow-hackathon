/**
 * Диалог создания/редактирования категории (Super Admin)
 * Иконка: загрузка файла .svg/.png через POST …/icon-upload, в тело — url из ответа.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useT } from '@eventflow/i18n/react'
import type { AdminCategory, CreateAdminCategoryRequest } from '@api/services/superAdmin.types'
import type { ApiError } from '@api/types'
import { getMediaUrl } from '@api/config'
import { useUploadCategoryIcon, useCheckCategorySlug, SLUG_VALID_REGEX } from '@features/super-admin'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
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
import { useDebounce } from '@shared/lib/use-debounce'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Switch,
} from '@shared/ui'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

function toFormString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function toFormBoolean(v: unknown): boolean {
  return v === true || v === 'true'
}

const ICON_ACCEPT = '.svg,.png,image/svg+xml,image/png'
const ICON_MAX_SIZE_MB = 5
const SLUG_DEBOUNCE_MS = 400
const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const CATEGORY_FIELD_KEYS = ['name', 'description'] as const

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: AdminCategory | null
  defaultValues?: Partial<CreateAdminCategoryRequest>
  onSubmit: (data: CreateAdminCategoryRequest) => void
  isPending?: boolean
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultValues,
  onSubmit,
  isPending,
}: CategoryFormDialogProps) {
  const t = useT()
  const isEdit = !!category
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [slug, setSlug] = useState('')
  const [icon, setIcon] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [iconError, setIconError] = useState<string | null>(null)
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(
    () => createBusinessTranslationValues(CATEGORY_FIELD_KEYS, undefined, {})
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(
    () => createBusinessTranslationMeta(CATEGORY_FIELD_KEYS, undefined, translationValues)
  )

  const debouncedSlug = useDebounce(toFormString(slug).trim().toLowerCase(), SLUG_DEBOUNCE_MS)
  const slugCheck = useCheckCategorySlug(
    debouncedSlug,
    isEdit && category ? String(category.id) : undefined
  )
  const slugTrim = toFormString(slug).trim()
  const slugInvalidFormat =
    slugTrim.length > 0 && !SLUG_VALID_REGEX.test(slugTrim.toLowerCase())

  const uploadIcon = useUploadCategoryIcon()
  const translateBatch = useTranslateBatch()
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    CATEGORY_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'name',
        label: t('admin.categories.name'),
        placeholder: t('admin.categories.namePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'description',
        label: t('admin.categories.description'),
        placeholder: t('admin.categories.descriptionPlaceholder'),
        maxLength: 500,
        multiline: true,
        rows: 2,
      },
    ],
    [t]
  )

  useEffect(() => {
    if (open) {
      setSlug(toFormString(category?.slug ?? defaultValues?.slug))
      setIcon(toFormString(category?.icon ?? defaultValues?.icon))
      setIsActive(toFormBoolean(category?.isActive ?? defaultValues?.isActive ?? true))
      const values = createBusinessTranslationValues(
        CATEGORY_FIELD_KEYS,
        category?.translations ?? defaultValues?.translations,
        {
          name: category?.name ?? defaultValues?.name,
          description: category?.description ?? defaultValues?.description,
        }
      )
      setTranslationValues(values)
      setTranslationMeta(
        createBusinessTranslationMeta(
          CATEGORY_FIELD_KEYS,
          category?.translationMeta ?? defaultValues?.translationMeta,
          values
        )
      )
      setActiveLocale('ru')
      setIconError(null)
    }
  }, [open, category, defaultValues])

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconError(null)
    const validTypes = ['image/svg+xml', 'image/png']
    if (!validTypes.includes(file.type)) {
      setIconError(t('admin.categories.onlySvgPng'))
      return
    }
    if (file.size > ICON_MAX_SIZE_MB * 1024 * 1024) {
      setIconError(t('admin.categories.iconSizeError', { size: ICON_MAX_SIZE_MB }))
      return
    }
    uploadIcon.mutate(file, {
      onSuccess: res => {
        setIcon(res.url)
        setIconError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      onError: (error: unknown) => {
        const message = (error as ApiError)?.message ?? t('admin.categories.iconUploadError')
        setIconError(message)
      },
    })
  }

  const handleRemoveIcon = () => {
    setIcon('')
    setIconError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nameTrim = getFallbackBusinessTranslation(translationValues, 'name')
    const descriptionTrim = getFallbackBusinessTranslation(translationValues, 'description')
    const slugTrim = toFormString(slug).trim()
    const iconTrim = toFormString(icon).trim()
    if (!nameTrim) return
    setIconError(null)
    onSubmit({
      name: nameTrim,
      slug: slugTrim || undefined,
      icon: iconTrim || undefined,
      description: descriptionTrim || undefined,
      translations: translationValues,
      translationMeta,
      isActive: toFormBoolean(isActive),
    })
  }

  const handleTranslationChange = (fieldKey: string, locale: AppLocale, value: string) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value
    )
    setTranslationValues(next.values)
    setTranslationMeta(next.meta)
  }

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error('Add text in at least one language before translating.')
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      CATEGORY_FIELD_KEYS,
      sourceLocale,
      mode
    )

    if (items.length === 0) {
      toast.info('No eligible fields to translate.')
      return
    }

    const beforeValues = translationValues
    const beforeMeta = translationMeta
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales: BUSINESS_LOCALES.filter(locale => locale !== sourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          setTranslationValues(applied.values)
          setTranslationMeta(applied.meta)
          toast.success(
            `Translated: ${summary.translated}. Skipped: ${summary.skipped}. Failed: ${summary.failed}.`
          )
        },
        onError: error => {
          toast.error(error?.message ?? 'Translation service failed.')
        },
      }
    )
  }

  const iconDisplayUrl = icon ? (icon.startsWith('http') ? icon : getMediaUrl(icon)) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin.categories.editTitle') : t('admin.categories.newTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('admin.categories.editDescription') : t('admin.categories.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MultilingualTabsField
            fields={translationFields}
            values={translationValues}
            meta={translationMeta}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onValueChange={handleTranslationChange}
          />
          <TranslateFieldsToolbar
            sourceLocale={sourceLocale}
            activeLocale={activeLocale}
            isPending={translateBatch.isPending}
            disabled={isPending || !sourceLocale}
            onTranslateEmpty={() => handleTranslate('fill_empty')}
            onUpdateAuto={() => handleTranslate('update_auto')}
          />
          <div className="space-y-2">
            <Label htmlFor="cat-slug">Slug *</Label>
            <Input
              id="cat-slug"
              value={toFormString(slug)}
              onChange={e => setSlug(e.target.value)}
              placeholder="url-slug (a-z, 0-9, -)"
              className="font-mono"
              required
              aria-invalid={slugCheck.data?.available === false || slugInvalidFormat}
            />
            {slugInvalidFormat && (
              <p className="text-sm text-destructive">{t('admin.categories.slugHint')}</p>
            )}
            {!slugInvalidFormat && debouncedSlug.length > 0 && (
              <>
                {slugCheck.isFetching && (
                  <p className="text-sm text-muted-foreground">{t('admin.categories.checking')}</p>
                )}
                {slugCheck.isFetched && !slugCheck.error && slugCheck.data && (
                  <p
                    className={
                      slugCheck.data.available
                        ? 'text-sm text-success'
                        : 'text-sm text-destructive'
                    }
                  >
                    {slugCheck.data.available
                      ? t('admin.categories.slugAvailable')
                      : t('admin.categories.slugTaken')}
                  </p>
                )}
                {slugCheck.error && (
                  <p className="text-sm text-destructive">
                    {t('admin.categories.slugCheckError')}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('admin.categories.icon')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ICON_ACCEPT}
              onChange={handleIconFileChange}
              className="hidden"
              aria-invalid={!!iconError}
            />
            {iconDisplayUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
                  <img
                    src={iconDisplayUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {t('admin.categories.iconUploaded')}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadIcon.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadIcon.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      t('admin.actions.replace')
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveIcon}
                    disabled={uploadIcon.isPending}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={uploadIcon.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadIcon.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('admin.categories.uploadIcon')}
              </Button>
            )}
            {iconError && (
              <p className="text-sm text-destructive">{iconError}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cat-active">{t('admin.categories.active')}</Label>
            <Switch
              id="cat-active"
              checked={toFormBoolean(isActive)}
              onCheckedChange={setIsActive}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (!!debouncedSlug && slugCheck.isFetched && slugCheck.data?.available === false)
              }
            >
              {isEdit ? t('admin.actions.save') : t('admin.actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
