import * as React from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  PencilLine,
  RefreshCw,
  Sparkles,
  WandSparkles,
  XCircle,
} from 'lucide-react'
import { useLocale } from '@eventflow/i18n/react'

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import type { AppLocale, TranslationMeta, TranslationStatus, TranslationValues } from '../model/types'

// Defensive UI dictionary: критичные строки toolbar'а захардкожены, чтобы UI
// не зависел от runtime-состояния i18n пакета. Используем useLocale для
// выбора текста по языку интерфейса.
type UiLocale = 'ru' | 'uz' | 'en'
type ToolbarLabels = {
  pickSourceLocale: string
  source: (locale: string) => string
  sourceArrow: (source: string, target: string) => string
  translateTo: (target: string) => string
  translateToAll: string
  translateEmptyFields: string
  bulkActionsLabel: string
  fillEmpty: string
  updateOutdated: string
  cannotTranslateEmptySource: string
  translatingProgress: string
  sourceChangedBanner: string
  translationTools: string
  poweredBy: string
  statusAuto: string
  statusManual: string
  statusEdited: string
  statusOutdated: string
  statusError: string
  tooltipAuto: string
  tooltipManual: string
  tooltipEdited: string
  tooltipOutdated: string
  tooltipError: string
}
const TOOLBAR_LABELS: Record<UiLocale, ToolbarLabels> = {
  ru: {
    pickSourceLocale: 'Выберите язык источника',
    source: locale => `Источник: ${locale}`,
    sourceArrow: (source, target) => `${source} → ${target}`,
    translateTo: target => `Перевести на ${target}`,
    translateToAll: 'Перевести на все языки',
    translateEmptyFields: 'Перевести пустые поля',
    bulkActionsLabel: 'Действия',
    fillEmpty: 'Заполнить пустые',
    updateOutdated: 'Обновить устаревшие',
    cannotTranslateEmptySource: 'Введите текст в источнике, чтобы перевести',
    translatingProgress: 'Перевод…',
    sourceChangedBanner: 'Источник изменён — перевод устарел.',
    translationTools: 'Перевести через Tilmoch',
    poweredBy: 'Перевод от Tilmoch',
    statusAuto: 'Авто',
    statusManual: 'Ручной',
    statusEdited: 'Изменён',
    statusOutdated: 'Устарел',
    statusError: 'Ошибка',
    tooltipAuto: 'Авто-перевод',
    tooltipManual: 'Введено вручную',
    tooltipEdited: 'Изменено вручную после авто-перевода',
    tooltipOutdated: 'Источник изменён — перевод устарел',
    tooltipError: 'Ошибка перевода',
  },
  uz: {
    pickSourceLocale: 'Manba tilini tanlang',
    source: locale => `Manba: ${locale}`,
    sourceArrow: (source, target) => `${source} → ${target}`,
    translateTo: target => `${target} tiliga tarjima qilish`,
    translateToAll: 'Barcha tillarga tarjima qilish',
    translateEmptyFields: "Bo'sh maydonlarni tarjima qilish",
    bulkActionsLabel: 'Amallar',
    fillEmpty: "Bo'sh maydonlarni to'ldirish",
    updateOutdated: 'Eskirganlarni yangilash',
    cannotTranslateEmptySource: 'Tarjima qilish uchun manbada matn kiriting',
    translatingProgress: 'Tarjima qilinmoqda…',
    sourceChangedBanner: "Manba o'zgardi — tarjima eskirgan.",
    translationTools: 'Tilmoch orqali tarjima qilish',
    poweredBy: 'Tilmoch tarjimasi',
    statusAuto: 'Avto',
    statusManual: "Qo'lda",
    statusEdited: 'Tahrirlangan',
    statusOutdated: 'Eskirgan',
    statusError: 'Xato',
    tooltipAuto: 'Avtotarjima',
    tooltipManual: "Qo'lda kiritilgan",
    tooltipEdited: "Avtotarjimadan keyin qo'lda tahrirlangan",
    tooltipOutdated: "Manba o'zgardi — tarjima eskirgan",
    tooltipError: 'Tarjima xatosi',
  },
  en: {
    pickSourceLocale: 'Choose source language',
    source: locale => `Source: ${locale}`,
    sourceArrow: (source, target) => `${source} → ${target}`,
    translateTo: target => `Translate to ${target}`,
    translateToAll: 'Translate to all languages',
    translateEmptyFields: 'Translate empty fields',
    bulkActionsLabel: 'Actions',
    fillEmpty: 'Fill empty',
    updateOutdated: 'Update outdated',
    cannotTranslateEmptySource: 'Add text in the source to translate',
    translatingProgress: 'Translating…',
    sourceChangedBanner: 'Source changed — translation is outdated.',
    translationTools: 'Translate with Tilmoch',
    poweredBy: 'Translated by Tilmoch',
    statusAuto: 'Auto',
    statusManual: 'Manual',
    statusEdited: 'Edited',
    statusOutdated: 'Stale',
    statusError: 'Error',
    tooltipAuto: 'Auto-translated',
    tooltipManual: 'Entered manually',
    tooltipEdited: 'Edited manually after auto-translation',
    tooltipOutdated: 'Source changed — translation is outdated',
    tooltipError: 'Translation error',
  },
}
function isUiLocale(value: string): value is UiLocale {
  return value === 'ru' || value === 'uz' || value === 'en'
}
export function useToolbarLabels(): ToolbarLabels {
  const locale = useLocale()
  return TOOLBAR_LABELS[isUiLocale(locale) ? locale : 'ru']
}

export type BusinessTranslationFieldConfig = {
  key: string
  label: string
  placeholder?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
}

const LOCALE_LABELS: Record<AppLocale, string> = {
  ru: 'Русский',
  uz: 'O‘zbekcha',
  en: 'English',
}

const LOCALE_ORDER: readonly AppLocale[] = ['ru', 'uz', 'en']

function getBusinessLocaleLabel(locale: AppLocale): string {
  return LOCALE_LABELS[locale]
}

type StatusVisual = {
  label: string
  tooltip: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'secondary' | 'destructive' | 'warning' | 'outline'
  dotClass: string
}

function useStatusVisual(status: TranslationStatus | undefined): StatusVisual | null {
  const labels = useToolbarLabels()
  if (!status || status === 'empty') return null

  switch (status) {
    case 'auto_translated':
      return {
        label: labels.statusAuto,
        tooltip: labels.tooltipAuto,
        icon: Sparkles,
        variant: 'secondary',
        dotClass: 'bg-info',
      }
    case 'manual':
      return {
        label: labels.statusManual,
        tooltip: labels.tooltipManual,
        icon: PencilLine,
        variant: 'outline',
        dotClass: 'bg-muted-foreground',
      }
    case 'edited_after_translation':
      return {
        label: labels.statusEdited,
        tooltip: labels.tooltipEdited,
        icon: PencilLine,
        variant: 'outline',
        dotClass: 'bg-info',
      }
    case 'outdated':
      return {
        label: labels.statusOutdated,
        tooltip: labels.tooltipOutdated,
        icon: AlertTriangle,
        variant: 'warning',
        dotClass: 'bg-warning',
      }
    case 'translation_error':
      return {
        label: labels.statusError,
        tooltip: labels.tooltipError,
        icon: XCircle,
        variant: 'destructive',
        dotClass: 'bg-destructive',
      }
  }
}

export function TranslationStatusBadge({ status }: { status?: TranslationStatus }) {
  const visual = useStatusVisual(status)
  if (!visual) return null
  const Icon = visual.icon

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={visual.variant}
            role="status"
            aria-label={visual.tooltip}
            className="gap-1 rounded-full px-2 py-0 text-[11px] font-medium"
          >
            <Icon className="size-3" aria-hidden="true" />
            <span>{visual.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {visual.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type TranslateFieldsToolbarProps = {
  sourceLocale: AppLocale | null
  isPending: boolean
  disabled?: boolean
  onTranslateEmpty: () => void
  onUpdateAuto: () => void
  /** Active target locale (the tab user is currently looking at). Optional for backward compat. */
  activeLocale?: AppLocale
  /** Hide toolbar entirely when active === source. Defaults to false (always visible). */
  hideOnSource?: boolean
}

export function TranslateFieldsToolbar({
  sourceLocale,
  isPending,
  disabled,
  onTranslateEmpty,
  onUpdateAuto,
  activeLocale,
  hideOnSource = false,
}: TranslateFieldsToolbarProps) {
  const labels = useToolbarLabels()
  const targetLocale =
    activeLocale && activeLocale !== sourceLocale ? activeLocale : null
  const onSourceTab = Boolean(activeLocale && sourceLocale && activeLocale === sourceLocale)

  if (hideOnSource && onSourceTab) {
    return null
  }

  const primaryDisabled = disabled || isPending || !sourceLocale
  // On a target tab → focused single-target action ("Перевести на O'zbekcha").
  // On the source tab → bulk fill across all empty target locales
  // ("Перевести на все языки"). Same handler (`onTranslateEmpty`); only the
  // copy adapts so the action stays present and predictable on every tab.
  const primaryLabel = targetLocale
    ? labels.translateTo(getBusinessLocaleLabel(targetLocale))
    : labels.translateToAll
  const tooltipMessage = !sourceLocale
    ? labels.cannotTranslateEmptySource
    : isPending
      ? labels.translatingProgress
      : labels.poweredBy

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="region"
        aria-label={labels.translationTools}
        className="flex items-center gap-1"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper allows tooltip to render even when button is disabled */}
            <span className="inline-flex">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onTranslateEmpty}
                disabled={primaryDisabled}
                className={cn(
                  'h-9 gap-2 rounded-full px-3 font-medium',
                  'border-success/40 bg-success-soft text-success-soft-foreground',
                  'hover:bg-success-soft/80',
                  'disabled:opacity-60'
                )}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <img
                    src="/tilmoch-icon.svg"
                    alt=""
                    aria-hidden="true"
                    className="size-4 rounded-sm"
                  />
                )}
                <span>{primaryLabel}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipMessage}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={primaryDisabled}
              aria-label={labels.bulkActionsLabel}
              className={cn(
                'h-9 w-7 rounded-full p-0 text-success-soft-foreground/80 hover:bg-success-soft'
              )}
            >
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={onTranslateEmpty} disabled={primaryDisabled}>
              <WandSparkles className="size-4" aria-hidden="true" />
              {labels.fillEmpty}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUpdateAuto} disabled={primaryDisabled}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {labels.updateOutdated}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

type LocaleStats = {
  filled: number
  total: number
  hasOutdated: boolean
  hasError: boolean
  hasAuto: boolean
}

function computeLocaleStats(
  locale: AppLocale,
  fields: readonly BusinessTranslationFieldConfig[],
  values: TranslationValues,
  meta: TranslationMeta
): LocaleStats {
  let filled = 0
  let hasOutdated = false
  let hasError = false
  let hasAuto = false

  for (const field of fields) {
    const value = values[field.key]?.[locale]?.trim() ?? ''
    if (value.length > 0) filled += 1
    const status = meta[field.key]?.[locale]?.status
    if (status === 'outdated') hasOutdated = true
    if (status === 'translation_error') hasError = true
    if (status === 'auto_translated') hasAuto = true
  }

  return { filled, total: fields.length, hasOutdated, hasError, hasAuto }
}

function getTabDotClass(stats: LocaleStats, isSource: boolean): string {
  if (stats.hasError) return 'bg-destructive'
  if (stats.hasOutdated) return 'bg-warning'
  if (isSource) return 'bg-success'
  if (stats.filled === 0) return 'bg-muted-foreground/40'
  if (stats.filled < stats.total) return 'bg-info'
  if (stats.hasAuto) return 'bg-info'
  return 'bg-success'
}

export function MultilingualTabsField({
  fields,
  values,
  meta,
  activeLocale,
  onLocaleChange,
  onValueChange,
  sourceLocale: sourceLocaleProp,
}: {
  fields: readonly BusinessTranslationFieldConfig[]
  values: TranslationValues
  meta: TranslationMeta
  activeLocale: AppLocale
  onLocaleChange: (locale: AppLocale) => void
  onValueChange: (fieldKey: string, locale: AppLocale, value: string) => void
  /** Optional explicit source locale; falls back to first non-empty locale. */
  sourceLocale?: AppLocale | null
}) {
  const labels = useToolbarLabels()

  const inferredSource = React.useMemo<AppLocale | null>(() => {
    if (sourceLocaleProp) return sourceLocaleProp
    for (const locale of LOCALE_ORDER) {
      if (fields.some(f => values[f.key]?.[locale]?.trim().length)) return locale
    }
    return null
  }, [sourceLocaleProp, fields, values])

  const stats = React.useMemo(() => {
    return LOCALE_ORDER.reduce<Record<AppLocale, LocaleStats>>((acc, locale) => {
      acc[locale] = computeLocaleStats(locale, fields, values, meta)
      return acc
    }, {} as Record<AppLocale, LocaleStats>)
  }, [fields, values, meta])

  return (
    <Tabs value={activeLocale} onValueChange={value => onLocaleChange(value as AppLocale)}>
      <TabsList className="grid w-full grid-cols-3">
        {LOCALE_ORDER.map(locale => {
          const localeStats = stats[locale]
          const isSource = locale === inferredSource
          const dotClass = getTabDotClass(localeStats, isSource)
          return (
            <TabsTrigger
              key={locale}
              value={locale}
              aria-label={`${LOCALE_LABELS[locale]} ${localeStats.filled}/${localeStats.total}${
                isSource ? ' *' : ''
              }`}
              className="min-w-0 gap-1.5"
            >
              <span
                aria-hidden="true"
                className={cn('inline-block size-1.5 shrink-0 rounded-full', dotClass)}
              />
              <span className="min-w-0 truncate">{LOCALE_LABELS[locale]}</span>
              <span className="ml-auto shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                {localeStats.filled}/{localeStats.total}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {LOCALE_ORDER.map(locale => {
        const appLocale = locale
        const localeStats = stats[locale]
        const isSource = locale === inferredSource
        const showOutdatedBanner = localeStats.hasOutdated && !isSource

        return (
          <TabsContent key={locale} value={locale} className="space-y-3">
            {showOutdatedBanner && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground"
              >
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                <span>{labels.sourceChangedBanner}</span>
              </div>
            )}

            {fields.map(field => {
              const id = `${field.key}-${locale}`
              const status = meta[field.key]?.[appLocale]?.status
              const value = values[field.key]?.[appLocale] ?? ''

              return (
                <div key={field.key} className="space-y-2">
                  <div className="flex min-h-5 flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    <TranslationStatusBadge status={status} />
                  </div>
                  {field.multiline ? (
                    <Textarea
                      id={id}
                      value={value}
                      onChange={event => onValueChange(field.key, appLocale, event.target.value)}
                      placeholder={field.placeholder}
                      rows={field.rows ?? 2}
                      maxLength={field.maxLength}
                      className={cn(
                        'resize-none',
                        status === 'outdated' && 'border border-warning',
                        status === 'auto_translated' && 'border border-info',
                        status === 'edited_after_translation' && 'border border-primary'
                      )}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={value}
                      onChange={event => onValueChange(field.key, appLocale, event.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      className={cn(
                        status === 'outdated' && 'border border-warning',
                        status === 'auto_translated' && 'border border-info',
                        status === 'edited_after_translation' && 'border border-primary'
                      )}
                    />
                  )}
                </div>
              )
            })}

          </TabsContent>
        )
      })}
    </Tabs>
  )
}
