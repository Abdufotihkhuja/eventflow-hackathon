import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  AlertCircle,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  IdCard,
  ImageUp,
  Loader2,
  Mic2,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLocale, useT } from '@eventflow/i18n/react'

import type {
  CertificateRecipientRole,
  CertificateSizePreset,
  CertificateTemplate,
  RecipientRole,
} from '@api/services'
import { getMediaUrl } from '@api/config'
import {
  useCertificateTemplatesQuery,
  useCreateCertificateTemplate,
  useDeleteCertificateTemplate,
  useRecipientRolesQuery,
  useUpdateCertificateTemplate,
} from '@features/events/api'
import { usePermissions } from '@features/profile'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import {
  buildScalarNameTranslations,
  flattenScalarNameTranslations,
  ScalarNameTranslationEditor,
  type ScalarNameTranslationsState,
} from '@features/translations'
import { PERMISSION } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  ImageCropperDialog,
  Skeleton,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'

import { CertificateTemplateCanvas } from './certificate-template-canvas'
import {
  CERTIFICATE_ROLE_OPTIONS,
  CERTIFICATE_SIZE_OPTIONS,
  clampFontSize,
  composeNameFont,
  DEFAULT_CERTIFICATE_ROLE,
  DEFAULT_CERTIFICATE_SIZE_PRESET,
  DEFAULT_FIELDS_STATE,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  getCertificatePagePt,
  getCertificateSizeOption,
  loadFieldsFromStorage,
  nameFieldHeightPercent,
  normalizeHexColor,
  parseNameFont,
  parseNameAlign,
  saveFieldsToStorage,
  type CertificateTemplateFieldsState,
  type CertificateSizeOption,
} from './types'

type Step = 'select' | 'crop' | 'position'

const STEPS: Array<{ id: Step; labelKey: string; number: number }> = [
  { id: 'select', labelKey: 'events.certificates.steps.template', number: 1 },
  { id: 'crop', labelKey: 'events.certificates.steps.crop', number: 2 },
  { id: 'position', labelKey: 'events.certificates.steps.fields', number: 3 },
]

const ROLE_ICONS: Record<CertificateRecipientRole, typeof Users> = {
  PARTICIPANT: Users,
  SPEAKER: Mic2,
  MENTOR: GraduationCap,
}

/** Роль без legacy-пары (Staff, VIP, спонсоры, кастомные) — общая иконка. */
const OTHER_ROLE_ICON = IdCard

const ROLE_CARD_ACTIVE = 'border-primary/60 bg-primary/10 ring-1 ring-primary/20'

const LEGACY_BY_BUILT_IN_KEY: Record<string, CertificateRecipientRole> = {
  PARTICIPANT: 'PARTICIPANT',
  SPEAKER: 'SPEAKER',
  MENTOR: 'MENTOR',
}

const LEGACY_ROLE_OPTION = new Map(
  CERTIFICATE_ROLE_OPTIONS.map(option => [option.id, option] as const)
)

/**
 * Роль в селекторе шаблона. Встроенные и кастомные роли равноправны — один
 * список: иначе для Staff/VIP шаблон негде создать, хотя сертификаты им
 * выдавать можно (та же модель, что на вкладке бейджей).
 */
type CertificateRoleTab = {
  id: string
  code: string
  label: string
  description: string | null
  legacy: CertificateRecipientRole | null
  isActive: boolean
  isArtifactEligible: boolean
  icon: typeof Users
}

type CertificateTemplateEditorProps = {
  eventId: string
  className?: string
}

function templateToFieldsState(template: CertificateTemplate): CertificateTemplateFieldsState {
  const def = DEFAULT_FIELDS_STATE
  const first = template.firstNamePosition ?? def.firstNamePosition
  const last = template.lastNamePosition ?? def.lastNamePosition
  // QR is square in *pixels*; on a non-square page that means width% ≠ height%
  // (each percent is relative to a different page dimension). Use the stored
  // values as-is — re-squaring the percents here shrinks the QR every reload.
  // The canvas keeps it visually square (renders min(px) and resizes by min(px)).
  const qr = template.qrPosition ?? def.qrPosition
  const { fontId, bold } = parseNameFont(template.nameFont)
  // Alignment is stored inside the name position JSON (no extra DB column).
  const storedAlign =
    (first as { align?: unknown }).align ?? (last as { align?: unknown }).align
  return {
    firstNamePosition: first,
    lastNamePosition: last,
    qrPosition: qr,
    nameFont: fontId,
    nameBold: bold,
    nameFontSize: clampFontSize(template.nameFontSize ?? DEFAULT_FONT_SIZE),
    nameColor: normalizeHexColor(template.nameColor) ?? DEFAULT_TEXT_COLOR,
    nameAlign: parseNameAlign(storedAlign),
  }
}

/**
 * Returns the built-in CertificateRecipientRole for a template, or null when the template is
 * bound to a custom recipient role (Volunteer / Staff / VIP / etc.).
 *
 * IMPORTANT: do NOT just read `template.recipientRole`. The Prisma schema declares
 * `recipientRole` as non-nullable with a `default(PARTICIPANT)`, so EVERY template — including
 * custom-role ones (where the real semantic role lives in `recipientRoleId`) — carries
 * `recipientRole = PARTICIPANT` in the DB. Counting those as PARTICIPANT templates is exactly
 * the bug the organiser ran into: the editor sidebar reported "2 шаблонов для Участники"
 * while the role list correctly showed "Шаблона нет" for PARTICIPANT — those 2 templates were
 * actually Volunteer templates bound via `recipientRoleId`.
 */
function getTemplateRole(template: CertificateTemplate): CertificateRecipientRole | null {
  if (template.recipientRoleId) return null
  return template.recipientRole ?? DEFAULT_CERTIFICATE_ROLE
}

/**
 * Роль в payload шаблона: нормализованный id — всегда, legacy-энум — только у
 * встроенной тройки (у Staff/VIP/кастомных его нет). Пока роли не подгрузились,
 * шлём прежний дефолт, чтобы шаблон не ушёл на бэкенд без роли вообще.
 */
function buildRolePayload(role: CertificateRoleTab | null): {
  recipientRole?: CertificateRecipientRole
  recipientRoleId?: string
} {
  if (!role) return { recipientRole: DEFAULT_CERTIFICATE_ROLE }
  return {
    ...(role.legacy ? { recipientRole: role.legacy } : {}),
    recipientRoleId: role.id,
  }
}

function getTemplateSize(template: CertificateTemplate): CertificateSizeOption {
  return getCertificateSizeOption(template.sizePreset ?? DEFAULT_CERTIFICATE_SIZE_PRESET)
}

export function CertificateTemplateEditor({ eventId, className }: CertificateTemplateEditorProps) {
  const t = useT()
  const [step, setStep] = useState<Step>('select')
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateNameTranslations, setTemplateNameTranslations] =
    useState<ScalarNameTranslationsState>(() => buildScalarNameTranslations('name'))
  const uiLocale = useLocale()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [sizePreset, setSizePreset] = useState<CertificateSizePreset>(
    DEFAULT_CERTIFICATE_SIZE_PRESET
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fields, setFields] = useState<CertificateTemplateFieldsState>(
    () => loadFieldsFromStorage(eventId) ?? DEFAULT_FIELDS_STATE
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: templatesData, isLoading } = useCertificateTemplatesQuery(eventId)
  const { data: rolesData } = useRecipientRolesQuery(eventId)
  const createMutation = useCreateCertificateTemplate(eventId)
  const updateMutation = useUpdateCertificateTemplate(eventId)
  const deleteMutation = useDeleteCertificateTemplate(eventId)

  const permissions = usePermissions()
  const canTemplate = permissions.hasPermission(PERMISSION.CERTIFICATES_GENERATE)
  const templateDeniedReason = t('events.certificates.generateDeniedReason')

  // In-context "saved" confirmation: the global toast is top-right and gets
  // hidden behind this right-side sheet, so we flash success on the button.
  const [justSaved, setJustSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashSaved = useCallback(() => {
    setJustSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2200)
  }, [])
  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    },
    []
  )

  const recipientRoles = useMemo<RecipientRole[]>(() => rolesData ?? [], [rolesData])
  const builtInRoleIdByLegacy = useMemo(() => {
    const map: Partial<Record<CertificateRecipientRole, string>> = {}
    for (const role of recipientRoles) {
      if (role.kind === 'BUILT_IN' && role.builtInKey) {
        const legacy = LEGACY_BY_BUILT_IN_KEY[role.builtInKey]
        if (legacy) map[legacy] = role.id
      }
    }
    return map
  }, [recipientRoles])

  const templates = useMemo(() => templatesData?.templates ?? [], [templatesData?.templates])
  const selectedSize = useMemo(() => getCertificateSizeOption(sizePreset), [sizePreset])

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || selectedTemplateId === 'new') return null
    return templates.find(t => t.id === selectedTemplateId) ?? null
  }, [templates, selectedTemplateId])

  /**
   * Шаблон → id нормализованной роли. У старых шаблонов роли нет — берём её
   * из legacy-энума, иначе они выпадут из всех списков.
   */
  const templateRoleId = useCallback(
    (template: CertificateTemplate): string | null => {
      if (template.recipientRoleId) return template.recipientRoleId
      const legacy = getTemplateRole(template)
      return legacy ? (builtInRoleIdByLegacy[legacy] ?? null) : null
    },
    [builtInRoleIdByLegacy]
  )

  const templatesByRoleId = useMemo(() => {
    const map = new Map<string, CertificateTemplate[]>()
    for (const template of templates) {
      const roleId = templateRoleId(template)
      if (!roleId) continue
      const bucket = map.get(roleId)
      if (bucket) bucket.push(template)
      else map.set(roleId, [template])
    }
    return map
  }, [templates, templateRoleId])

  /**
   * Роль показывается, если она пригодна для артефактов — либо если на ней уже
   * висит шаблон: выключенную роль с шаблоном нельзя прятать, иначе шаблон
   * пропадает вместе с кнопкой удаления.
   */
  const roleOptions = useMemo<CertificateRoleTab[]>(
    () =>
      [...recipientRoles]
        .filter(
          role =>
            (role.isActive && role.isArtifactEligible) || templatesByRoleId.has(role.id)
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(role => {
          const legacy = role.builtInKey
            ? (LEGACY_BY_BUILT_IN_KEY[role.builtInKey] ?? null)
            : null
          const option = legacy ? LEGACY_ROLE_OPTION.get(legacy) : undefined
          return {
            id: role.id,
            code: role.code,
            label: option
              ? t(option.labelKey)
              : resolveLocalizedField(
                  role.translations,
                  'displayName',
                  uiLocale,
                  role.displayName
                ),
            description: option ? t(option.descriptionKey) : null,
            legacy,
            isActive: role.isActive,
            isArtifactEligible: role.isArtifactEligible,
            icon: legacy ? ROLE_ICONS[legacy] : OTHER_ROLE_ICON,
          }
        }),
    [recipientRoles, templatesByRoleId, t, uiLocale]
  )

  const activeRole =
    roleOptions.find(role => role.id === selectedRoleId) ?? roleOptions[0] ?? null
  const templatesForRole = activeRole ? (templatesByRoleId.get(activeRole.id) ?? []) : []

  const previewImageUrl = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl
    if (selectedTemplate?.templateUrl) {
      return getMediaUrl(selectedTemplate.templateUrl) ?? selectedTemplate.templateUrl
    }
    return null
  }, [imagePreviewUrl, selectedTemplate?.templateUrl])

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId && !templateFile) {
      const first = templates[0]
      setSelectedTemplateId(first.id)
      setSelectedRoleId(templateRoleId(first))
      setSizePreset(getTemplateSize(first).id)
      setFields(templateToFieldsState(first))
      setStep('position')
    }
  }, [templates, selectedTemplateId, templateFile, templateRoleId])

  const handleSelectTemplate = useCallback(
    (template: CertificateTemplate) => {
      setSelectedTemplateId(template.id)
      setTemplateFile(null)
      if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
      setSelectedRoleId(templateRoleId(template))
      setSizePreset(getTemplateSize(template).id)
      setFields(templateToFieldsState(template))
      setStep('position')
    },
    [imagePreviewUrl, templateRoleId]
  )

  const processFile = useCallback(
    (file: File) => {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error(t('events.certificates.toasts.selectImage'))
        return
      }
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
      const url = URL.createObjectURL(file)
      setCropSourceUrl(url)
      const seed =
        file.name.replace(/\.[^.]+$/, '') || t('events.certificates.defaultTemplateName')
      setTemplateName(seed)
      setTemplateNameTranslations(
        buildScalarNameTranslations('name', { scalar: seed }),
      )
      setCropDialogOpen(true)
    },
    [cropSourceUrl, t]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      processFile(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleCropComplete = useCallback(
    (blob: Blob) => {
      const file = new File(
        [blob],
        `${templateName || t('events.certificates.defaultTemplateName')}.png`,
        { type: 'image/png' }
      )
      if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
      const url = URL.createObjectURL(blob)
      setTemplateFile(file)
      setImagePreviewUrl(url)
      setSelectedTemplateId('new')
      setFields(loadFieldsFromStorage(eventId) ?? DEFAULT_FIELDS_STATE)
      setStep('position')
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
      setCropSourceUrl(null)
    },
    [templateName, imagePreviewUrl, cropSourceUrl, eventId, t]
  )

  const handleUpload = useCallback(() => {
    if (!templateFile) return
    const flattened = flattenScalarNameTranslations(
      templateNameTranslations,
      'name',
    )
    const roleFields = buildRolePayload(activeRole)
    createMutation.mutate(
      {
        name:
          flattened.scalar ||
          templateName ||
          t('events.certificates.defaultTemplateName'),
        ...(Object.keys(flattened.translations).length > 0
          ? { translations: flattened.translations }
          : {}),
        template: templateFile,
        ...roleFields,
        sizePreset: selectedSize.id,
        widthPx: selectedSize.widthPx,
        heightPx: selectedSize.heightPx,
        namePosition: {
          x: fields.firstNamePosition.x,
          y: fields.firstNamePosition.y,
        },
        firstNamePosition: {
          ...fields.firstNamePosition,
          align: fields.nameAlign,
          height: nameFieldHeightPercent(
            fields.nameFontSize,
            getCertificatePagePt(selectedSize.id).height
          ),
        },
        lastNamePosition: {
          ...fields.lastNamePosition,
          align: fields.nameAlign,
          height: nameFieldHeightPercent(
            fields.nameFontSize,
            getCertificatePagePt(selectedSize.id).height
          ),
        },
        qrPosition: fields.qrPosition,
        nameFont: composeNameFont(fields.nameFont, fields.nameBold),
        nameFontSize: fields.nameFontSize,
        nameColor: fields.nameColor,
        isDefault: templatesForRole.length === 0,
      },
      {
        onSuccess: () => {
          toast.success(t('events.certificates.toasts.templateSaved'))
          setTemplateFile(null)
          if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
          setImagePreviewUrl(null)
          setSelectedTemplateId(null)
          setStep('select')
        },
        onError: (err: { message?: string }) => {
          toast.error(err.message ?? t('events.certificates.toasts.templateUploadError'))
        },
      }
    )
  }, [
    templateFile,
    templateName,
    templateNameTranslations,
    activeRole,
    selectedSize,
    templatesForRole.length,
    fields,
    imagePreviewUrl,
    createMutation,
    t,
  ])

  const handleSavePositions = useCallback(() => {
    if (!selectedTemplate || templateFile) return
    updateMutation.mutate(
      {
        templateId: selectedTemplate.id,
        data: {
          // Пока роли не подгрузились, роль не трогаем: иначе сохранение
          // позиций переклеило бы шаблон Staff/VIP на участников.
          ...(activeRole ? buildRolePayload(activeRole) : {}),
          sizePreset: selectedSize.id,
          widthPx: selectedSize.widthPx,
          heightPx: selectedSize.heightPx,
          firstNamePosition: {
            ...fields.firstNamePosition,
            align: fields.nameAlign,
            height: nameFieldHeightPercent(
              fields.nameFontSize,
              getCertificatePagePt(selectedSize.id).height
            ),
          },
          lastNamePosition: {
            ...fields.lastNamePosition,
            align: fields.nameAlign,
            height: nameFieldHeightPercent(
              fields.nameFontSize,
              getCertificatePagePt(selectedSize.id).height
            ),
          },
          qrPosition: fields.qrPosition,
          nameFont: composeNameFont(fields.nameFont, fields.nameBold),
          nameFontSize: fields.nameFontSize,
          nameColor: fields.nameColor,
        },
      },
      {
        onSuccess: () => {
          flashSaved()
          toast.success(t('events.certificates.toasts.positionsSaved'))
        },
        onError: (err: { message?: string }) =>
          toast.error(err.message ?? t('events.certificates.toasts.saveError')),
      }
    )
  }, [
    selectedTemplate,
    templateFile,
    activeRole,
    selectedSize,
    fields,
    updateMutation,
    flashSaved,
    t,
  ])

  /**
   * «Сделать основным» — шаблон, который берётся при массовой выдаче. Бэкенд
   * разжалует прежний основной сам, в одной транзакции.
   */
  const handleMakeDefault = useCallback(
    (template: CertificateTemplate) => {
      updateMutation.mutate(
        { templateId: template.id, data: { isDefault: true } },
        {
          onSuccess: () => toast.success(t('events.certificates.toasts.defaultSet')),
          onError: (err: { message?: string }) =>
            toast.error(err.message ?? t('events.certificates.toasts.saveError')),
        }
      )
    },
    [updateMutation, t]
  )

  const handleFieldsChange = useCallback(
    (next: CertificateTemplateFieldsState) => {
      setFields(next)
      saveFieldsToStorage(eventId, next)
    },
    [eventId]
  )

  const handleDeleteTemplate = useCallback(() => {
    if (!selectedTemplate) return
    deleteMutation.mutate(selectedTemplate.id, {
      onSuccess: () => {
        toast.success(t('events.certificates.toasts.templateDeleted'))
        setDeleteDialogOpen(false)
        const rest = templates.filter(t => t.id !== selectedTemplate.id)
        if (rest.length === 0) {
          setSelectedTemplateId(null)
          setImagePreviewUrl(null)
          setRecipientRole(DEFAULT_CERTIFICATE_ROLE)
          setSizePreset(DEFAULT_CERTIFICATE_SIZE_PRESET)
          setFields(loadFieldsFromStorage(eventId) ?? DEFAULT_FIELDS_STATE)
          setStep('select')
        } else {
          setSelectedTemplateId(rest[0].id)
          setRecipientRole(getTemplateRole(rest[0]))
          setSizePreset(getTemplateSize(rest[0]).id)
          setFields(templateToFieldsState(rest[0]))
        }
      },
      onError: (err: { message?: string }) =>
        toast.error(err.message ?? t('events.certificates.toasts.deleteError')),
    })
  }, [selectedTemplate, templates, eventId, deleteMutation, t])

  const handleStartNew = useCallback(() => {
    setSelectedTemplateId('new')
    setTemplateFile(null)
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setFields(loadFieldsFromStorage(eventId) ?? DEFAULT_FIELDS_STATE)
    setStep('crop')
  }, [eventId, imagePreviewUrl])

  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-3 h-64 w-full" />
      </Card>
    )
  }

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const stepProgressPct = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <Card
      className={cn(
        'overflow-hidden border-border bg-card p-0',
        className
      )}
    >
      {/* Hero header */}
      <div className="relative border-b border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-border">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {t('events.certificates.editorTitle')}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('events.certificates.editorTagline')}
              </p>
            </div>
          </div>

          {step !== 'select' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => setStep('select')}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('events.certificates.backToTemplates')}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* Recipient role selector — один список ролей: встроенные и кастомные
            равноправны, иначе для Staff/VIP шаблон негде создать, хотя
            сертификаты им выдавать можно (та же логика, что у бейджей). */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t('events.certificates.recipientType')}
            </div>
            {templatesForRole.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('events.certificates.templatesInRole', {
                  count: templatesForRole.length,
                })}
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {roleOptions.length === 0 &&
              [0, 1, 2].map(i => <Skeleton key={i} className="h-[70px] rounded-xl" />)}
            {roleOptions.map(option => {
              const isActive = activeRole?.id === option.id
              const Icon = option.icon
              const count = (templatesByRoleId.get(option.id) ?? []).length
              // Выключенную роль выбрать нельзя, но если на ней висят шаблоны —
              // оставляем доступ, иначе их не посмотреть и не удалить.
              const disabled =
                (!option.isActive || !option.isArtifactEligible) && count === 0
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  title={
                    !option.isActive
                      ? t('events.certificates.roleOff')
                      : !option.isArtifactEligible
                        ? t('events.certificates.roleNoArtifacts')
                        : undefined
                  }
                  onClick={() => setSelectedRoleId(option.id)}
                  className={cn(
                    'group relative flex items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition duration-200',
                    isActive
                      ? ROLE_CARD_ACTIVE
                      : 'border-border/70 bg-background hover:border-border hover:shadow-sm',
                    disabled && 'cursor-not-allowed opacity-50 hover:border-border/70 hover:shadow-none'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive ? 'bg-brand-soft' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      {count > 0 && (
                        <span
                          className={cn(
                            'inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                            isActive ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {option.description ?? (
                        <span className="font-mono uppercase">{option.code}</span>
                      )}
                      {!option.isActive && ` · ${t('events.certificates.roleOff')}`}
                      {option.isActive &&
                        !option.isArtifactEligible &&
                        ` · ${t('events.certificates.roleNoArtifacts')}`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>


        {/* Size selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Award className="h-3.5 w-3.5" />
              {t('events.certificates.sizePreset')}
            </div>
            <span className="text-xs text-muted-foreground">
              {t(selectedSize.detailKey, {
                widthMm: selectedSize.widthMm ?? '',
                heightMm: selectedSize.heightMm ?? '',
                widthIn: selectedSize.widthIn,
                heightIn: selectedSize.heightIn,
                dpi: selectedSize.dpiLabel,
              })}
            </span>
          </div>
          <div className="relative -mx-1">
            <div className="overflow-x-auto px-1 pb-1 scrollbar-hide">
              <div className="flex min-w-min gap-2">
                {CERTIFICATE_SIZE_OPTIONS.map(option => {
                  const isActive = sizePreset === option.id
                  const isDisabled = Boolean(selectedTemplate && !templateFile)
                  const ratio = option.widthPx / option.heightPx
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSizePreset(option.id)}
                      className={cn(
                        'group flex w-[7.5rem] shrink-0 flex-col items-center gap-1.5 rounded-lg border p-2.5 transition duration-200',
                        isActive
                          ? 'border-primary/60 bg-primary/8 ring-1 ring-primary/20'
                          : 'border-border/70 bg-background hover:border-border hover:bg-muted/40',
                        isDisabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="flex h-8 w-14 items-center justify-center">
                        <div
                          className={cn(
                            'rounded-sm border-2 transition-colors',
                            isActive ? 'border-primary' : 'border-foreground/40'
                          )}
                          style={{
                            width: ratio >= 1 ? '40px' : `${Math.max(20, 40 * ratio)}px`,
                            height: ratio >= 1 ? `${Math.max(20, 40 / ratio)}px` : '32px',
                          }}
                        />
                      </div>
                      <div className="flex w-full flex-col items-center text-center">
                        <span
                          className={cn(
                            'w-full truncate text-[11px] font-medium leading-tight',
                            isActive ? 'text-foreground' : 'text-foreground/80'
                          )}
                          title={t(option.labelKey)}
                        >
                          {t(option.labelKey)}
                        </span>
                        {option.widthMm && option.heightMm ? (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {option.widthMm}×{option.heightMm}мм
                          </span>
                        ) : (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {option.widthIn}×{option.heightIn}in
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden" aria-hidden />
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 border-y border-dashed border-border/60 py-3">
          <div className="flex flex-1 items-center gap-2">
            {STEPS.map((s, idx) => {
              const isCurrent = s.id === step
              const isPast = stepIndex > idx
              return (
                <div key={s.id} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPast) setStep(s.id)
                    }}
                    disabled={!isPast && !isCurrent}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      isCurrent && 'bg-primary text-primary-foreground shadow-sm',
                      isPast &&
                        'cursor-pointer bg-primary/15 text-primary hover:bg-primary/25',
                      !isCurrent && !isPast && 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                        isCurrent && 'bg-primary-foreground/20',
                        isPast && 'bg-primary/20',
                        !isCurrent && !isPast && 'bg-foreground/10'
                      )}
                    >
                      {isPast ? <Check className="h-3 w-3" /> : s.number}
                    </span>
                    <span className="hidden sm:inline">{t(s.labelKey)}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className="h-px flex-1 bg-border" aria-hidden />
                  )}
                </div>
              )
            })}
          </div>
          <div className="hidden text-[10px] tabular-nums text-muted-foreground sm:inline">
            {Math.round(stepProgressPct)}%
          </div>
        </div>

        {/* Step 1: Select template */}
        {step === 'select' && (
          <div>
            {templatesForRole.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templatesForRole.map(template => {
                  const thumbUrl = getMediaUrl(template.templateUrl)
                  const isActive = selectedTemplateId === template.id
                  const templateSize = getTemplateSize(template)
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        'group relative overflow-hidden rounded-xl border bg-background transition duration-200',
                        isActive
                          ? 'border-primary/60 shadow-lg shadow-primary/10 ring-2 ring-primary/30'
                          : 'border-border/70 hover:border-border hover:shadow-md'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(template)}
                        className="block w-full text-left"
                      >
                        <div
                          className="w-full bg-muted/30 bg-cover bg-center"
                          style={{
                            aspectRatio: `${templateSize.widthPx} / ${templateSize.heightPx}`,
                            ...(thumbUrl ? { backgroundImage: `url(${thumbUrl})` } : {}),
                          }}
                        />
                        <div className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {resolveLocalizedField(
                                template.translations,
                                'name',
                                uiLocale,
                                template.name,
                              )}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {template.isDefault && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 gap-0.5 px-1.5 text-[10px] font-medium"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  {t('events.certificates.defaultBadge')}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[10px] tabular-nums"
                              >
                                {t(templateSize.labelKey)}
                              </Badge>
                            </div>
                          </div>
                          {isActive && (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                      {/* Какой шаблон уйдёт в массовую выдачу — видно и переключается
                          прямо в карточке, как на вкладке бейджей. */}
                      <div className="flex items-center gap-1 border-t border-border/60 px-3 py-2">
                        {template.isDefault ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                            <Star className="h-3 w-3 fill-current" />
                            {t('events.certificates.usedInBulk')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={updateMutation.isPending || !canTemplate}
                            title={
                              canTemplate
                                ? t('events.certificates.makeDefaultTooltip')
                                : templateDeniedReason
                            }
                            onClick={() => handleMakeDefault(template)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Star className="h-3 w-3" />
                            {t('events.certificates.makeDefault')}
                          </button>
                        )}
                      </div>
                      <div
                        className={cn(
                          'absolute right-2 top-2 transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border/60 bg-background/90 text-destructive shadow-sm backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                          disabled={!canTemplate}
                          title={!canTemplate ? templateDeniedReason : undefined}
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedTemplateId(template.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Add new card */}
                <button
                  type="button"
                  onClick={handleStartNew}
                  disabled={!canTemplate}
                  title={!canTemplate ? templateDeniedReason : undefined}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-6 text-muted-foreground transition duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border/60 disabled:hover:bg-muted/20 disabled:hover:text-muted-foreground"
                  style={{ aspectRatio: `${selectedSize.widthPx} / ${selectedSize.heightPx}` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60 ring-1 ring-border/60 transition group-hover:bg-primary/10 group-hover:ring-primary/30">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{t('events.certificates.addTemplate')}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-12 text-center">
                <div className="relative">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border">
                    <ImageUp className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h4 className="mt-4 text-base font-semibold">
                  {t('events.certificates.noTemplatesTitle')}
                </h4>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  {t('events.certificates.noTemplatesDescription')}{' '}
                  <span className="whitespace-nowrap font-medium text-foreground tabular-nums">
                    {selectedSize.widthPx}×{selectedSize.heightPx}px
                  </span>
                </p>
                <Button
                  className="mt-5 gap-2"
                  onClick={handleStartNew}
                  disabled={!canTemplate}
                  title={!canTemplate ? templateDeniedReason : undefined}
                >
                  <Upload className="h-4 w-4" />
                  {t('events.certificates.uploadTemplate')}
                </Button>
                {!canTemplate && (
                  <p className="mt-2 text-xs text-muted-foreground">{templateDeniedReason}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Crop */}
        {step === 'crop' && (
          <div className="flex flex-col items-center justify-center py-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              className="sr-only"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex w-full max-w-lg cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 transition duration-200',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border/70 bg-muted/30 hover:border-primary/50 hover:bg-muted/40'
              )}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                  isDragging
                    ? 'bg-primary/20 text-primary'
                    : 'bg-background ring-1 ring-border/60 text-muted-foreground'
                )}
              >
                <ImageUp className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {isDragging
                    ? t('events.certificates.dropToUpload')
                    : t('events.certificates.chooseImage')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('events.certificates.imageHint', {
                    width: selectedSize.widthPx,
                    height: selectedSize.heightPx,
                  })}
                </p>
              </div>
            </div>

            {templateFile && (
              <Button className="mt-6 gap-2" onClick={() => setStep('position')}>
                {t('actions.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Position fields */}
        {step === 'position' && previewImageUrl && (
          <div className="space-y-4">
            <CertificateTemplateCanvas
              imageUrl={previewImageUrl}
              width={
                selectedTemplate ? getTemplateSize(selectedTemplate).widthPx : selectedSize.widthPx
              }
              height={
                selectedTemplate
                  ? getTemplateSize(selectedTemplate).heightPx
                  : selectedSize.heightPx
              }
              pageWidthPt={
                getCertificatePagePt(
                  selectedTemplate
                    ? getTemplateSize(selectedTemplate).id
                    : selectedSize.id
                ).width
              }
              fields={fields}
              onFieldsChange={handleFieldsChange}
            />

            {templateFile && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <ScalarNameTranslationEditor
                  fieldKey="name"
                  label={t('events.certificates.templateNameLabel')}
                  placeholder={t('events.certificates.defaultTemplateName')}
                  state={templateNameTranslations}
                  onStateChange={setTemplateNameTranslations}
                  disabled={!canTemplate}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4">
              {!canTemplate ? (
                <span className="mr-auto text-xs text-muted-foreground">
                  {templateDeniedReason}
                </span>
              ) : createMutation.isError || updateMutation.isError ? (
                <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {((createMutation.error ?? updateMutation.error) as { message?: string })
                    ?.message ?? t('events.certificates.toasts.saveError')}
                </span>
              ) : null}
              {templateFile ? (
                <Button
                  onClick={handleUpload}
                  disabled={createMutation.isPending || !canTemplate}
                  title={!canTemplate ? templateDeniedReason : undefined}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {createMutation.isPending
                    ? t('events.certificates.saving')
                    : t('events.certificates.saveTemplate')}
                </Button>
              ) : selectedTemplate ? (
                <Button
                  onClick={handleSavePositions}
                  disabled={updateMutation.isPending || justSaved || !canTemplate}
                  title={!canTemplate ? templateDeniedReason : undefined}
                  className={cn(
                    'gap-2 transition-colors',
                    justSaved &&
                      'bg-success text-white hover:bg-success disabled:opacity-100'
                  )}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : justSaved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {updateMutation.isPending
                    ? t('events.certificates.saving')
                    : justSaved
                      ? t('events.certificates.toasts.positionsSaved')
                      : t('events.certificates.savePositions')}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Crop dialog */}
      {cropSourceUrl && (
        <ImageCropperDialog
          open={cropDialogOpen}
          onOpenChange={open => {
            setCropDialogOpen(open)
            if (!open) {
              URL.revokeObjectURL(cropSourceUrl)
              setCropSourceUrl(null)
            }
          }}
          imageSrc={cropSourceUrl}
          aspect={selectedSize.widthPx / selectedSize.heightPx}
          outputWidth={selectedSize.widthPx}
          outputHeight={selectedSize.heightPx}
          title={t('events.certificates.cropTitle')}
          description={t('events.certificates.cropDescription', {
            width: selectedSize.widthPx,
            height: selectedSize.heightPx,
          })}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.certificates.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.certificates.deleteDescription', {
                name: selectedTemplate?.name ?? t('events.certificates.defaultTemplateName'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                handleDeleteTemplate()
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('events.certificates.deleting') : t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
