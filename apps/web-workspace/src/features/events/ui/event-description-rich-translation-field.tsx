import * as React from 'react'

import { AlertTriangle, ChevronDown, Loader2, RefreshCw, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useFormContext } from 'react-hook-form'
import { useT } from '@eventflow/i18n/react'

import {
  applyRichTranslationResultSafely,
  buildRichTranslationBatchItems,
  createRichTranslationMetaDraft,
  createRichTranslationsDraft,
  getFirstNonEmptyRichLocale,
  getVisibleSegmentCount,
  isRichDocEmpty,
  mapBatchResultsToTranslatedSegments,
  translateRichSegmentsPerBlock,
  markRichEmpty,
  markRichManualEdit,
  markRichTargetsOutdatedWhenSourceChanged,
  markRichTranslationError,
  shouldSkipRichOverwrite,
  useToolbarLabels,
  useTranslateBatch,
  type AppLocale,
  type RichTranslationMetaDraft,
  type RichTranslationsDraft,
  type TranslateBatchResponse,
  type TranslationApplyMode,
} from '@features/translations'
import type { CreateEventFormValues } from '@features/events/lib/schemas/create-event-schema'
import {
  computeRichTextStructureHash,
  computeRichTextVisibleTextHash,
  extractRichTextSegments,
  isBlockNoteDocument,
  type BlockNoteDocument,
} from '@shared/lib'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  RichTextEditor,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'

type EventDescriptionRichTranslationFieldProps = {
  activeLocale: AppLocale
  onLocaleChange: (locale: AppLocale) => void
  initialDescription?: unknown
  initialRichTranslations?: unknown
  initialRichTranslationMeta?: unknown
  onRichChange?: (draft: RichTranslationsDraft, meta: RichTranslationMetaDraft) => void
}

const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const RICH_FIELD_KEY = 'description'
const MAX_TRANSLATION_BATCH_ITEMS = 50

const LOCALE_LABELS: Record<AppLocale, string> = {
  ru: 'Русский',
  uz: 'O‘zbekcha',
  en: 'English',
}

export function EventDescriptionRichTranslationField({
  activeLocale,
  onLocaleChange,
  initialDescription,
  initialRichTranslations,
  initialRichTranslationMeta,
  onRichChange,
}: EventDescriptionRichTranslationFieldProps) {
  const t = useT()
  const labels = useToolbarLabels()
  const form = useFormContext<CreateEventFormValues>()
  const translateBatch = useTranslateBatch()
  const initialDoc = React.useMemo(() => toBlockNoteDocument(initialDescription), [initialDescription])
  const [richDraft, setRichDraft] = React.useState<RichTranslationsDraft>(() =>
    createRichTranslationsDraft(RICH_FIELD_KEY, initialRichTranslations, initialDoc)
  )
  const [richMeta, setRichMeta] = React.useState<RichTranslationMetaDraft>(() =>
    createRichTranslationMetaDraft(
      RICH_FIELD_KEY,
      initialRichTranslationMeta,
      createRichTranslationsDraft(RICH_FIELD_KEY, initialRichTranslations, initialDoc)
    )
  )

  const sourceLocale = getFirstNonEmptyRichLocale(richDraft, activeLocale)
  const sourceDoc = sourceLocale ? richDraft.description[sourceLocale] : undefined
  const sourceIsValid = sourceDoc === undefined || isBlockNoteDocument(sourceDoc)
  const sourceSegmentCount = sourceDoc ? getVisibleSegmentCount(sourceDoc) : 0
  const fillEmptyTargets = React.useMemo(
    () => getWritableRichTargets(richDraft, richMeta, sourceLocale, 'fill_empty'),
    [richDraft, richMeta, sourceLocale]
  )
  const updateAutoTargets = React.useMemo(
    () => getWritableRichTargets(richDraft, richMeta, sourceLocale, 'update_auto'),
    [richDraft, richMeta, sourceLocale]
  )
  const helpMessage = getRichHelpMessage({
    t,
    sourceLocale,
    sourceIsValid,
    sourceSegmentCount,
    fillEmptyTargets,
    updateAutoTargets,
  })

  React.useEffect(() => {
    onRichChange?.(richDraft, richMeta)
  }, [onRichChange, richDraft, richMeta])

  const syncFormDescription = React.useCallback(
    (draft: RichTranslationsDraft, preferredLocale: AppLocale, fallbackDoc?: BlockNoteDocument) => {
      const fallbackLocale = getFirstNonEmptyRichLocale(draft, preferredLocale)
      const description = fallbackLocale ? draft.description[fallbackLocale] : fallbackDoc

      if (description) {
        form.setValue('description', description as CreateEventFormValues['description'], {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    },
    [form]
  )

  const handleEditorChange = (content: BlockNoteDocument) => {
    const nextDraft: RichTranslationsDraft = {
      description: {
        ...richDraft.description,
        [activeLocale]: content,
      },
    }

    const manualMeta = isRichDocEmpty(content)
      ? markRichEmpty(richMeta, RICH_FIELD_KEY, activeLocale)
      : markRichManualEdit(richMeta, RICH_FIELD_KEY, activeLocale)
    const nextMeta = markRichTargetsOutdatedWhenSourceChanged(
      manualMeta,
      RICH_FIELD_KEY,
      activeLocale,
      content
    )

    setRichDraft(nextDraft)
    setRichMeta(nextMeta)
    syncFormDescription(nextDraft, activeLocale, content)
  }

  const handleTranslateRich = async (mode: TranslationApplyMode) => {
    if (!sourceLocale || !sourceDoc) {
      toast.error(t('common.translations.addRichBeforeTranslating'))
      return
    }

    if (!isBlockNoteDocument(sourceDoc)) {
      toast.error(t('common.translations.sourceRichInvalid'))
      return
    }

    const sourceSegments = extractRichTextSegments(sourceDoc)
    if (sourceSegments.length === 0) {
      toast.info(t('common.translations.noVisibleRichSegments'))
      return
    }

    const allTargetLocales = BUSINESS_LOCALES.filter(locale => locale !== sourceLocale)
    let nextMeta = markUnknownNonEmptyTargetsManual(richDraft, richMeta, sourceLocale)
    const targetLocales = allTargetLocales.filter(
      locale =>
        !shouldSkipRichOverwrite(
          nextMeta.description[locale]?.status,
          mode,
          richDraft.description[locale]
        )
    )

    if (targetLocales.length === 0) {
      setRichMeta(nextMeta)
      toast.info(t('common.translations.noEligibleRichTranslations'))
      return
    }

    const items = buildRichTranslationBatchItems(RICH_FIELD_KEY, sourceSegments)
    const sourceHash = computeRichTextVisibleTextHash(sourceDoc)
    const structureHash = computeRichTextStructureHash(sourceDoc)

    try {
      const responses = []
      for (const chunk of chunkItems(items, MAX_TRANSLATION_BATCH_ITEMS)) {
        responses.push(
          await translateBatch.mutateAsync({
            sourceLocale,
            targetLocales,
            items: chunk,
          })
        )
      }

      const response = mergeBatchResponses(responses)
      let nextDraft = richDraft
      let translated = 0
      let failed = 0
      let firstFailureMessage: string | undefined
      const translatedLocales: AppLocale[] = []

      for (const targetLocale of targetLocales) {
        let mapped = mapBatchResultsToTranslatedSegments(
          response,
          RICH_FIELD_KEY,
          sourceSegments,
          targetLocale
        )

        if (!mapped.ok) {
          // The combined translation couldn't be split back per block (provider
          // reflowed line breaks for this locale). Retry block-by-block.
          const fallback = await translateRichSegmentsPerBlock(
            translateBatch.mutateAsync,
            RICH_FIELD_KEY,
            sourceLocale,
            targetLocale,
            sourceSegments
          )

          if (fallback.ok) {
            mapped = fallback
          } else {
            firstFailureMessage ??= fallback.error
            nextMeta = markRichTranslationError(
              nextMeta,
              RICH_FIELD_KEY,
              targetLocale,
              fallback.error,
              sourceLocale,
              sourceHash
            )
            failed += 1
            continue
          }
        }

        const applied = applyRichTranslationResultSafely(sourceDoc, mapped.segments, response, {
          sourceLocale,
          targetLocale,
          sourceHash,
          structureHash,
        })

        if (!applied.ok) {
          firstFailureMessage ??= applied.error
          nextMeta = markRichTranslationError(
            nextMeta,
            RICH_FIELD_KEY,
            targetLocale,
            applied.error,
            sourceLocale,
            sourceHash
          )
          failed += 1
          continue
        }

        nextDraft = {
          description: {
            ...nextDraft.description,
            [targetLocale]: applied.document,
          },
        }
        nextMeta = {
          description: {
            ...nextMeta.description,
            [targetLocale]: applied.meta,
          },
        }
        translated += 1
        translatedLocales.push(targetLocale)
      }

      const skipped = allTargetLocales.length - targetLocales.length
      setRichDraft(nextDraft)
      setRichMeta(nextMeta)

      const nextActiveLocale = translatedLocales[0]
      if (nextActiveLocale) {
        onLocaleChange(nextActiveLocale)
        syncFormDescription(nextDraft, nextActiveLocale)
      } else {
        syncFormDescription(nextDraft, activeLocale)
      }

      const summary = {
        translated,
        skipped,
        failed,
      }
      if (failed > 0) {
        toast.error(t('common.translations.translationIssueTitle'), {
          description:
            firstFailureMessage ?? t('common.translations.translationIssueDescription', summary),
        })
        return
      }
      toast.success(t('common.translations.richTranslatedToastTitle'), {
        description: t('common.translations.richTranslatedToastDescription', summary),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.translations.serviceFailed')
      const failedMeta = targetLocales.reduce(
        (meta, locale) =>
          markRichTranslationError(meta, RICH_FIELD_KEY, locale, message, sourceLocale, sourceHash),
        nextMeta
      )
      setRichMeta(failedMeta)
      toast.error(message)
    }
  }

  return (
    <FormField
      control={form.control as never}
      name="description"
      render={({ field }) => {
        const activeDoc = richDraft.description[activeLocale]
        const editorValue =
          activeDoc ?? (activeLocale === 'ru' ? field.value : ([] satisfies BlockNoteDocument))

        const onSourceTab = sourceLocale != null && activeLocale === sourceLocale
        const targetLocale = onSourceTab ? null : activeLocale
        const fillEmptyDisabled =
          translateBatch.isPending ||
          !sourceLocale ||
          !sourceIsValid ||
          sourceSegmentCount === 0 ||
          fillEmptyTargets.length === 0
        const updateAutoDisabled =
          translateBatch.isPending ||
          !sourceLocale ||
          !sourceIsValid ||
          sourceSegmentCount === 0 ||
          updateAutoTargets.length === 0
        const targetMeta = targetLocale ? richMeta.description[targetLocale]?.status : undefined
        const targetIsOutdated = targetMeta === 'outdated'

        return (
          <FormItem>
            <div className="flex min-h-5 flex-wrap items-center justify-between gap-2">
              <FormLabel>{t('events.form.fullDescriptionLabel')}</FormLabel>
              <div className="flex flex-wrap justify-end gap-1.5">
                {BUSINESS_LOCALES.map(locale => (
                  <RichStatusBadge
                    key={locale}
                    locale={locale}
                    status={richMeta.description[locale]?.status}
                    t={t}
                  />
                ))}
              </div>
            </div>

            {/* Tilmoch action — компактная pill-кнопка с логотипом, идентичная
                shared TranslateFieldsToolbar. Контекстный label адаптируется
                под source/target таб; tooltip несёт direction/help-сообщение. */}
            <TooltipProvider delayDuration={200}>
              <div
                role="region"
                aria-label={labels.translationTools}
                className="flex items-center gap-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleTranslateRich('fill_empty')}
                        disabled={fillEmptyDisabled}
                        className={cn(
                          'h-9 gap-2 rounded-full px-3 font-medium',
                          'border-success-soft bg-success-soft text-success-soft-foreground',
                          'hover:bg-success-soft/80',
                          'disabled:opacity-60'
                        )}
                      >
                        {translateBatch.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <img
                            src="/tilmoch-icon.svg"
                            alt=""
                            aria-hidden="true"
                            className="size-4 rounded-sm"
                          />
                        )}
                        <span>
                          {targetLocale
                            ? labels.translateTo(LOCALE_LABELS[targetLocale])
                            : labels.translateToAll}
                        </span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {translateBatch.isPending
                      ? labels.translatingProgress
                      : (helpMessage ?? labels.poweredBy)}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={translateBatch.isPending || !sourceLocale}
                      aria-label={labels.bulkActionsLabel}
                      className={cn(
                        'h-9 w-7 rounded-full p-0 text-success-soft-foreground hover:bg-success-soft/60'
                      )}
                    >
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={() => handleTranslateRich('fill_empty')}
                      disabled={fillEmptyDisabled}
                    >
                      <WandSparkles className="size-4" aria-hidden="true" />
                      {labels.fillEmpty}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTranslateRich('update_auto')}
                      disabled={updateAutoDisabled}
                    >
                      <RefreshCw className="size-4" aria-hidden="true" />
                      {labels.updateOutdated}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>

            {targetIsOutdated && !onSourceTab && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground"
              >
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                <span>{labels.sourceChangedBanner}</span>
              </div>
            )}

            <FormControl>
              <RichTextEditor
                key={`event-description-${activeLocale}`}
                value={editorValue}
                onChange={content => handleEditorChange(content as BlockNoteDocument)}
                placeholder={t('events.form.fullDescriptionPlaceholder')}
              />
            </FormControl>
            <FormDescription>{t('events.form.fullDescriptionDescription')}</FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

function RichStatusBadge({
  locale,
  status,
  t,
}: {
  locale: AppLocale
  status?: RichTranslationMetaDraft['description'][AppLocale]['status']
  t: ReturnType<typeof useT>
}) {
  if (!status || status === 'empty') return null

  const variant =
    status === 'translation_error'
      ? 'destructive'
      : status === 'outdated'
        ? 'warning'
        : status === 'auto_translated'
          ? 'secondary'
          : 'outline'

  return (
    <Badge
      variant={variant}
      title={`${LOCALE_LABELS[locale]}: ${getRichStatusLabel(t, status)}`}
      className="gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium"
    >
      <span className="text-[9px] font-semibold uppercase opacity-80">{locale}</span>
      <span>{getCompactRichStatusLabel(t, status)}</span>
    </Badge>
  )
}

function getCompactRichStatusLabel(
  t: ReturnType<typeof useT>,
  status: NonNullable<RichTranslationMetaDraft['description'][AppLocale]['status']>
) {
  switch (status) {
    case 'auto_translated':
      return t('common.translations.statusAuto')
    case 'manual':
    case 'edited_after_translation':
      return t('common.translations.statusManual')
    case 'outdated':
      return t('common.translations.statusOutdated')
    case 'translation_error':
      return t('common.translations.statusError')
    case 'empty':
      return null
  }
}

function getRichStatusLabel(
  t: ReturnType<typeof useT>,
  status: NonNullable<RichTranslationMetaDraft['description'][AppLocale]['status']>
) {
  switch (status) {
    case 'auto_translated':
      return t('common.translations.autoTranslated')
    case 'manual':
    case 'edited_after_translation':
      return t('common.translations.editedManually')
    case 'outdated':
      return t('common.translations.outdated')
    case 'translation_error':
      return t('common.translations.translationError')
    case 'empty':
      return ''
  }
}

function toBlockNoteDocument(value: unknown): BlockNoteDocument | undefined {
  return isBlockNoteDocument(value) ? value : undefined
}

function getWritableRichTargets(
  draft: RichTranslationsDraft,
  meta: RichTranslationMetaDraft,
  sourceLocale: AppLocale | null,
  mode: TranslationApplyMode
): AppLocale[] {
  if (!sourceLocale) return []

  return BUSINESS_LOCALES.filter(locale => {
    if (locale === sourceLocale) return false
    return !shouldSkipRichOverwrite(
      meta.description[locale]?.status,
      mode,
      draft.description[locale]
    )
  })
}

function markUnknownNonEmptyTargetsManual(
  draft: RichTranslationsDraft,
  meta: RichTranslationMetaDraft,
  sourceLocale: AppLocale
): RichTranslationMetaDraft {
  return BUSINESS_LOCALES.filter(locale => locale !== sourceLocale).reduce((nextMeta, locale) => {
    const status = nextMeta.description[locale]?.status
    const doc = draft.description[locale]
    if (!status && doc && !isRichDocEmpty(doc)) {
      return markRichManualEdit(nextMeta, RICH_FIELD_KEY, locale)
    }
    return nextMeta
  }, meta)
}

function getRichHelpMessage({
  t,
  sourceLocale,
  sourceIsValid,
  sourceSegmentCount,
  fillEmptyTargets,
  updateAutoTargets,
}: {
  t: ReturnType<typeof useT>
  sourceLocale: AppLocale | null
  sourceIsValid: boolean
  sourceSegmentCount: number
  fillEmptyTargets: AppLocale[]
  updateAutoTargets: AppLocale[]
}): string | null {
  if (!sourceLocale) {
    return t('common.translations.addRichBeforeTranslating')
  }

  if (!sourceIsValid) {
    return t('common.translations.sourceRichInvalid')
  }

  if (sourceSegmentCount === 0) {
    return t('common.translations.noVisibleRichSegments')
  }

  if (fillEmptyTargets.length === 0 && updateAutoTargets.length === 0) {
    return t('common.translations.manualRichNotOverwritten')
  }

  return null
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function mergeBatchResponses(responses: TranslateBatchResponse[]): TranslateBatchResponse {
  return {
    results: responses.flatMap(response => response.results),
    summary: responses.reduce(
      (summary, response) => ({
        translated: summary.translated + response.summary.translated,
        skipped: summary.skipped + response.summary.skipped,
        failed: summary.failed + response.summary.failed,
      }),
      { translated: 0, skipped: 0, failed: 0 }
    ),
  }
}
