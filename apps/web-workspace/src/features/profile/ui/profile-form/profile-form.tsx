import { useEffect, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Briefcase, Globe, Hash, MapPin, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getBatchTranslationFailureMessage,
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
import { Button } from '@shared/ui/shadcn/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/shadcn/form'
import { Input } from '@shared/ui/shadcn/input'

import type { ProfileFormValues } from '../../lib/schemas/profile-schema'

const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const ORGANIZATION_TRANSLATION_FIELD_KEYS = ['companyName', 'description'] as const

export type ProfileSubmitValues = ProfileFormValues & {
  translations?: TranslationValues
  translationMeta?: TranslationMeta
}

type ProfileFormProps = {
  form: UseFormReturn<ProfileFormValues>
  onSubmit: (values: ProfileSubmitValues) => void
  isLoading?: boolean
  rawTranslations?: unknown
  rawTranslationMeta?: unknown
  fallbackCompanyName?: string | null
  fallbackDescription?: string | null
}

/**
 * Форма редактирования профиля организации.
 * Включает поля: название, описание, телефон.
 */
export function ProfileForm({
  form,
  onSubmit,
  isLoading = false,
  rawTranslations,
  rawTranslationMeta,
  fallbackCompanyName,
  fallbackDescription,
}: ProfileFormProps) {
  const t = useT()
  const translateBatch = useTranslateBatch()
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(ORGANIZATION_TRANSLATION_FIELD_KEYS, rawTranslations, {
      companyName: fallbackCompanyName ?? form.getValues('organizationName'),
      description: fallbackDescription ?? form.getValues('description'),
    })
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(
      ORGANIZATION_TRANSLATION_FIELD_KEYS,
      rawTranslationMeta,
      translationValues
    )
  )
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    ORGANIZATION_TRANSLATION_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'companyName',
        label: t('profile.fields.organizationName'),
        placeholder: t('profile.placeholders.organizationName'),
        maxLength: 200,
      },
      {
        key: 'description',
        label: t('profile.fields.description'),
        placeholder: t('profile.placeholders.description'),
        maxLength: 2000,
        multiline: true,
        rows: 4,
      },
    ],
    [t]
  )

  useEffect(() => {
    const values = createBusinessTranslationValues(
      ORGANIZATION_TRANSLATION_FIELD_KEYS,
      rawTranslations,
      {
        companyName: fallbackCompanyName ?? form.getValues('organizationName'),
        description: fallbackDescription ?? form.getValues('description'),
      }
    )
    setTranslationValues(values)
    setTranslationMeta(
      createBusinessTranslationMeta(
        ORGANIZATION_TRANSLATION_FIELD_KEYS,
        rawTranslationMeta,
        values
      )
    )
    setActiveLocale('ru')
  }, [fallbackCompanyName, fallbackDescription, form, rawTranslationMeta, rawTranslations])

  const syncScalarFallbacks = (values: TranslationValues) => {
    form.setValue(
      'organizationName',
      getFallbackBusinessTranslation(values, 'companyName', fallbackCompanyName ?? ''),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    )
    form.setValue(
      'description',
      getFallbackBusinessTranslation(values, 'description', fallbackDescription ?? ''),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    )
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
    syncScalarFallbacks(next.values)
  }

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error('Add text in at least one language before translating.')
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      ORGANIZATION_TRANSLATION_FIELD_KEYS,
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
          syncScalarFallbacks(applied.values)
          if (summary.failed > 0) {
            const failureMessage = getBatchTranslationFailureMessage(response)
            toast.error('Translation partially completed', {
              description: failureMessage ?? `Updated: ${summary.translated}. Failed: ${summary.failed}.`,
            })
            return
          }
          toast.success('Translation ready', {
            description: `Updated: ${summary.translated}. Unchanged: ${summary.skipped}.`,
          })
        },
        onError: error => {
          toast.error(error?.message ?? 'Translation service failed.')
        },
      }
    )
  }

  const handleSubmit = (values: ProfileFormValues) => {
    onSubmit({
      ...values,
      translations: {
        ...translationValues,
        name: translationValues.companyName,
      },
      translationMeta: {
        ...translationMeta,
        name: translationMeta.companyName,
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <input type="hidden" {...form.register('organizationName')} />
        <input type="hidden" {...form.register('description')} />
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
          disabled={isLoading || !sourceLocale}
          onTranslateEmpty={() => handleTranslate('fill_empty')}
          onUpdateAuto={() => handleTranslate('update_auto')}
        />
        {form.formState.errors.organizationName?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.organizationName.message)}
          </p>
        )}
        {form.formState.errors.description?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.description.message)}
          </p>
        )}

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.phone')}
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inn"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.inn')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="123456789"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                  maxLength={20}
                />
              </FormControl>
              {!field.value?.trim() && (
                <FormDescription className="text-warning">
                  {t('profile.descriptions.innRequired')}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.industry')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('profile.placeholders.industry')}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.companySize')}
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={t('profile.placeholders.companySize')}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    field.onChange(v)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.address')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('profile.placeholders.address')}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.website')}
              </FormLabel>
              <FormControl>
                <Input
                  type="url"
                  inputMode="url"
                  placeholder={t('profile.placeholders.website')}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>{t('profile.descriptions.website')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading ? t('profile.actions.saving') : t('profile.actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
