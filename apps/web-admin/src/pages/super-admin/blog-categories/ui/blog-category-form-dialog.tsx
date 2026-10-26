/**
 * Диалог создания/редактирования категории блога (Super Admin)
 */

import { useState, useEffect, useMemo } from 'react'
import { useT } from '@eventflow/i18n/react'
import type {
  AdminBlogCategory,
  CreateAdminBlogCategoryRequest,
} from '@api/services/superAdmin.types'
import {
  useCheckBlogCategorySlug,
  BLOG_CATEGORY_SLUG_VALID_REGEX,
} from '@features/super-admin'
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

const SLUG_DEBOUNCE_MS = 400
const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const BLOG_CATEGORY_FIELD_KEYS = ['name', 'description'] as const

type BlogCategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: AdminBlogCategory | null
  defaultValues?: Partial<CreateAdminBlogCategoryRequest>
  onSubmit: (data: CreateAdminBlogCategoryRequest) => void
  isPending?: boolean
}

export function BlogCategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultValues,
  onSubmit,
  isPending,
}: BlogCategoryFormDialogProps) {
  const t = useT()
  const isEdit = !!category

  const [slug, setSlug] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(
    () => createBusinessTranslationValues(BLOG_CATEGORY_FIELD_KEYS, undefined, {})
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(
    () => createBusinessTranslationMeta(BLOG_CATEGORY_FIELD_KEYS, undefined, translationValues)
  )

  const debouncedSlug = useDebounce(toFormString(slug).trim().toLowerCase(), SLUG_DEBOUNCE_MS)
  const slugCheck = useCheckBlogCategorySlug(
    debouncedSlug,
    isEdit && category ? String(category.id) : undefined
  )
  const slugTrim = toFormString(slug).trim()
  const slugInvalidFormat =
    slugTrim.length > 0 && !BLOG_CATEGORY_SLUG_VALID_REGEX.test(slugTrim.toLowerCase())

  const translateBatch = useTranslateBatch()
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    BLOG_CATEGORY_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'name',
        label: t('admin.blogCategories.name'),
        placeholder: t('admin.blogCategories.namePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'description',
        label: t('admin.blogCategories.description'),
        placeholder: t('admin.blogCategories.descriptionPlaceholder'),
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
      setIsActive(toFormBoolean(category?.isActive ?? defaultValues?.isActive ?? true))
      const values = createBusinessTranslationValues(
        BLOG_CATEGORY_FIELD_KEYS,
        category?.translations ?? defaultValues?.translations,
        {
          name: category?.name ?? defaultValues?.name,
          description: category?.description ?? defaultValues?.description,
        }
      )
      setTranslationValues(values)
      setTranslationMeta(
        createBusinessTranslationMeta(
          BLOG_CATEGORY_FIELD_KEYS,
          category?.translationMeta ?? defaultValues?.translationMeta,
          values
        )
      )
      setActiveLocale('ru')
    }
  }, [open, category, defaultValues])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nameTrim = getFallbackBusinessTranslation(translationValues, 'name')
    const descriptionTrim = getFallbackBusinessTranslation(translationValues, 'description')
    const slugTrim = toFormString(slug).trim()
    if (!nameTrim) return
    onSubmit({
      name: nameTrim,
      slug: slugTrim || undefined,
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
      BLOG_CATEGORY_FIELD_KEYS,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('admin.blogCategories.editTitle') : t('admin.blogCategories.newTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('admin.blogCategories.editDescription')
              : t('admin.blogCategories.createDescription')}
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
            <Label htmlFor="blog-cat-slug">Slug *</Label>
            <Input
              id="blog-cat-slug"
              value={toFormString(slug)}
              onChange={e => setSlug(e.target.value)}
              placeholder="url-slug (a-z, 0-9, -)"
              className="font-mono"
              required
              aria-invalid={slugCheck.data?.available === false || slugInvalidFormat}
            />
            {slugInvalidFormat && (
              <p className="text-sm text-destructive">{t('admin.blogCategories.slugHint')}</p>
            )}
            {!slugInvalidFormat && debouncedSlug.length > 0 && (
              <>
                {slugCheck.isFetching && (
                  <p className="text-sm text-muted-foreground">
                    {t('admin.blogCategories.checking')}
                  </p>
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
                      ? t('admin.blogCategories.slugAvailable')
                      : t('admin.blogCategories.slugTaken')}
                  </p>
                )}
                {slugCheck.error && (
                  <p className="text-sm text-destructive">
                    {t('admin.blogCategories.slugCheckError')}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="blog-cat-active">{t('admin.blogCategories.active')}</Label>
            <Switch
              id="blog-cat-active"
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
