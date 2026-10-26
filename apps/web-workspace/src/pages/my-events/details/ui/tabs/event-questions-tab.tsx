import { useMemo, useRef, useState, useEffect } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'
import {
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  MoreHorizontal,
  Pencil,
  HelpCircle,
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Asterisk,
  Award,
  MessageSquare,
  ToggleLeft,
  Info,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  FileUp,
  Upload,
  GraduationCap,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  Button,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import {
  useQuestionsQuery,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
} from '@features/events/api'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'

const QUESTION_TRANSLATION_FIELD_KEYS = [
  'question',
  'informationalText',
  'correctAnswer',
] as const
const QUESTION_BUSINESS_LOCALES: readonly AppLocale[] = ['ru', 'uz', 'en']
type LocaleOptionsMap = Partial<Record<AppLocale, string[]>>
import {
  QuestionType,
  QuestionCategory,
  registrationQuestionsService,
  type RegistrationQuestion,
  type CreateQuestionRequest,
} from '@api/services'
import type { ApiError } from '@api/types'

// ================================
// Types & Config
// ================================

type EventQuestionsTabProps = {
  eventId: string
}

const getQuestionTypeConfig = (t: ReturnType<typeof useT>) =>
  ({
    [QuestionType.TEXT]: {
      label: t('events.questions.typeConfig.text.label'),
      icon: Type,
      description: t('events.questions.typeConfig.text.description'),
    },
    [QuestionType.TEXTAREA]: {
      label: t('events.questions.typeConfig.textarea.label'),
      icon: AlignLeft,
      description: t('events.questions.typeConfig.textarea.description'),
    },
    [QuestionType.NUMBER]: {
      label: t('events.questions.typeConfig.number.label'),
      icon: Hash,
      description: t('events.questions.typeConfig.number.description'),
    },
    [QuestionType.SELECT]: {
      label: t('events.questions.typeConfig.select.label'),
      icon: List,
      description: t('events.questions.typeConfig.select.description'),
    },
    [QuestionType.CHECKBOX]: {
      label: t('events.questions.typeConfig.checkbox.label'),
      icon: CheckSquare,
      description: t('events.questions.typeConfig.checkbox.description'),
    },
    [QuestionType.FILE_UPLOAD]: {
      label: t('events.questions.typeConfig.fileUpload.label'),
      icon: FileUp,
      description: t('events.questions.typeConfig.fileUpload.description'),
    },
  }) satisfies Record<
    QuestionType,
    { label: string; icon: React.ElementType; description: string }
  >

// Доступные расширения файлов (зеркало backend whitelist).
const FILE_UPLOAD_ALLOWED_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
] as const

const FILE_UPLOAD_SIZE_OPTIONS = [1, 5, 10, 20] as const

const DEFAULT_FILE_UPLOAD_CONFIG = {
  description: '',
  template: null as { url: string; name: string; size: number; mimeType: string } | null,
  maxFileSizeMb: 10,
  allowedFileTypes: [...FILE_UPLOAD_ALLOWED_TYPES] as string[],
  allowMultipleFiles: false,
  maxFiles: 1,
}

const getQuestionCategoryConfig = (t: ReturnType<typeof useT>) =>
  ({
    [QuestionCategory.OPEN]: {
      label: t('events.questions.categoryConfig.open.label'),
      icon: MessageSquare,
      description: t('events.questions.categoryConfig.open.description'),
      color: 'text-info-soft-foreground bg-info-soft border-info-soft',
    },
    [QuestionCategory.CLOSED]: {
      label: t('events.questions.categoryConfig.closed.label'),
      icon: ToggleLeft,
      description: t('events.questions.categoryConfig.closed.description'),
      color: 'text-success-soft-foreground bg-success-soft border-success-soft',
    },
    [QuestionCategory.ALTERNATIVE]: {
      label: t('events.questions.categoryConfig.alternative.label'),
      icon: List,
      description: t('events.questions.categoryConfig.alternative.description'),
      color: 'text-brand-soft-foreground bg-brand-soft border-brand-soft',
    },
    [QuestionCategory.RHETORICAL]: {
      label: t('events.questions.categoryConfig.rhetorical.label'),
      icon: Info,
      description: t('events.questions.categoryConfig.rhetorical.description'),
      color: 'text-warning-soft-foreground bg-warning-soft border-warning-soft',
    },
  }) satisfies Record<
    QuestionCategory,
    { label: string; icon: React.ElementType; description: string; color: string }
  >

// ================================
// Schema
// ================================

const createQuestionSchema = (t: ReturnType<typeof useT>) =>
  z
    .object({
      mode: z.enum(['info', 'test']),
      question: z.string().min(3, t('events.validation.min3')).max(500, t('events.validation.max500')),
      type: z.nativeEnum(QuestionType),
      category: z.nativeEnum(QuestionCategory),
      isRequired: z.boolean(),
      options: z.array(z.string()).optional(),
      points: z.coerce.number().min(0).max(100).optional(),
      correctAnswer: z.string().optional(),
      correctOptions: z.array(z.string()).optional(),
      informationalText: z.string().optional(),
      fileUpload: z
        .object({
          description: z.string().optional(),
          template: z
            .object({
              url: z.string(),
              name: z.string(),
              size: z.number(),
              mimeType: z.string(),
            })
            .nullable()
            .optional(),
          maxFileSizeMb: z.number(),
          allowedFileTypes: z.array(z.string()),
          allowMultipleFiles: z.boolean(),
          maxFiles: z.number(),
        })
        .optional(),
    })
    .refine(
      data => {
        if (data.category === QuestionCategory.ALTERNATIVE) {
          return data.type === QuestionType.SELECT || data.type === QuestionType.CHECKBOX
        }
        return true
      },
      {
        message: t('events.questions.validation.alternativeType'),
        path: ['type'],
      }
    )
    .refine(
      data => {
        if (data.category === QuestionCategory.ALTERNATIVE) {
          return data.options && data.options.length >= 2
        }
        return true
      },
      {
        message: t('events.questions.validation.optionsMin2'),
        path: ['options'],
      }
    )

type QuestionFormValues = z.infer<ReturnType<typeof createQuestionSchema>>

// ================================
// Options Input Component
// ================================

function OptionsInput({
  options,
  onChange,
  correctOptions,
  onCorrectChange,
  showCorrect,
}: {
  options: string[]
  onChange: (options: string[]) => void
  correctOptions?: string[]
  onCorrectChange?: (options: string[]) => void
  showCorrect?: boolean
}) {
  const t = useT()
  const [newOption, setNewOption] = useState('')

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onChange([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    const removed = options[index]
    onChange(options.filter((_, i) => i !== index))
    if (correctOptions && onCorrectChange) {
      onCorrectChange(correctOptions.filter(o => o !== removed))
    }
  }

  const toggleCorrect = (option: string) => {
    if (!onCorrectChange || !correctOptions) return
    if (correctOptions.includes(option)) {
      onCorrectChange(correctOptions.filter(o => o !== option))
    } else {
      onCorrectChange([...correctOptions, option])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newOption}
          onChange={e => setNewOption(e.target.value)}
          placeholder={t('events.questions.dialog.optionPlaceholder')}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addOption()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addOption} disabled={!newOption.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((option, index) => {
            const isCorrect = correctOptions?.includes(option)
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-2 transition-colors',
                  showCorrect && isCorrect && 'border-success-soft bg-success-soft'
                )}
              >
                {showCorrect && (
                  <Checkbox
                    checked={isCorrect}
                    onCheckedChange={() => toggleCorrect(option)}
                    className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                  />
                )}
                <span className="flex-1 text-sm">{option}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('actions.delete')}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
          {showCorrect && (
            <p className="text-xs text-muted-foreground">
              <CheckCircle2 className="inline h-3 w-3 mr-1 text-success" />
              {t('events.questions.dialog.autoCheckHint')}
            </p>
          )}
        </div>
      )}

      {options.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          {t('events.questions.validation.optionsMin2')}
        </p>
      )}
    </div>
  )
}

// ================================
// Question Dialog (Multi-step Wizard)
// ================================

// ================================
// File Upload Settings (type=FILE_UPLOAD)
// ================================

function FileUploadSettings({
  form,
  eventId,
}: {
  form: UseFormReturn<QuestionFormValues>
  eventId: string
}) {
  const t = useT()
  const watched = useWatch({ control: form.control, name: 'fileUpload' })
  const config = watched ?? DEFAULT_FILE_UPLOAD_CONFIG
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const templateInputRef = useRef<HTMLInputElement | null>(null)

  const update = (patch: Partial<typeof DEFAULT_FILE_UPLOAD_CONFIG>) => {
    form.setValue(
      'fileUpload',
      { ...DEFAULT_FILE_UPLOAD_CONFIG, ...config, ...patch },
      { shouldValidate: true },
    )
  }

  const toggleType = (ext: string) => {
    const set = new Set(config.allowedFileTypes)
    if (set.has(ext)) set.delete(ext)
    else set.add(ext)
    update({ allowedFileTypes: Array.from(set) })
  }

  const handleTemplateUpload = async (file?: File) => {
    if (!file) return
    setUploadingTemplate(true)
    try {
      const result = await registrationQuestionsService.uploadTemplate(eventId, file)
      update({ template: result })
    } catch (e) {
      toast.error(
        (e as ApiError)?.message ?? t('events.questions.fileUpload.templateUploadError'),
      )
    } finally {
      setUploadingTemplate(false)
      if (templateInputRef.current) templateInputRef.current.value = ''
    }
  }

  const handleTemplateRemove = async () => {
    const url = config.template?.url
    update({ template: null })
    if (url) {
      try {
        await registrationQuestionsService.deleteTemplate(eventId, url)
      } catch {
        // best-effort cleanup
      }
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      {/* Description / instruction */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('events.questions.fileUpload.descriptionLabel')}
        </label>
        <Textarea
          value={config.description ?? ''}
          onChange={e => update({ description: e.target.value })}
          placeholder={t('events.questions.fileUpload.descriptionPlaceholder')}
          className="min-h-20 resize-none"
        />
      </div>

      {/* Template */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('events.questions.fileUpload.templateLabel')}
        </label>
        {config.template ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm text-foreground">
              {config.template.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleTemplateRemove()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingTemplate}
            onClick={() => templateInputRef.current?.click()}
            className="gap-2"
          >
            {uploadingTemplate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t('events.questions.fileUpload.uploadTemplate')}
          </Button>
        )}
        <input
          ref={templateInputRef}
          type="file"
          hidden
          accept={FILE_UPLOAD_ALLOWED_TYPES.join(',')}
          onChange={e => void handleTemplateUpload(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">
          {t('events.questions.fileUpload.templateHint')}
        </p>
      </div>

      {/* Max size */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('events.questions.fileUpload.maxSizeLabel')}
        </label>
        <Select
          value={String(config.maxFileSizeMb)}
          onValueChange={v => update({ maxFileSizeMb: Number(v) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_UPLOAD_SIZE_OPTIONS.map(mb => (
              <SelectItem key={mb} value={String(mb)}>
                {mb} MB
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Allowed types */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('events.questions.fileUpload.allowedTypesLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {FILE_UPLOAD_ALLOWED_TYPES.map(ext => {
            const active = config.allowedFileTypes.includes(ext)
            return (
              <button
                key={ext}
                type="button"
                onClick={() => toggleType(ext)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                {ext}
              </button>
            )
          })}
        </div>
      </div>

      {/* Multiple files */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Checkbox
          checked={config.allowMultipleFiles}
          onCheckedChange={checked =>
            update({
              allowMultipleFiles: checked === true,
              maxFiles: checked === true ? Math.max(2, config.maxFiles) : 1,
            })
          }
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {t('events.questions.fileUpload.allowMultipleLabel')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('events.questions.fileUpload.allowMultipleHint')}
          </p>
        </div>
      </div>

      {/* Max files */}
      {config.allowMultipleFiles && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('events.questions.fileUpload.maxFilesLabel')}
          </label>
          <Input
            type="number"
            min={2}
            max={10}
            value={config.maxFiles}
            onChange={e => {
              const n = Number(e.target.value)
              update({ maxFiles: Number.isFinite(n) ? Math.min(10, Math.max(2, n)) : 2 })
            }}
            className="w-32"
          />
        </div>
      )}
    </div>
  )
}

function QuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editingQuestion,
  eventId,
  mode: fixedMode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: QuestionFormValues) => void
  isPending: boolean
  editingQuestion?: RegistrationQuestion | null
  eventId: string
  mode: 'info' | 'test'
}) {
  const t = useT()
  const [step, setStep] = useState(1)
  // Если режим info - 1 шаг, если test - 2 шага
  const totalSteps = fixedMode === 'test' ? 2 : 1

  const QUESTION_TYPE_CONFIG = getQuestionTypeConfig(t)
  const QUESTION_CATEGORY_CONFIG = getQuestionCategoryConfig(t)
  const translateBatch = useTranslateBatch()
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(createQuestionSchema(t)) as any,
    defaultValues: {
      mode: fixedMode,
      question: '',
      type: QuestionType.TEXT,
      category: QuestionCategory.OPEN,
      isRequired: false,
      options: [],
      points: fixedMode === 'test' ? 10 : 0,
      correctAnswer: '',
      correctOptions: [],
      informationalText: '',
    },
  })

  // === Локализация question/informationalText/correctAnswer/options ===
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(QUESTION_TRANSLATION_FIELD_KEYS, undefined, {
      question: '',
      informationalText: '',
      correctAnswer: '',
    }),
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(QUESTION_TRANSLATION_FIELD_KEYS, undefined, translationValues),
  )
  const [optionsTranslations, setOptionsTranslations] = useState<LocaleOptionsMap>({})

  // Reset form when dialog opens/closes or editingQuestion changes
  useEffect(() => {
    if (open) {
      if (editingQuestion) {
        const initialValues = createBusinessTranslationValues(
          QUESTION_TRANSLATION_FIELD_KEYS,
          editingQuestion.translations ?? undefined,
          {
            question: editingQuestion.question,
            informationalText: editingQuestion.informationalText ?? '',
            correctAnswer: editingQuestion.correctAnswer ?? '',
          },
        )
        setTranslationValues(initialValues)
        setTranslationMeta(
          createBusinessTranslationMeta(
            QUESTION_TRANSLATION_FIELD_KEYS,
            editingQuestion.translationMeta ?? undefined,
            initialValues,
          ),
        )
        setOptionsTranslations(
          (editingQuestion.optionsTranslations ?? {}) as LocaleOptionsMap,
        )
        form.reset({
          mode: fixedMode,
          question: editingQuestion.question,
          type: editingQuestion.type,
          category: editingQuestion.category,
          isRequired: editingQuestion.isRequired,
          options: editingQuestion.options || [],
          points: editingQuestion.points || (fixedMode === 'test' ? 10 : 0),
          correctAnswer: editingQuestion.correctAnswer || '',
          correctOptions: editingQuestion.correctOptions || [],
          informationalText: editingQuestion.informationalText || '',
          fileUpload:
            editingQuestion.type === QuestionType.FILE_UPLOAD
              ? {
                  description: editingQuestion.fileUploadConfig?.description ?? '',
                  template: editingQuestion.fileUploadConfig?.template ?? null,
                  maxFileSizeMb:
                    editingQuestion.fileUploadConfig?.maxFileSizeMb ??
                    DEFAULT_FILE_UPLOAD_CONFIG.maxFileSizeMb,
                  allowedFileTypes:
                    editingQuestion.fileUploadConfig?.allowedFileTypes ??
                    DEFAULT_FILE_UPLOAD_CONFIG.allowedFileTypes,
                  allowMultipleFiles:
                    editingQuestion.fileUploadConfig?.allowMultipleFiles ?? false,
                  maxFiles:
                    editingQuestion.fileUploadConfig?.maxFiles ??
                    DEFAULT_FILE_UPLOAD_CONFIG.maxFiles,
                }
              : undefined,
        })
      } else {
        const freshValues = createBusinessTranslationValues(
          QUESTION_TRANSLATION_FIELD_KEYS,
          undefined,
          { question: '', informationalText: '', correctAnswer: '' },
        )
        setTranslationValues(freshValues)
        setTranslationMeta(
          createBusinessTranslationMeta(
            QUESTION_TRANSLATION_FIELD_KEYS,
            undefined,
            freshValues,
          ),
        )
        setOptionsTranslations({})
        form.reset({
          mode: fixedMode,
          question: '',
          type: QuestionType.TEXT,
          category: QuestionCategory.OPEN,
          isRequired: false,
          options: [],
          points: fixedMode === 'test' ? 10 : 0,
          correctAnswer: '',
          correctOptions: [],
          informationalText: '',
        })
      }
      setActiveLocale('ru')
      setStep(1) // Всегда начинаем с шага 1
    }
  }, [open, editingQuestion, fixedMode, form])

  /**
   * При переключении локали-таба: snapshot текущих form-значений в translations,
   * затем загружаем значения целевой локали обратно в form.
   */
  const handleLocaleChange = (newLocale: AppLocale) => {
    if (newLocale === activeLocale) return
    const current = form.getValues()
    setTranslationValues(prev => ({
      ...prev,
      question: { ...prev.question, [activeLocale]: current.question ?? '' },
      informationalText: {
        ...prev.informationalText,
        [activeLocale]: current.informationalText ?? '',
      },
      correctAnswer: {
        ...prev.correctAnswer,
        [activeLocale]: current.correctAnswer ?? '',
      },
    } as TranslationValues))
    setOptionsTranslations(prev => ({
      ...prev,
      [activeLocale]: current.options ?? [],
    }))

    const next = translationValues
    form.setValue('question', next.question?.[newLocale] ?? '', { shouldValidate: true })
    form.setValue('informationalText', next.informationalText?.[newLocale] ?? '')
    form.setValue('correctAnswer', next.correctAnswer?.[newLocale] ?? '')
    form.setValue('options', optionsTranslations[newLocale] ?? [])
    setActiveLocale(newLocale)
  }

  /**
   * Snapshot текущего form state в translations для submit/auto-translate.
   * Возвращает свежие копии values + optionsMap.
   */
  const snapshotIntoTranslations = (): {
    values: TranslationValues
    optionsMap: LocaleOptionsMap
  } => {
    const current = form.getValues()
    const snap = setBusinessTranslationValue(
      setBusinessTranslationValue(
        setBusinessTranslationValue(
          translationValues,
          translationMeta,
          'question',
          activeLocale,
          current.question ?? '',
        ).values as TranslationValues,
        translationMeta,
        'informationalText',
        activeLocale,
        current.informationalText ?? '',
      ).values as TranslationValues,
      translationMeta,
      'correctAnswer',
      activeLocale,
      current.correctAnswer ?? '',
    ).values as TranslationValues
    const optionsMap: LocaleOptionsMap = {
      ...optionsTranslations,
      [activeLocale]: current.options ?? [],
    }
    return { values: snap, optionsMap }
  }

  const sourceLocaleForTranslate = useMemo(() => {
    const { values } = snapshotIntoTranslations()
    return resolveBusinessSourceLocale(
      values,
      QUESTION_TRANSLATION_FIELD_KEYS,
      activeLocale,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale, translationValues])

  const handleAutoTranslate = (mode: TranslationApplyMode) => {
    const { values: snapshot, optionsMap } = snapshotIntoTranslations()
    const sourceLocale = resolveBusinessSourceLocale(
      snapshot,
      QUESTION_TRANSLATION_FIELD_KEYS,
      activeLocale,
    )
    if (!sourceLocale) {
      toast.error(t('common.translations.addTextBeforeTranslating'))
      return
    }
    const targetLocales = QUESTION_BUSINESS_LOCALES.filter(l => l !== sourceLocale)
    const items = getBatchTranslationItems(
      snapshot,
      translationMeta,
      QUESTION_TRANSLATION_FIELD_KEYS,
      sourceLocale,
      mode,
    )
    // Варианты ответа — отдельный массив (optionsTranslations), не попадает в
    // QUESTION_TRANSLATION_FIELD_KEYS, поэтому переводим его явно: каждая опция
    // — отдельный item с синтетическим fieldKey `option:<index>`.
    const OPTION_PREFIX = 'option:'
    const sourceOptions = optionsMap[sourceLocale] ?? []
    const optionItems = sourceOptions
      .map((text, index) => ({
        fieldKey: `${OPTION_PREFIX}${index}`,
        text: (text ?? '').trim(),
        contentType: 'plain_text' as const,
      }))
      .filter(it => it.text.length > 0)

    if (items.length === 0 && optionItems.length === 0) {
      toast.info(t('common.translations.noEligibleFields'))
      return
    }
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales,
        items: [...items, ...optionItems],
      },
      {
        onSuccess: response => {
          const scalarResults = response.results.filter(
            r => !r.fieldKey.startsWith(OPTION_PREFIX),
          )
          const applied = applyBatchTranslationResults(
            snapshot,
            translationMeta,
            { ...response, results: scalarResults },
            { mode },
          )
          const summary = summarizeAppliedBatch(
            snapshot,
            translationMeta,
            { ...response, results: scalarResults },
            mode,
          )
          setTranslationValues(applied.values)
          setTranslationMeta(applied.meta)
          // Обновляем form с переводами для активной локали (чтобы UI отразил их).
          form.setValue('question', applied.values.question?.[activeLocale] ?? '', {
            shouldValidate: true,
          })
          form.setValue(
            'informationalText',
            applied.values.informationalText?.[activeLocale] ?? '',
          )
          form.setValue('correctAnswer', applied.values.correctAnswer?.[activeLocale] ?? '')

          // Применяем переводы вариантов ответа в optionsTranslations.
          if (optionItems.length > 0) {
            const nextOptions: LocaleOptionsMap = { ...optionsMap }
            for (const target of targetLocales) {
              const existing = nextOptions[target] ?? []
              // fill_empty: не затираем уже заполненные локали (ручные правки).
              if (mode === 'fill_empty' && existing.length > 0) continue
              const translated = sourceOptions.map((src, index) => {
                const hit = response.results.find(
                  r =>
                    r.fieldKey === `${OPTION_PREFIX}${index}` &&
                    r.targetLocale === target &&
                    r.status === 'auto_translated' &&
                    r.translatedText,
                )
                return hit?.translatedText ?? existing[index] ?? src ?? ''
              })
              nextOptions[target] = translated
            }
            setOptionsTranslations(nextOptions)
            const activeOptions = nextOptions[activeLocale]
            if (activeOptions) {
              form.setValue('options', activeOptions, { shouldValidate: true })
            }
          }

          toast.success(t('common.translations.translatedSummary', summary))
        },
        onError: error => {
          toast.error(error?.message ?? t('common.translations.serviceFailed'))
        },
      },
    )
  }

  // Используем useWatch для надёжного отслеживания изменений
  const category = useWatch({ control: form.control, name: 'category' })
  const watchedType = useWatch({ control: form.control, name: 'type' })
  const isFileUpload = watchedType === QuestionType.FILE_UPLOAD
  const options = useWatch({ control: form.control, name: 'options' }) || []
  const correctOptions = useWatch({ control: form.control, name: 'correctOptions' }) || []

  // Auto-set type based on category (backup for useEffect)
  useEffect(() => {
    // FILE_UPLOAD сохраняет category=OPEN, но не является текстовым типом —
    // не сбрасываем его на TEXT.
    if (watchedType === QuestionType.FILE_UPLOAD) return
    if (category === QuestionCategory.CLOSED) {
      // CLOSED = "Да / Нет" = single-choice. Previously this stored as
      // CHECKBOX, which the public form interpreted as multi-select — so
      // an attendee could tick both Yes AND No on the same question. The
      // backend enum has no RADIO, so SELECT is the closest single-choice
      // type. The public form additionally treats category === CLOSED as
      // radio regardless of type, which self-heals old records still on
      // CHECKBOX after deploy.
      form.setValue('type', QuestionType.SELECT)
      form.setValue('options', [t('common.yes'), t('common.no')])
    } else if (category === QuestionCategory.ALTERNATIVE) {
      const currentType = form.getValues('type')
      // Если тип не SELECT и не CHECKBOX, устанавливаем SELECT по умолчанию
      if (currentType !== QuestionType.SELECT && currentType !== QuestionType.CHECKBOX) {
        form.setValue('type', QuestionType.SELECT)
      }
    } else if (category === QuestionCategory.OPEN) {
      const currentType = form.getValues('type')
      // Если тип не подходит для OPEN, устанавливаем TEXT
      if (
        currentType !== QuestionType.TEXT &&
        currentType !== QuestionType.TEXTAREA &&
        currentType !== QuestionType.NUMBER
      ) {
        form.setValue('type', QuestionType.TEXT)
      }
    } else if (category === QuestionCategory.RHETORICAL) {
      form.setValue('type', QuestionType.TEXT)
    }
  }, [category, watchedType, form, t])

  const handleSubmit = (data: QuestionFormValues) => {
    // Snapshot текущей локали в translations + optionsTranslations, выбираем
    // scalar fallback (первая непустая локаль ru → uz → en) для legacy полей.
    const { values: snapshot, optionsMap } = snapshotIntoTranslations()
    const pickPrimary = (fieldKey: string): string => {
      const v = snapshot[fieldKey]
      return (v?.ru?.trim() || v?.uz?.trim() || v?.en?.trim() || '').trim()
    }
    const pickPrimaryOptions = (): string[] => {
      for (const loc of QUESTION_BUSINESS_LOCALES) {
        const arr = optionsMap[loc]
        if (Array.isArray(arr) && arr.length > 0) return arr
      }
      return data.options ?? []
    }
    const scalarQuestion = pickPrimary('question') || data.question
    const scalarInfo = pickPrimary('informationalText') || (data.informationalText ?? '')
    const scalarCorrect = pickPrimary('correctAnswer') || (data.correctAnswer ?? '')
    const scalarOptions = data.options && data.options.length > 0 ? data.options : pickPrimaryOptions()

    const cleanedOptionsTranslations: LocaleOptionsMap = {}
    for (const loc of QUESTION_BUSINESS_LOCALES) {
      const arr = optionsMap[loc]
      if (Array.isArray(arr) && arr.length > 0) {
        cleanedOptionsTranslations[loc] = arr.filter(s => typeof s === 'string' && s.trim().length > 0)
      }
    }

    onSubmit({
      ...data,
      question: scalarQuestion,
      informationalText: scalarInfo || undefined,
      correctAnswer: scalarCorrect || undefined,
      options: scalarOptions,
      // Дополнительные поля для API; QuestionFormValues не объявляет их, но
      // handleAddQuestion / handleUpdateQuestion на parent forward'ят весь payload.
      translations: snapshot as never,
      translationMeta: translationMeta as never,
      optionsTranslations: cleanedOptionsTranslations as never,
    } as QuestionFormValues)
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const canProceed = () => {
    if (step === 1) {
      // Шаг 1: основной контент вопроса
      const q = form.getValues('question')
      if (!q || q.length < 3) return false
      if (category === QuestionCategory.ALTERNATIVE && options.length < 2) return false
      if (category === QuestionCategory.RHETORICAL) {
        const info = form.getValues('informationalText')
        if (!info || info.length < 3) return false
      }
      return true
    }
    return true // Шаг 2: настройки теста (всегда можно продолжить)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HelpCircle className="h-5 w-5" />
            </div>
            <span>
              {editingQuestion ? t('actions.edit') + ' ' + t('events.tabs.questions').toLowerCase() : t('events.questions.dialog.newTitle')}
            </span>
          </DialogTitle>
          <DialogDescription>
            {t('events.questions.dialog.stepLabel', { step, total: totalSteps })}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < step ? 'bg-foreground' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Locale tabs + Tilmoch — переключатель применяется ко всем
            мультиязычным полям в шаге 1 (question / informationalText /
            correctAnswer / options). Поля под капотом хранят значения для
            активной локали; на switch — снимок текущих form-значений
            сохраняется в translations, целевая локаль загружается в form. */}
        {step === 1 && (
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="grid grid-cols-3 gap-1">
              {QUESTION_BUSINESS_LOCALES.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleLocaleChange(loc)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition',
                    activeLocale === loc
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:bg-background/40',
                  )}
                >
                  {loc === 'ru' ? 'Русский' : loc === 'uz' ? "O'zbekcha" : 'English'}
                </button>
              ))}
            </div>
            <TranslateFieldsToolbar
              sourceLocale={sourceLocaleForTranslate}
              activeLocale={activeLocale}
              isPending={translateBatch.isPending}
              disabled={!sourceLocaleForTranslate}
              onTranslateEmpty={() => handleAutoTranslate('fill_empty')}
              onUpdateAuto={() => handleAutoTranslate('update_auto')}
            />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Question Content */}
            {step === 1 && (
              <div className="space-y-4" key={`step1-${category}`}>
                {/* Mode indicator */}
                <div
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    fixedMode === 'test'
                      ? 'bg-muted text-foreground'
                      : 'bg-info-soft text-info-soft-foreground'
                  )}
                >
                  {fixedMode === 'test' ? (
                    <>
                      <GraduationCap className="h-4 w-4" />
                      <span>{t('events.questions.dialog.testModeTitle')}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>{t('events.questions.dialog.infoModeTitle')}</span>
                    </>
                  )}
                </div>

                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.questions.dialog.categoryLabel')}</FormLabel>
                      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                        {Object.entries(QUESTION_CATEGORY_CONFIG).map(([cat, config]) => {
                          const Icon = config.icon
                          const isSelected = !isFileUpload && field.value === cat
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                field.onChange(cat)
                                // Немедленно устанавливаем правильный тип при выборе категории
                                if (cat === QuestionCategory.ALTERNATIVE) {
                                  form.setValue('type', QuestionType.SELECT, {
                                    shouldValidate: true,
                                  })
                                  form.setValue('options', [])
                                } else if (cat === QuestionCategory.CLOSED) {
                                  form.setValue('type', QuestionType.CHECKBOX, {
                                    shouldValidate: true,
                                  })
                                  form.setValue('options', [t('common.yes'), t('common.no')])
                                } else if (cat === QuestionCategory.OPEN) {
                                  form.setValue('type', QuestionType.TEXT, { shouldValidate: true })
                                  form.setValue('options', [])
                                } else if (cat === QuestionCategory.RHETORICAL) {
                                  form.setValue('type', QuestionType.TEXT, { shouldValidate: true })
                                  form.setValue('options', [])
                                }
                              }}
                              className={cn(
                                'flex items-center gap-2 rounded-lg border p-3 text-left transition',
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                  : 'border-border hover:border-primary/50'
                              )}
                            >
                              <div className={cn('rounded-lg p-1.5', config.color)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{config.label}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {config.description}
                                </div>
                              </div>
                            </button>
                          )
                        })}

                        {/* File upload format (UI-only card → type=FILE_UPLOAD, category=OPEN) */}
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(QuestionCategory.OPEN)
                            form.setValue('type', QuestionType.FILE_UPLOAD, {
                              shouldValidate: true,
                            })
                            form.setValue('options', [])
                            if (!form.getValues('fileUpload')) {
                              form.setValue('fileUpload', {
                                ...DEFAULT_FILE_UPLOAD_CONFIG,
                                allowedFileTypes: [
                                  ...DEFAULT_FILE_UPLOAD_CONFIG.allowedFileTypes,
                                ],
                              })
                            }
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-3 text-left transition',
                            isFileUpload
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          <div className="rounded-lg p-1.5 text-brand-soft-foreground bg-brand-soft border-brand-soft">
                            <FileUp className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {t('events.questions.typeConfig.fileUpload.label')}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {t('events.questions.typeConfig.fileUpload.description')}
                            </div>
                          </div>
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question Text */}
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                        {category === QuestionCategory.RHETORICAL
                          ? t('events.questions.dialog.titleLabel')
                          : t('events.questions.dialog.questionLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            category === QuestionCategory.RHETORICAL
                              ? t('events.questions.dialog.infoTitlePlaceholder')
                              : t('events.questions.dialog.questionPlaceholder')
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Informational Text for Rhetorical */}
                {category === QuestionCategory.RHETORICAL && (
                  <FormField
                    control={form.control}
                    name="informationalText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.infoTextLabel')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('events.questions.dialog.infoTextPlaceholder')}
                            className="min-h-24 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Info for Closed questions */}
                {category === QuestionCategory.CLOSED && (
                  <div className="rounded-lg bg-success-soft border border-success-soft p-3">
                    <div className="flex items-center gap-2 text-sm text-success-soft-foreground">
                      <ToggleLeft className="h-4 w-4" />
                      <span>
                        {t('events.questions.dialog.closedHintPrefix')}{' '}
                        <strong>{t('common.yes')}</strong> {t('events.questions.dialog.closedHintOr')}{' '}
                        <strong>{t('common.no')}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* File upload settings (type=FILE_UPLOAD) */}
                {isFileUpload && (
                  <FileUploadSettings form={form} eventId={eventId} />
                )}

                {/* Type Selection - условно в зависимости от категории */}
                {category === QuestionCategory.OPEN && !isFileUpload && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.answerFormatLabel')}</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {[QuestionType.TEXT, QuestionType.TEXTAREA, QuestionType.NUMBER].map(
                            type => {
                              const config = QUESTION_TYPE_CONFIG[type]
                              const Icon = config.icon
                              const isSelected = field.value === type
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => field.onChange(type)}
                                  className={cn(
                                    'flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition',
                                    isSelected
                                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                      : 'border-border hover:border-primary/50'
                                  )}
                                >
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-xs font-medium">{config.label}</span>
                                </button>
                              )
                            }
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {category === QuestionCategory.ALTERNATIVE && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.selectionLabel')}</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => field.onChange(QuestionType.SELECT)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition',
                              field.value === QuestionType.SELECT
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <List className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{t('events.questions.dialog.singleChoiceTitle')}</div>
                              <div className="text-xs text-muted-foreground">{t('events.questions.dialog.singleChoiceDescription')}</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => field.onChange(QuestionType.CHECKBOX)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition',
                              field.value === QuestionType.CHECKBOX
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <CheckSquare className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{t('events.questions.dialog.multiChoiceTitle')}</div>
                              <div className="text-xs text-muted-foreground">{t('events.questions.dialog.multiChoiceDescription')}</div>
                            </div>
                          </button>
                        </div>
                        {/* Не показываем техническую ошибку валидации */}
                      </FormItem>
                    )}
                  />
                )}

                {/* Options for Alternative */}
                {category === QuestionCategory.ALTERNATIVE && (
                  <FormField
                    control={form.control}
                    name="options"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.optionsLabel')}</FormLabel>
                        <FormControl>
                          <OptionsInput
                            options={field.value || []}
                            onChange={field.onChange}
                            correctOptions={correctOptions}
                            onCorrectChange={opts => form.setValue('correctOptions', opts)}
                            showCorrect={fixedMode === 'test'}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('events.questions.dialog.optionsHint')}
                          {fixedMode === 'test' && ` ${t('events.questions.dialog.autoCheckShortHint')}`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Required Checkbox */}
                {category !== QuestionCategory.RHETORICAL && (
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          <FormLabel className="cursor-pointer">
                            {t('events.questions.dialog.requiredLabel')}
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {t('events.questions.dialog.requiredDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Step 2: Test Settings (only for test mode) */}
            {step === 2 && fixedMode === 'test' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {t('events.questions.dialog.testSettingsTitle')}
                  </span>
                </div>

                {/* Points */}
                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.questions.dialog.pointsLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('events.questions.dialog.pointsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Correct Answer for OPEN */}
                {category === QuestionCategory.OPEN && (
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.keywordsLabel')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('events.questions.dialog.keywordsPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('events.questions.dialog.keywordsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Correct Answer for CLOSED */}
                {category === QuestionCategory.CLOSED && (
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.questions.dialog.correctAnswerLabel')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('events.questions.dialog.correctAnswerPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={t('common.yes')}>{t('common.yes')}</SelectItem>
                            <SelectItem value={t('common.no')}>{t('common.no')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Correct Options for ALTERNATIVE - shown in step 1 already */}
                {category === QuestionCategory.ALTERNATIVE && correctOptions.length > 0 && (
                  <div className="p-3 bg-success-soft rounded-lg">
                    <div className="flex items-center gap-2 text-success-soft-foreground text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {t('events.questions.dialog.correctOptionsLabel')}{' '}
                        <strong>{correctOptions.join(', ')}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">{t('events.questions.dialog.previewTitle')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={QUESTION_CATEGORY_CONFIG[category]?.color}
                      >
                        {QUESTION_CATEGORY_CONFIG[category]?.label}
                      </Badge>
                      {form.getValues('isRequired') && (
                        <Badge
                          variant="outline"
                          className="border-warning-soft bg-warning-soft text-warning-soft-foreground"
                        >
                          <Asterisk className="h-3 w-3 mr-1" />
                          {t('events.questions.dialog.requiredBadge')}
                        </Badge>
                      )}
                      {fixedMode === 'test' && (
                        <Badge
                          variant="outline"
                          className="border-border bg-muted text-foreground"
                        >
                          <Award className="h-3 w-3 mr-1" />
                          {form.getValues('points')} {t('events.questions.dialog.pointsUnit')}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">
                      {form.getValues('question') || t('events.questions.dialog.emptyPreview')}
                    </p>
                    {category === QuestionCategory.ALTERNATIVE && options.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {options.map((opt, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            <DialogFooter className="flex justify-between gap-2">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t('actions.back')}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('actions.cancel')}
                </Button>
              )}

              {step < totalSteps ? (
                <Button type="button" onClick={nextStep} disabled={!canProceed()}>
                  {t('actions.next')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || !canProceed()}
                  className="gap-2"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingQuestion ? t('actions.save') : t('actions.create')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================
// Question Card
// ================================

function QuestionCard({
  question,
  eventId,
  onEdit,
  index,
}: {
  question: RegistrationQuestion
  eventId: string
  onEdit: (question: RegistrationQuestion) => void
  index: number
}) {
  const t = useT()
  const deleteQuestion = useDeleteQuestion(eventId)
  const typeConfig = getQuestionTypeConfig(t)[question.type]
  const categoryConfig = getQuestionCategoryConfig(t)[question.category]
  const Icon = typeConfig?.icon || HelpCircle
  const CategoryIcon = categoryConfig?.icon || HelpCircle

  const isTest = question.points > 0

  // Drag and drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden transition hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Category Icon */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            categoryConfig?.color
          )}
        >
          <CategoryIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-foreground line-clamp-2">{question.question}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('actions.title')} className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(question)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('actions.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteQuestion.mutate(question.id)}
                  disabled={deleteQuestion.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info text for rhetorical */}
          {question.category === QuestionCategory.RHETORICAL && question.informationalText && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {question.informationalText}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/*
              Badge label drives the user-facing concept (category), not the
              implementation detail (type). A "Да / Нет" question has
              category=CLOSED but type=SELECT under the hood; showing the
              type label here surfaced "Выбор из вариантов" for a Yes/No
              card, which is what the user clicked the wrong type for.
            */}
            <Badge variant="secondary" className="text-xs gap-1">
              <CategoryIcon className="h-3 w-3" />
              {categoryConfig?.label}
            </Badge>
            {question.isRequired && (
              <Badge
                variant="outline"
                className="text-xs border-warning-soft bg-warning-soft text-warning-soft-foreground"
              >
                <Asterisk className="h-3 w-3 mr-0.5" />
                {t('events.questions.dialog.requiredBadge')}
              </Badge>
            )}
            {isTest && (
              <Badge
                variant="outline"
                className="text-xs border-border bg-muted text-foreground"
              >
                <Award className="h-3 w-3 mr-0.5" />
                {question.points} {t('events.questions.dialog.pointsShortUnit')}
              </Badge>
            )}
          </div>

          {/* Options preview */}
          {question.options &&
            question.options.length > 0 &&
            question.category !== QuestionCategory.RHETORICAL && (
              <div className="flex flex-wrap gap-1 mt-2">
                {question.options.slice(0, 4).map((option, i) => {
                  const isCorrect = question.correctOptions?.includes(option)
                  return (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        'text-xs font-normal',
                        isCorrect && 'border-success-soft bg-success-soft text-success-soft-foreground'
                      )}
                    >
                      {isCorrect && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                      {option}
                    </Badge>
                  )
                })}
                {question.options.length > 4 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{question.options.length - 4}
                  </Badge>
                )}
              </div>
            )}
        </div>

        {/* Order */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {index + 1}
        </div>
      </div>
    </Card>
  )
}

// ================================
// Empty State
// ================================

function EmptyState({
  onAdd,
  eventMode,
  onModeChange,
}: {
  onAdd: () => void
  eventMode: 'info' | 'test'
  onModeChange: (mode: 'info' | 'test') => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HelpCircle className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">
        {t('events.questions.empty.title')}
      </h3>
      <p className="mt-2 text-center text-muted-foreground max-w-sm text-sm">
        {t('events.questions.empty.description')}
      </p>

      {/* Переключатель режима */}
      <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onModeChange('info')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition',
            eventMode === 'info'
              ? 'border-info bg-info-soft ring-2 ring-info-soft'
              : 'border-border hover:border-info hover:bg-info-soft/50'
          )}
        >
          <FileText className="h-6 w-6 text-info" />
          <div className="font-medium text-foreground">{t('events.questions.empty.infoModeTitle')}</div>
          <div className="text-xs text-muted-foreground">{t('events.questions.empty.infoModeDescription')}</div>
        </button>

        <button
          type="button"
          onClick={() => onModeChange('test')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition',
            eventMode === 'test'
              ? 'border-foreground bg-muted dark:bg-muted ring-2 ring-foreground/20 dark:ring-foreground/30'
              : 'border-border hover:border-foreground/40 hover:bg-muted dark:hover:bg-muted'
          )}
        >
          <GraduationCap className="h-6 w-6 text-muted-foreground" />
          <div className="font-medium text-foreground">{t('events.questions.empty.testModeTitle')}</div>
          <div className="text-xs text-muted-foreground">{t('events.questions.empty.testModeDescription')}</div>
        </button>
      </div>

      <Button onClick={onAdd} className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        {eventMode === 'test'
          ? t('events.questions.empty.addTestQuestion')
          : t('events.questions.empty.addQuestion')}
      </Button>
    </div>
  )
}

// ================================
// Main Component
// ================================

export function EventQuestionsTab({ eventId }: EventQuestionsTabProps) {
  const t = useT()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<RegistrationQuestion | null>(null)

  // Режим для всего события: определяется по первому вопросу или выбирается пользователем
  const [eventMode, setEventMode] = useState<'info' | 'test'>('info')

  const { data: questionsData, isLoading } = useQuestionsQuery(eventId)
  const createQuestion = useCreateQuestion(eventId)
  const updateQuestion = useUpdateQuestion(eventId)
  const reorderQuestions = useReorderQuestions(eventId)

  const questions = Array.isArray(questionsData) ? questionsData : []

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Определяем режим события по существующим вопросам
  useEffect(() => {
    if (questions.length > 0) {
      const hasTestQuestions = questions.some(q => q.points > 0)
      setEventMode(hasTestQuestions ? 'test' : 'info')
    }
  }, [questions])

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const testQuestionsCount = questions.filter(q => q.points > 0).length

  const handleSubmit = (data: QuestionFormValues) => {
    // QuestionDialog добавляет дополнительные поля translations / translationMeta /
    // optionsTranslations поверх QuestionFormValues — пробрасываем через `as never`.
    const extra = data as unknown as {
      translations?: CreateQuestionRequest['translations']
      translationMeta?: CreateQuestionRequest['translationMeta']
      optionsTranslations?: CreateQuestionRequest['optionsTranslations']
    }
    const isFileUpload = data.type === QuestionType.FILE_UPLOAD
    const requestData: CreateQuestionRequest = {
      question: data.question,
      type: data.type,
      category: data.category,
      isRequired: data.isRequired,
      options:
        !isFileUpload && data.options && data.options.length > 0 ? data.options : undefined,
      points: data.mode === 'test' && !isFileUpload ? data.points || 0 : 0,
      correctAnswer: !isFileUpload ? data.correctAnswer || undefined : undefined,
      correctOptions:
        !isFileUpload && data.correctOptions && data.correctOptions.length > 0
          ? data.correctOptions
          : undefined,
      informationalText: !isFileUpload ? data.informationalText || undefined : undefined,
      ...(isFileUpload &&
        data.fileUpload && {
          fileUploadConfig: {
            description: data.fileUpload.description || undefined,
            template: data.fileUpload.template ?? null,
            maxFileSizeMb: data.fileUpload.maxFileSizeMb,
            allowedFileTypes: data.fileUpload.allowedFileTypes,
            allowMultipleFiles: data.fileUpload.allowMultipleFiles,
            maxFiles: data.fileUpload.maxFiles,
          },
        }),
      ...(extra.translations && { translations: extra.translations }),
      ...(extra.translationMeta && { translationMeta: extra.translationMeta }),
      ...(extra.optionsTranslations && { optionsTranslations: extra.optionsTranslations }),
    }

    if (editingQuestion) {
      updateQuestion.mutate(
        { questionId: editingQuestion.id, data: requestData },
        {
          onSuccess: () => {
            setDialogOpen(false)
            setEditingQuestion(null)
          },
        }
      )
    } else {
      createQuestion.mutate(requestData, {
        onSuccess: () => setDialogOpen(false),
      })
    }
  }

  const handleEdit = (question: RegistrationQuestion) => {
    setEditingQuestion(question)
    setDialogOpen(true)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = questions.findIndex(q => q.id === active.id)
    const newIndex = questions.findIndex(q => q.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Оптимистично обновляем UI
    const newOrder = arrayMove(questions, oldIndex, newIndex)
    const questionIds = newOrder.map(q => q.id)

    // Отправляем запрос на сервер
    reorderQuestions.mutate({ questionIds })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('events.questions.header.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              {t('events.questions.header.title')}
            </h3>
            {questions.length > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  eventMode === 'test'
                    ? 'border-border bg-muted text-foreground'
                    : 'border-info-soft bg-info-soft text-info-soft-foreground'
                )}
              >
                {eventMode === 'test' ? (
                  <>
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {t('events.questions.header.testBadge', { points: totalPoints })}
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    {t('events.tabs.questions')}
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? t('events.questions.header.emptyDescription')
              : t('events.questions.header.count', { count: questions.length })}
          </p>
        </div>
        {questions.length > 0 && (
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.add')}
          </Button>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          onAdd={() => setDialogOpen(true)}
          eventMode={eventMode}
          onModeChange={setEventMode}
        />
      ) : (
        <div className="space-y-4">
          {/* Test stats banner */}
          {eventMode === 'test' && (
            <Card className="border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t('events.questions.header.maxScore', { points: totalPoints })}
                  </span>
                </div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  {t('events.questions.header.count', { count: testQuestionsCount })}
                </Badge>
              </div>
            </Card>
          )}

          {/* Questions list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    eventId={eventId}
                    onEdit={handleEdit}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Dialog */}
      <QuestionDialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open)
          if (!open) setEditingQuestion(null)
        }}
        onSubmit={handleSubmit}
        isPending={createQuestion.isPending || updateQuestion.isPending}
        editingQuestion={editingQuestion}
        eventId={eventId}
        mode={eventMode}
      />
    </div>
  )
}
