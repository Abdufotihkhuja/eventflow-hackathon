import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Crown,
  Download,
  GraduationCap,
  IdCard,
  ImageUp,
  Info,
  Loader2,
  Mic2,
  Move,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Upload,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'

import { getMediaUrl } from '@api/config'
import type {
  ArtifactBulkPreviewRequest,
  BadgeRecipientRole,
  BadgeSizePreset,
  BadgeTemplate,
  DownloadBadgesRequest,
} from '@api/services'
import type { Registration } from '@api/services/registration.types'
import {
  useBadgeTemplatesQuery,
  useBadgesZipStatus,
  useCreateBadgeTemplate,
  useDeleteBadgeTemplate,
  useFetchBadgesArchive,
  useEventQuery,
  useEventRegistrationsQuery,
  useRecipientRolesQuery,
  useRequestBadgesZip,
  useUpdateBadgeTemplate,
} from '@features/events/api'
import {
  BulkPreviewDialog,
  CertificateTemplateCanvas,
  DEFAULT_FIELDS_STATE,
  RecipientSelector,
  RecipientsRolesSheet,
  clampFontSize,
  composeNameFont,
  nameFieldHeightPercent,
  normalizeHexColor,
  parseNameAlign,
  parseNameFont,
  type CertificateTemplateFieldsState,
} from '@features/events/ui'
import { LimitPrompt, mapBillingError } from '@features/billing'
import { usePermissions } from '@features/profile'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import {
  buildScalarNameTranslations,
  flattenScalarNameTranslations,
  ScalarNameTranslationEditor,
  type ScalarNameTranslationsState,
} from '@features/translations'
import { useLocale, useT } from '@eventflow/i18n/react'
import { cn } from '@shared/lib/cn'
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
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ImageCropperDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'

type EventBadgesTabProps = {
  eventId: string
}

class BadgesTabErrorBoundary extends Component<
  { children: ReactNode; t: ReturnType<typeof useT> },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[BadgesTab] render error:', error, info)
    toast.error(error.message || this.props.t('events.badges.errorBoundary.toastTitle'), {
      description: this.props.t('events.badges.errorBoundary.toastDescription'),
    })
  }
  render() {
    if (this.state.error) {
      return (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {this.props.t('events.badges.errorBoundary.title')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {this.props.t('events.badges.errorBoundary.description')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => this.setState({ error: null })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {this.props.t('events.badges.errorBoundary.retry')}
          </Button>
        </Card>
      )
    }
    return this.props.children
  }
}

type RoleConfig = {
  id: BadgeRecipientRole
  label: string
  shortLabel: string
  description: string
  icon: typeof Users
  accent: string
  iconWrap: string
  ring: string
  cardActive: string
  chipActive: string
}

const ROLE_CONFIG: Record<BadgeRecipientRole, RoleConfig> = {
  PARTICIPANT: {
    id: 'PARTICIPANT',
    label: 'events.badges.roles.participants',
    shortLabel: 'events.badges.roles.participantsShort',
    description: 'events.badges.roles.participantsDescription',
    icon: Users,
    accent: 'text-info',
    iconWrap: 'bg-info-soft text-info',
    ring: 'ring-info-soft',
    cardActive: 'border-info ring-2 ring-info-soft',
    chipActive: 'bg-info text-white shadow-sm',
  },
  SPEAKER: {
    id: 'SPEAKER',
    label: 'events.badges.roles.speakers',
    shortLabel: 'events.badges.roles.speakersShort',
    description: 'events.badges.roles.speakersDescription',
    icon: Mic2,
    accent: 'text-foreground',
    iconWrap: 'bg-muted text-foreground',
    ring: 'ring-border',
    cardActive: 'border-foreground ring-2 ring-border',
    chipActive: 'bg-foreground text-background shadow-sm',
  },
  MENTOR: {
    id: 'MENTOR',
    label: 'events.badges.roles.mentors',
    shortLabel: 'events.badges.roles.mentorsShort',
    description: 'events.badges.roles.mentorsDescription',
    icon: GraduationCap,
    accent: 'text-warning',
    iconWrap: 'bg-warning-soft text-warning',
    ring: 'ring-warning-soft',
    cardActive: 'border-warning ring-2 ring-warning-soft',
    chipActive: 'bg-warning text-white shadow-sm',
  },
}

const LEGACY_BY_BUILT_IN_KEY: Record<string, BadgeRecipientRole> = {
  PARTICIPANT: 'PARTICIPANT',
  SPEAKER: 'SPEAKER',
  MENTOR: 'MENTOR',
}

/** Оформление вкладки кастомной роли — у неё нет записи в ROLE_CONFIG. */
const CUSTOM_ROLE_STYLE = {
  icon: IdCard,
  accent: 'text-primary',
  cardActive: 'border-primary ring-2 ring-primary/20',
} as const

/**
 * Роль на вкладке бейджей. Строится из нормализованных ролей события, а не из
 * трёх legacy-значений: кастомные роли (Staff, VIP) тоже получают вкладку,
 * шаблон и выгрузку — иначе загруженный для них шаблон нигде не виден.
 */
type BadgeRoleTab = {
  id: string
  code: string
  label: string
  legacy: BadgeRecipientRole | null
  isActive: boolean
  isArtifactEligible: boolean
  icon: typeof Users
  accent: string
  cardActive: string
}

type BadgeSizeOption = {
  id: BadgeSizePreset
  label: string
  detail: string
  orientation: 'horizontal' | 'vertical' | 'square'
  widthPx: number
  heightPx: number
}

const BADGE_SIZES: BadgeSizeOption[] = [
  { id: 'BADGE_85X55', label: '85 × 55', detail: 'events.badges.sizeDetails.bankCard', orientation: 'horizontal', widthPx: 1004, heightPx: 650 },
  { id: 'BADGE_90X60', label: '90 × 60', detail: 'events.badges.sizeDetails.officeStandard', orientation: 'horizontal', widthPx: 1063, heightPx: 709 },
  { id: 'BADGE_90X90', label: '90 × 90', detail: 'events.badges.sizeDetails.squareLargeContent', orientation: 'square', widthPx: 1063, heightPx: 1063 },
  { id: 'BADGE_100X70', label: '100 × 70', detail: 'events.badges.sizeDetails.moreInfo', orientation: 'horizontal', widthPx: 1181, heightPx: 827 },
  { id: 'BADGE_60X90', label: '60 × 90', detail: 'events.badges.sizeDetails.verticalClassic', orientation: 'vertical', widthPx: 709, heightPx: 1063 },
  { id: 'BADGE_80X100', label: '80 × 100', detail: 'events.badges.sizeDetails.verticalConferences', orientation: 'vertical', widthPx: 945, heightPx: 1181 },
  { id: 'BADGE_A6', label: '105 × 148', detail: 'events.badges.sizeDetails.a6MassEvents', orientation: 'vertical', widthPx: 1240, heightPx: 1748 },
]

const ORIENTATION_LABEL: Record<BadgeSizeOption['orientation'], string> = {
  horizontal: 'events.badges.orientation.horizontal',
  vertical: 'events.badges.orientation.vertical',
  square: 'events.badges.orientation.square',
}

function getSizeOption(sizePreset: string): BadgeSizeOption {
  return BADGE_SIZES.find(size => size.id === sizePreset) ?? BADGE_SIZES[0]
}

/** мм → пункты PDF (1 pt = 1/72 дюйма). */
const mmToPt = (mm: number): number => (mm / 25.4) * 72

/**
 * Размер PDF-страницы бейджа в пунктах для каждого пресета — зеркалит
 * BADGE_SIZE_PRESETS из apps/api/src/modules/shared/artifact-size-presets.ts
 * (мм → pt: mm / 25.4 * 72). Кегль шрифта задаётся в пунктах этой страницы,
 * поэтому холсту нужен pageWidthPt для точного масштаба превью.
 */
const BADGE_PAGE_PT: Record<BadgeSizePreset, { width: number; height: number }> = {
  BADGE_85X55: { width: mmToPt(85), height: mmToPt(55) },
  BADGE_90X60: { width: mmToPt(90), height: mmToPt(60) },
  BADGE_60X90: { width: mmToPt(60), height: mmToPt(90) },
  BADGE_90X90: { width: mmToPt(90), height: mmToPt(90) },
  BADGE_100X70: { width: mmToPt(100), height: mmToPt(70) },
  BADGE_80X100: { width: mmToPt(80), height: mmToPt(100) },
  BADGE_A6: { width: mmToPt(105), height: mmToPt(148) },
}

function getBadgePagePt(sizePreset: string): { width: number; height: number } {
  return BADGE_PAGE_PT[sizePreset as BadgeSizePreset] ?? BADGE_PAGE_PT.BADGE_85X55
}

/** Кегль и цвет имени по умолчанию — совпадают с fallback'ами buildBadgePdf. */
const BADGE_DEFAULT_NAME_FONT_SIZE = 17
const BADGE_DEFAULT_NAME_COLOR = '#111827'
/** Кегль и цвет текстов роли / названия события по умолчанию (buildBadgePdf). */
const BADGE_DEFAULT_ROLE_FONT_SIZE = 8
const BADGE_DEFAULT_ROLE_COLOR = '#4b5563'
const BADGE_DEFAULT_EVENT_FONT_SIZE = 7
const BADGE_DEFAULT_EVENT_COLOR = '#374151'
const BADGE_SECONDARY_FONT_SIZE_MIN = 4
const BADGE_SECONDARY_FONT_SIZE_MAX = 120
const BADGE_LABEL_MAX_LENGTH = 120

/**
 * Дефолтные зоны бейджа. ВАЖНО: прямоугольники 1:1 повторяют fallback'и
 * buildBadgePdf (apps/api/src/modules/badges/badges.service.ts), чтобы превью
 * совпадало с PDF даже у шаблонов, сохранённых без правки позиций.
 */
const BADGE_DEFAULT_FIELDS_STATE: CertificateTemplateFieldsState = {
  firstNamePosition: { x: 8, y: 38, width: 58, height: 10 },
  lastNamePosition: { x: 8, y: 50, width: 58, height: 10 },
  qrPosition: { x: 74, y: 44, width: 18, height: 28 },
  rolePosition: { x: 8, y: 65, width: 45, height: 8 },
  eventNamePosition: { x: 8, y: 18, width: 62, height: 8 },
  nameFont: DEFAULT_FIELDS_STATE.nameFont,
  nameBold: false,
  nameFontSize: BADGE_DEFAULT_NAME_FONT_SIZE,
  nameColor: BADGE_DEFAULT_NAME_COLOR,
  nameAlign: 'left',
  roleLabel: '',
  roleFontSize: BADGE_DEFAULT_ROLE_FONT_SIZE,
  roleColor: BADGE_DEFAULT_ROLE_COLOR,
  eventLabel: '',
  eventFontSize: BADGE_DEFAULT_EVENT_FONT_SIZE,
  eventColor: BADGE_DEFAULT_EVENT_COLOR,
}

function clampSecondaryFontSize(size: number): number {
  if (!Number.isFinite(size)) return BADGE_DEFAULT_ROLE_FONT_SIZE
  return Math.min(
    BADGE_SECONDARY_FONT_SIZE_MAX,
    Math.max(BADGE_SECONDARY_FONT_SIZE_MIN, Math.round(size))
  )
}

/** Текст роли, который печатает на бейдже backend (roleLabel в badges.service.ts). */
const BADGE_ROLE_PDF_LABEL: Record<BadgeRecipientRole, string> = {
  PARTICIPANT: 'Participant',
  SPEAKER: 'Speaker',
  MENTOR: 'Mentor',
}

/**
 * Текст роли по умолчанию для превью (когда в шаблоне не задан свой):
 * зеркалит backend roleLabel — встроенные роли печатаются как
 * Participant/Speaker/Mentor, кастомные — по displayName роли, а без него
 * title-case из roleCode.
 */
function badgeRolePdfLabel(template: BadgeTemplate): string {
  if (template.recipientRole) return BADGE_ROLE_PDF_LABEL[template.recipientRole]
  const displayName = template.roleDisplayName?.trim()
  if (displayName) return displayName
  const code = template.roleCode
  if (!code) return BADGE_ROLE_PDF_LABEL.PARTICIPANT
  return code
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Текст, кегль и цвет роли и названия события — каждый настраивается отдельно.
 * Пустой текст печатает значение по умолчанию (показано в placeholder).
 */
function BadgeSecondaryTextControls({
  fields,
  onChange,
  defaults,
}: {
  fields: CertificateTemplateFieldsState
  onChange: (next: CertificateTemplateFieldsState) => void
  defaults: { role: string; event: string }
}) {
  const t = useT()
  const rows = [
    {
      key: 'role' as const,
      title: t('events.badges.positions.texts.role'),
      label: fields.roleLabel ?? '',
      fontSize: fields.roleFontSize ?? BADGE_DEFAULT_ROLE_FONT_SIZE,
      color: fields.roleColor ?? BADGE_DEFAULT_ROLE_COLOR,
      placeholder: defaults.role,
      patch: (next: { label?: string; fontSize?: number; color?: string }) =>
        onChange({
          ...fields,
          ...(next.label !== undefined ? { roleLabel: next.label } : {}),
          ...(next.fontSize !== undefined ? { roleFontSize: next.fontSize } : {}),
          ...(next.color !== undefined ? { roleColor: next.color } : {}),
        }),
    },
    {
      key: 'event' as const,
      title: t('events.badges.positions.texts.event'),
      label: fields.eventLabel ?? '',
      fontSize: fields.eventFontSize ?? BADGE_DEFAULT_EVENT_FONT_SIZE,
      color: fields.eventColor ?? BADGE_DEFAULT_EVENT_COLOR,
      placeholder: defaults.event,
      patch: (next: { label?: string; fontSize?: number; color?: string }) =>
        onChange({
          ...fields,
          ...(next.label !== undefined ? { eventLabel: next.label } : {}),
          ...(next.fontSize !== undefined ? { eventFontSize: next.fontSize } : {}),
          ...(next.color !== undefined ? { eventColor: next.color } : {}),
        }),
    },
  ]

  return (
    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
      <div>
        <p className="text-sm font-medium">{t('events.badges.positions.texts.title')}</p>
        <p className="text-xs text-muted-foreground">
          {t('events.badges.positions.texts.description')}
        </p>
      </div>
      {rows.map(row => (
        <div key={row.key} className="grid grid-cols-[1fr_5.5rem_2.5rem] items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`badge-${row.key}-label`} className="text-xs">
              {row.title}
            </Label>
            <Input
              id={`badge-${row.key}-label`}
              value={row.label}
              maxLength={BADGE_LABEL_MAX_LENGTH}
              placeholder={t('events.badges.positions.texts.defaultPlaceholder', {
                value: row.placeholder,
              })}
              onChange={e => row.patch({ label: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`badge-${row.key}-size`} className="text-xs">
              {t('events.badges.positions.texts.size')}
            </Label>
            <Input
              id={`badge-${row.key}-size`}
              type="number"
              inputMode="numeric"
              min={BADGE_SECONDARY_FONT_SIZE_MIN}
              max={BADGE_SECONDARY_FONT_SIZE_MAX}
              value={row.fontSize}
              onChange={e => {
                const parsed = Number.parseInt(e.target.value, 10)
                if (Number.isFinite(parsed)) row.patch({ fontSize: clampSecondaryFontSize(parsed) })
              }}
            />
          </div>
          <label
            className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-input"
            title={t('events.badges.positions.texts.color')}
            style={{ backgroundColor: row.color }}
          >
            <input
              type="color"
              value={row.color}
              onChange={e => row.patch({ color: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={`${row.title}: ${t('events.badges.positions.texts.color')}`}
            />
          </label>
        </div>
      ))}
    </div>
  )
}

function SelectedBadgesDialog({
  eventId,
  open,
  onOpenChange,
  onConfirmRecipients,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmRecipients: (recipientIds: string[]) => void
}) {
  const t = useT()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next)
        if (!next) setSelectedIds(new Set())
      }}
    >
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IdCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{t('events.badges.selectDialog.title')}</DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {t('events.badges.selectDialog.descriptionRoles')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <RecipientSelector
          eventId={eventId}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          className="min-h-0 flex-1"
        />

        <DialogFooter>
          <div className="mr-auto text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? <>{t('events.badges.selectDialog.selectedCount')} <span className="font-semibold text-foreground">{selectedIds.size}</span></>
              : t('events.badges.selectDialog.noneSelected')}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('events.badges.selectDialog.cancel')}
          </Button>
          <Button
            onClick={() => {
              if (selectedIds.size === 0) return
              onConfirmRecipients(Array.from(selectedIds))
            }}
            disabled={selectedIds.size === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('events.badges.selectDialog.nextPreview')} {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SizeOrientationGlyph({ orientation }: { orientation: BadgeSizeOption['orientation'] }) {
  const dims = {
    horizontal: { width: 22, height: 14 },
    vertical: { width: 14, height: 22 },
    square: { width: 18, height: 18 },
  }[orientation]

  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center"
    >
      <span
        className="rounded-[3px] border border-current"
        style={{ width: dims.width, height: dims.height }}
      />
    </span>
  )
}

type PendingBadgeAction =
  | { kind: 'role'; roleId: string; roleCode: string }
  | { kind: 'selected'; recipientIds: string[] }

export function EventBadgesTab(props: EventBadgesTabProps) {
  const t = useT()
  return (
    <BadgesTabErrorBoundary t={t}>
      <EventBadgesTabImpl {...props} />
    </BadgesTabErrorBoundary>
  )
}

function EventBadgesTabImpl({ eventId }: EventBadgesTabProps) {
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null)
  const [uploadRoleId, setUploadRoleId] = useState<string | null>(null)
  const [sizePreset, setSizePreset] = useState<BadgeSizePreset>('BADGE_85X55')
  const [templateNameTranslations, setTemplateNameTranslations] =
    useState<ScalarNameTranslationsState>(() => buildScalarNameTranslations('name'))
  const uiLocale = useLocale()
  const t = useT()
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectDialogOpen, setSelectDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingBadgeAction | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false)
  const [positionsEditorTemplateId, setPositionsEditorTemplateId] = useState<string | null>(null)
  const [positionsDraft, setPositionsDraft] =
    useState<CertificateTemplateFieldsState>(BADGE_DEFAULT_FIELDS_STATE)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const recipientRolesQuery = useRecipientRolesQuery(eventId)

  const permissions = usePermissions()
  const canTemplate = permissions.hasPermission(PERMISSION.CERTIFICATES_GENERATE)
  const canExport = permissions.hasPermission(PERMISSION.CERTIFICATES_EXPORT)
  const canManageRecipients = permissions.hasPermission(PERMISSION.ARTIFACT_RECIPIENTS_MANAGE)
  const canManageRoles = permissions.hasPermission(PERMISSION.RECIPIENT_ROLES_MANAGE)
  const canOpenManage = canManageRecipients || canManageRoles
  const templateDeniedReason = t('events.badges.deniedReason.generate')
  const exportDeniedReason = t('events.badges.deniedReason.export')

  const templatesQuery = useBadgeTemplatesQuery(eventId)
  // Название события нужно для WYSIWYG-зоны «Название события» на холсте.
  const eventQuery = useEventQuery(eventId)
  const registrationsQuery = useEventRegistrationsQuery(eventId, { limit: 500 })
  const createMutation = useCreateBadgeTemplate(eventId)
  const updateMutation = useUpdateBadgeTemplate(eventId)
  const deleteMutation = useDeleteBadgeTemplate(eventId)
  const downloadMutation = useRequestBadgesZip(eventId)
  const fetchArchiveMutation = useFetchBadgesArchive(eventId)

  // ── Фоновая сборка ZIP ────────────────────────────────────────────────
  // Бейджи рендерятся заново на каждую выгрузку, поэтому архив собирается в
  // очереди, а вкладка опрашивает прогресс.
  const [zipJob, setZipJob] = useState<{ jobId: string; filename: string; total: number } | null>(
    null
  )
  const { data: zipStatus } = useBadgesZipStatus(eventId, zipJob?.jobId ?? null)
  const zipDone = zipStatus?.status === 'processing' ? (zipStatus.done ?? 0) : 0
  const zipTotal =
    zipStatus?.status === 'processing' ? (zipStatus.total ?? zipJob?.total ?? 0) : (zipJob?.total ?? 0)
  const zipPercent = zipTotal > 0 ? Math.min(100, Math.round((zipDone / zipTotal) * 100)) : 0

  const saveArchive = useCallback(
    (jobId: string, filename: string) => {
      fetchArchiveMutation.mutate(
        { jobId, filename },
        {
          onSuccess: () => toast.success(t('events.badges.zip.done')),
          onError: (error: { message?: string }) =>
            toast.error(error.message ?? t('events.badges.zip.error')),
        }
      )
    },
    [fetchArchiveMutation, t]
  )

  /** Ставит выгрузку в очередь; готовый архив скачивается сразу. */
  const startZipDownload = useCallback(
    (payload: DownloadBadgesRequest, filename: string) => {
      downloadMutation.mutate(payload, {
        onSuccess: result => {
          setPreviewOpen(false)
          if (result.status === 'ready') {
            saveArchive(result.jobId, filename)
            return
          }
          setZipJob({ jobId: result.jobId, filename, total: result.total })
        },
        onError: (error: { message?: string }) =>
          toast.error(error.message ?? t('events.badges.zip.error')),
      })
    },
    [downloadMutation, saveArchive, t]
  )

  useEffect(() => {
    if (!zipJob || !zipStatus) return
    if (zipStatus.status === 'ready') {
      setZipJob(null)
      saveArchive(zipJob.jobId, zipJob.filename)
      return
    }
    if (zipStatus.status === 'failed' || zipStatus.status === 'expired') {
      setZipJob(null)
      toast.error(
        (zipStatus.status === 'failed' ? zipStatus.failedReason : undefined) ??
          t('events.badges.zip.error')
      )
    }
  }, [zipJob, zipStatus, saveArchive, t])

  const templates = templatesQuery.data?.templates ?? []
  const registrations = registrationsQuery.data?.data ?? []

  const approvedCounts = useMemo(() => {
    const result: Record<BadgeRecipientRole, number> = { PARTICIPANT: 0, SPEAKER: 0, MENTOR: 0 }
    registrations.forEach((registration: Registration) => {
      if (registration.status === 'APPROVED' && registration.role && result[registration.role as BadgeRecipientRole] !== undefined) {
        result[registration.role as BadgeRecipientRole] += 1
      }
    })
    return result
  }, [registrations])

  const builtInRoleIdByLegacy = useMemo(() => {
    const map: Partial<Record<BadgeRecipientRole, string>> = {}
    for (const recipientRole of recipientRolesQuery.data ?? []) {
      if (recipientRole.kind === 'BUILT_IN' && recipientRole.builtInKey) {
        const legacy = LEGACY_BY_BUILT_IN_KEY[recipientRole.builtInKey]
        if (legacy) map[legacy] = recipientRole.id
      }
    }
    return map
  }, [recipientRolesQuery.data])

  /** Шаблоны сгруппированы по нормализованной роли (у старых её нет — берём legacy). */
  const templateRoleId = useCallback(
    (template: BadgeTemplate): string | null =>
      template.recipientRoleId ??
      (template.recipientRole ? builtInRoleIdByLegacy[template.recipientRole] ?? null : null),
    [builtInRoleIdByLegacy]
  )

  const templatesByRoleId = useMemo(() => {
    const map = new Map<string, BadgeTemplate[]>()
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
   * пропадает из интерфейса вместе с кнопкой удаления.
   */
  const badgeRoles = useMemo<BadgeRoleTab[]>(() => {
    return (recipientRolesQuery.data ?? [])
      .filter(
        recipientRole =>
          (recipientRole.isActive && recipientRole.isArtifactEligible) ||
          templatesByRoleId.has(recipientRole.id)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(recipientRole => {
        const legacy = recipientRole.builtInKey
          ? LEGACY_BY_BUILT_IN_KEY[recipientRole.builtInKey] ?? null
          : null
        const config = legacy ? ROLE_CONFIG[legacy] : null
        return {
          id: recipientRole.id,
          code: recipientRole.code,
          label: config
            ? t(config.label)
            : resolveLocalizedField(
                recipientRole.translations,
                'displayName',
                uiLocale,
                recipientRole.displayName
              ),
          legacy,
          isActive: recipientRole.isActive,
          isArtifactEligible: recipientRole.isArtifactEligible,
          icon: config?.icon ?? CUSTOM_ROLE_STYLE.icon,
          accent: config?.accent ?? CUSTOM_ROLE_STYLE.accent,
          cardActive: config?.cardActive ?? CUSTOM_ROLE_STYLE.cardActive,
        }
      })
  }, [recipientRolesQuery.data, templatesByRoleId, t, uiLocale])

  const activeRole =
    badgeRoles.find(item => item.id === activeRoleId) ?? badgeRoles[0] ?? null
  const roleTemplates = activeRole ? templatesByRoleId.get(activeRole.id) ?? [] : []
  const selectedSize = useMemo(() => getSizeOption(sizePreset), [sizePreset])

  /** Сколько человек получит бейджи: у встроенных ролей — одобренные регистрации. */
  const roleRecipientCount = (item: BadgeRoleTab): number | null =>
    item.legacy ? approvedCounts[item.legacy] : null

  const resetUploadForm = () => {
    setTemplateFile(null)
    setTemplateNameTranslations(buildScalarNameTranslations('name'))
    setUploadSheetOpen(false)
  }

  const openUploadSheet = () => {
    setUploadRoleId(activeRole?.id ?? null)
    setUploadSheetOpen(true)
  }

  const uploadRole =
    badgeRoles.find(item => item.id === uploadRoleId) ?? activeRole ?? null

  const handleUpload = () => {
    if (!templateFile || !uploadRole) return
    const flattened = flattenScalarNameTranslations(
      templateNameTranslations,
      'name',
    )
    const fallbackName = `${uploadRole.label} ${selectedSize.label} ${t('events.badges.sizeUnit')}`
    const finalName = flattened.scalar || fallbackName
    createMutation.mutate(
      {
        name: finalName,
        template: templateFile,
        ...(Object.keys(flattened.translations).length > 0
          ? { translations: flattened.translations }
          : {}),
        ...(uploadRole.legacy ? { recipientRole: uploadRole.legacy } : {}),
        recipientRoleId: uploadRole.id,
        sizePreset,
        widthPx: selectedSize.widthPx,
        heightPx: selectedSize.heightPx,
        // Первый шаблон роли сразу становится основным, иначе массовая выгрузка
        // этой роли скажет «нет шаблона» при наличии загруженного макета.
        isDefault: (templatesByRoleId.get(uploadRole.id) ?? []).length === 0,
      },
      { onSuccess: resetUploadForm }
    )
  }

  const previewRequest = useMemo<ArtifactBulkPreviewRequest | null>(() => {
    if (!pendingAction) return null
    if (pendingAction.kind === 'role') {
      return {
        artifactType: 'BADGE',
        scope: 'ROLE',
        recipientRoleId: pendingAction.roleId,
        onlyApproved: true,
      }
    }
    return {
      artifactType: 'BADGE',
      scope: 'SELECTED',
      recipientIds: pendingAction.recipientIds,
      onlyApproved: true,
    }
  }, [pendingAction])

  const runBadgeAction = useCallback(() => {
    if (!pendingAction) return
    if (pendingAction.kind === 'role') {
      const matching = templatesByRoleId.get(pendingAction.roleId) ?? []
      // Явный templateId позволяет выгрузить роль по единственному шаблону,
      // даже если организатор не отметил его основным.
      const template = matching.find(item => item.isDefault) ?? matching[0]
      if (!template) return
      startZipDownload(
        {
          recipientRoleId: pendingAction.roleId,
          templateId: template.id,
          onlyApproved: true,
        },
        `badges-${pendingAction.roleCode}.zip`
      )
      return
    }
    startZipDownload(
      { recipientIds: pendingAction.recipientIds, onlyApproved: true },
      'badges-selected.zip'
    )
  }, [pendingAction, templatesByRoleId, startZipDownload])

  const startBadgeAction = (action: PendingBadgeAction) => {
    setPendingAction(action)
    setPreviewOpen(true)
  }

  const handleDownloadRole = (downloadRole: BadgeRoleTab) => {
    if ((templatesByRoleId.get(downloadRole.id) ?? []).length === 0) return
    startBadgeAction({ kind: 'role', roleId: downloadRole.id, roleCode: downloadRole.code })
  }

  const positionsEditorTemplate = positionsEditorTemplateId
    ? templates.find(template => template.id === positionsEditorTemplateId) ?? null
    : null

  const openPositionsEditor = (template: BadgeTemplate) => {
    const def = BADGE_DEFAULT_FIELDS_STATE
    const first = template.firstNamePosition ?? def.firstNamePosition
    const last = template.lastNamePosition ?? def.lastNamePosition
    const { fontId, bold } = parseNameFont(template.nameFont)
    // Выравнивание хранится внутри JSON позиции имени (как у сертификатов);
    // читаем из сохранённых позиций шаблона — у дефолтных ректов align нет.
    const storedAlign =
      template.firstNamePosition?.align ?? template.lastNamePosition?.align
    const next: CertificateTemplateFieldsState = {
      firstNamePosition: first,
      lastNamePosition: last,
      qrPosition: template.qrPosition ?? def.qrPosition,
      rolePosition: template.rolePosition ?? def.rolePosition,
      eventNamePosition: template.eventNamePosition ?? def.eventNamePosition,
      nameFont: fontId,
      nameBold: bold,
      nameFontSize: clampFontSize(template.nameFontSize ?? BADGE_DEFAULT_NAME_FONT_SIZE),
      nameColor: normalizeHexColor(template.nameColor) ?? BADGE_DEFAULT_NAME_COLOR,
      nameAlign: parseNameAlign(storedAlign),
      roleLabel: template.roleLabel ?? '',
      roleFontSize: clampSecondaryFontSize(template.roleFontSize ?? BADGE_DEFAULT_ROLE_FONT_SIZE),
      roleColor: normalizeHexColor(template.roleColor) ?? BADGE_DEFAULT_ROLE_COLOR,
      eventLabel: template.eventLabel ?? '',
      eventFontSize: clampSecondaryFontSize(
        template.eventFontSize ?? BADGE_DEFAULT_EVENT_FONT_SIZE
      ),
      eventColor: normalizeHexColor(template.eventColor) ?? BADGE_DEFAULT_EVENT_COLOR,
    }
    setPositionsDraft(next)
    setPositionsEditorTemplateId(template.id)
  }

  const handleSavePositions = () => {
    if (!positionsEditorTemplate) return
    // Высота полей имени выводится из кегля (в % от высоты страницы в пунктах),
    // а выравнивание хранится внутри JSON позиций — как у сертификатов.
    const nameHeight = nameFieldHeightPercent(
      positionsDraft.nameFontSize,
      getBadgePagePt(positionsEditorTemplate.sizePreset).height,
    )
    updateMutation.mutate(
      {
        templateId: positionsEditorTemplate.id,
        patch: {
          firstNamePosition: {
            ...positionsDraft.firstNamePosition,
            align: positionsDraft.nameAlign,
            height: nameHeight,
          },
          lastNamePosition: {
            ...positionsDraft.lastNamePosition,
            align: positionsDraft.nameAlign,
            height: nameHeight,
          },
          qrPosition: positionsDraft.qrPosition,
          rolePosition: positionsDraft.rolePosition,
          eventNamePosition: positionsDraft.eventNamePosition,
          nameFont: composeNameFont(positionsDraft.nameFont, positionsDraft.nameBold),
          nameFontSize: positionsDraft.nameFontSize,
          nameColor: positionsDraft.nameColor,
          // Пустой текст = дефолт (null на сервере); кегль и цвет сохраняем всегда,
          // чтобы PDF совпадал с тем, что организатор видел в превью.
          roleLabel: positionsDraft.roleLabel?.trim() || null,
          roleFontSize: positionsDraft.roleFontSize ?? null,
          roleColor: positionsDraft.roleColor ?? null,
          eventLabel: positionsDraft.eventLabel?.trim() || null,
          eventFontSize: positionsDraft.eventFontSize ?? null,
          eventColor: positionsDraft.eventColor ?? null,
        },
      },
      { onSuccess: () => setPositionsEditorTemplateId(null) },
    )
  }

  const onFilesPicked = useCallback(
    (file: File | null | undefined) => {
      if (!file) return
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error(t('events.badges.upload.onlyPngJpeg'))
        return
      }
      setCropSourceUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setCropDialogOpen(true)
    },
    [t],
  )

  const handleBadgeCropComplete = useCallback(
    (blob: Blob) => {
      const file = new File([blob], `badge-${selectedSize.id.toLowerCase()}.png`, {
        type: 'image/png',
      })
      setTemplateFile(file)
      setCropDialogOpen(false)
      setCropSourceUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    },
    [selectedSize.id],
  )

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    onFilesPicked(event.dataTransfer.files?.[0])
  }

  const totalTemplates = templates.length
  const totalApproved = approvedCounts.PARTICIPANT + approvedCounts.SPEAKER + approvedCounts.MENTOR

  const pendingDeleteTemplate = pendingDeleteId
    ? templates.find(template => template.id === pendingDeleteId) ?? null
    : null

  // C-11: генерация бейджей = та же квота генераций (E-6). 409 из blob-ответа
  // нормализуется в use-event-badges и показывается честной панелью.
  const billingLimitError = downloadMutation.isError
    ? mapBillingError(downloadMutation.error)
    : null

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {billingLimitError && (
          <LimitPrompt error={billingLimitError} onClose={() => downloadMutation.reset()} />
        )}

        {/* ── Прогресс фоновой сборки ZIP ────────────────────── */}
        {zipJob && (
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="text-sm font-semibold">{t('events.badges.zip.title')}</span>
              <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                {zipTotal > 0
                  ? t('events.badges.zip.count', { done: zipDone, total: zipTotal })
                  : t('events.badges.zip.working')}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${zipTotal > 0 ? zipPercent : 100}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {t('events.badges.zip.hint')}
            </p>
          </Card>
        )}

        {/* ── Hero: главное действие + быстрые цифры ─────────── */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t('events.badges.hero.kicker')}
              </p>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                {t('events.badges.hero.titleWithQr')}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-success" />
                  {t('events.badges.hero.statsTemplates')}{' '}
                  <span className="font-semibold tabular-nums text-foreground">{totalTemplates}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-info" />
                  {t('events.badges.hero.statsApproved')}{' '}
                  <span className="font-semibold tabular-nums text-foreground">{totalApproved}</span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="gap-2"
                    disabled={downloadMutation.isPending || !canExport || totalTemplates === 0}
                    title={!canExport ? exportDeniedReason : undefined}
                  >
                    <Download className="h-4 w-4" />
                    {t('events.badges.hero.downloadBadges')}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {badgeRoles.map(item => {
                    const Icon = item.icon
                    const count = roleRecipientCount(item)
                    const disabled = (templatesByRoleId.get(item.id) ?? []).length === 0
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        className="gap-2"
                        disabled={disabled}
                        onSelect={() => handleDownloadRole(item)}
                      >
                        <Icon className={cn('h-4 w-4', item.accent)} />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {disabled
                            ? t('events.badges.hero.noTemplate')
                            : count !== null
                              ? t('events.badges.hero.peopleCount', { count })
                              : null}
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2"
                    onSelect={() => setSelectDialogOpen(true)}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>{t('events.badges.hero.selectRecipientsManually')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setManageOpen(true)}
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!canOpenManage}
                title={
                  !canOpenManage
                    ? t('events.badges.deniedReason.recipientsManage')
                    : undefined
                }
              >
                <UsersRound className="h-4 w-4" />
                <span className="hidden sm:inline">{t('events.badges.hero.recipients')}</span>
              </Button>
            </div>
          </div>
          {totalTemplates === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('events.badges.hero.uploadFirstTemplate')}
            </p>
          )}
        </Card>

        {/* ── Шаблоны: tabs по роли + список ──────────────────── */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={activeRole?.id ?? ''}
              onValueChange={value => setActiveRoleId(value)}
            >
              <TabsList className="flex-wrap">
                {badgeRoles.map(item => {
                  const Icon = item.icon
                  const count = (templatesByRoleId.get(item.id) ?? []).length
                  return (
                    <TabsTrigger key={item.id} value={item.id} className="gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="max-w-[10rem] truncate">{item.label}</span>
                      <span
                        className={cn(
                          'ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                          count > 0
                            ? 'bg-success-soft text-success-soft-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              onClick={openUploadSheet}
              size="sm"
              className="gap-1.5"
              disabled={!canTemplate}
              title={!canTemplate ? templateDeniedReason : undefined}
            >
              <Upload className="h-4 w-4" />
              {t('events.badges.templates.uploadTemplate')}
            </Button>
          </div>

            {templatesQuery.isLoading || recipientRolesQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-52 w-full" />
              </div>
            ) : roleTemplates.length === 0 ? (
              <EmptyState
                icon={ImageUp}
                title={t('events.badges.templates.emptyTitle')}
                description={t('events.badges.templates.emptyDescriptionUpload')}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {roleTemplates.map((template: BadgeTemplate) => {
                  const size = getSizeOption(template.sizePreset)
                  return (
                    <div
                      key={template.id}
                      className="group relative overflow-hidden rounded-xl border bg-background transition hover:shadow-md"
                    >
                      <div className="relative bg-muted/30 p-4">
                        <div
                          className="mx-auto rounded-md bg-muted bg-cover bg-center shadow-sm ring-1 ring-border"
                          style={{
                            aspectRatio: `${template.widthPx} / ${template.heightPx}`,
                            backgroundImage: `url(${getMediaUrl(template.templateUrl)})`,
                            maxWidth: size.orientation === 'vertical' ? '60%' : '100%',
                          }}
                        />
                        {template.isDefault && (
                          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                            <Crown className="h-3 w-3" />
                            {t('events.badges.templates.defaultBadge')}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 border-t p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {resolveLocalizedField(
                                template.translations,
                                'name',
                                uiLocale,
                                template.name,
                              )}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {size.label} {t('events.badges.sizeUnit')} · {t(ORIENTATION_LABEL[size.orientation])}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => openPositionsEditor(template)}
                                  disabled={!canTemplate}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={t('events.badges.templates.fieldPositionsAria')}
                                >
                                  <Move className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {canTemplate
                                  ? t('events.badges.templates.fieldPositionsTooltip')
                                  : templateDeniedReason}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(template.id)}
                                  disabled={!canTemplate}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={t('events.badges.templates.deleteAria')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {canTemplate ? t('events.badges.templates.delete') : templateDeniedReason}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          {template.isDefault ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                              <Star className="h-3 w-3 fill-current" />
                              {t('events.badges.templates.usedInBulk')}
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={updateMutation.isPending || !canTemplate}
                                  onClick={() =>
                                    updateMutation.mutate({
                                      templateId: template.id,
                                      patch: { isDefault: true },
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Star className="h-3 w-3" />
                                  {t('events.badges.templates.makeDefault')}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {canTemplate
                                  ? t('events.badges.templates.makeDefaultTooltip')
                                  : templateDeniedReason}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-[11px]"
                                disabled={
                                  downloadMutation.isPending || !canExport || !activeRole
                                }
                                onClick={() => {
                                  if (!activeRole) return
                                  startZipDownload(
                                    {
                                      recipientRoleId: activeRole.id,
                                      templateId: template.id,
                                      onlyApproved: true,
                                    },
                                    `badges-${activeRole.code}.zip`
                                  )
                                }}
                              >
                                <Download className="h-3 w-3" />
                                {t('events.badges.templates.zip')}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {canExport
                                ? t('events.badges.templates.downloadZipTooltip')
                                : exportDeniedReason}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

        {/* ── Sheet: загрузка шаблона ─────────────────────────── */}
        <Sheet open={uploadSheetOpen} onOpenChange={setUploadSheetOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('events.badges.upload.sheetTitle')}</SheetTitle>
              <SheetDescription>
                {t('events.badges.upload.sheetDescription')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t('events.badges.upload.recipientLabel')}
                </label>
                {/* Один список ролей: встроенные и кастомные равноправны — так
                    видно, что у Staff/VIP тоже может быть свой шаблон. */}
                <div className="grid grid-cols-3 gap-1.5">
                  {badgeRoles.map(item => {
                    const ItemIcon = item.icon
                    const isSelected = uploadRole?.id === item.id
                    const disabled = !item.isActive || !item.isArtifactEligible
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setUploadRoleId(item.id)}
                        title={
                          !item.isActive
                            ? t('events.badges.upload.roleOff')
                            : !item.isArtifactEligible
                              ? t('events.badges.upload.roleNoArtifacts')
                              : undefined
                        }
                        className={cn(
                          'inline-flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition',
                          isSelected
                            ? item.cardActive + ' ' + item.accent
                            : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                          disabled && 'cursor-not-allowed opacity-40 hover:border-border'
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span className="max-w-full truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <ScalarNameTranslationEditor
                  fieldKey="name"
                  label={t('events.badges.upload.nameLabel')}
                  placeholder={t('events.badges.upload.namePlaceholder', {
                    role: uploadRole?.label ?? '',
                  })}
                  state={templateNameTranslations}
                  onStateChange={setTemplateNameTranslations}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    {t('events.badges.upload.sizeLabel')}
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex h-3.5 w-3.5 items-center justify-center text-muted-foreground hover:text-foreground">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t('events.badges.upload.sizeTooltip')}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={sizePreset}
                  onValueChange={value => {
                    setSizePreset(value as BadgeSizePreset)
                    if (templateFile) setTemplateFile(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {BADGE_SIZES.map(size => (
                      <SelectItem key={size.id} value={size.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            <SizeOrientationGlyph orientation={size.orientation} />
                          </span>
                          <span className="flex flex-col">
                            <span className="text-sm font-medium">{size.label} {t('events.badges.sizeUnit')}</span>
                            <span className="text-[11px] text-muted-foreground">{t(size.detail)}</span>
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label
                htmlFor="badge-template-file"
                onDragEnter={event => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={event => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'group flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-4 text-center transition',
                  isDragging
                    ? 'border-primary/60 bg-primary/5'
                    : templateFile
                    ? 'border-success bg-success-soft'
                    : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                    templateFile
                      ? 'bg-success text-white'
                      : isDragging
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}
                >
                  {templateFile ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                </div>
                <span className="text-sm font-medium">
                  {templateFile
                    ? templateFile.name
                    : isDragging
                    ? t('events.badges.upload.dropFile')
                    : t('events.badges.upload.dragOrClick')}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t('events.badges.upload.recommendation', {
                    width: selectedSize.widthPx,
                    height: selectedSize.heightPx,
                  })}
                </span>
                <input
                  id="badge-template-file"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="sr-only"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null
                    onFilesPicked(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
              <Button
                className="w-full gap-2"
                onClick={handleUpload}
                disabled={!templateFile || createMutation.isPending || !canTemplate}
                title={!canTemplate ? templateDeniedReason : undefined}
              >
                <Upload className="h-4 w-4" />
                {createMutation.isPending
                  ? t('events.badges.upload.uploading')
                  : t('events.badges.upload.saveTemplate')}
              </Button>
              {templateFile && (
                <button
                  type="button"
                  onClick={() => setTemplateFile(null)}
                  className="text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('events.badges.upload.clearFile')}
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Кроп макета по выбранному размеру бейджа ────────── */}
        {cropSourceUrl && (
          <ImageCropperDialog
            open={cropDialogOpen}
            onOpenChange={open => {
              setCropDialogOpen(open)
              if (!open) {
                setCropSourceUrl(prev => {
                  if (prev) URL.revokeObjectURL(prev)
                  return null
                })
              }
            }}
            imageSrc={cropSourceUrl}
            aspect={selectedSize.widthPx / selectedSize.heightPx}
            outputWidth={selectedSize.widthPx}
            outputHeight={selectedSize.heightPx}
            title={t('events.badges.crop.title')}
            description={t('events.badges.crop.description', {
              width: selectedSize.widthPx,
              height: selectedSize.heightPx,
              size: `${selectedSize.label} ${t('events.badges.sizeUnit')}`,
            })}
            onCropComplete={handleBadgeCropComplete}
          />
        )}

        {/* ── Sheet: позиции полей на бейдже ───────────────────── */}
        <Sheet
          open={positionsEditorTemplateId !== null}
          onOpenChange={open => {
            if (!open) setPositionsEditorTemplateId(null)
          }}
        >
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-4 overflow-hidden sm:max-w-2xl"
          >
            <SheetHeader>
              <SheetTitle>{t('events.badges.positions.sheetTitle')}</SheetTitle>
              <SheetDescription>
                {t('events.badges.positions.sheetDescription')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto pr-1">
              {positionsEditorTemplate && (
                <CertificateTemplateCanvas
                  imageUrl={getMediaUrl(positionsEditorTemplate.templateUrl)}
                  width={positionsEditorTemplate.widthPx}
                  height={positionsEditorTemplate.heightPx}
                  pageWidthPt={getBadgePagePt(positionsEditorTemplate.sizePreset).width}
                  fields={positionsDraft}
                  onFieldsChange={setPositionsDraft}
                  defaultFields={BADGE_DEFAULT_FIELDS_STATE}
                  extraZones={{ role: true, eventName: true }}
                  zoneTexts={{
                    role: badgeRolePdfLabel(positionsEditorTemplate),
                    eventName: eventQuery.data
                      ? resolveLocalizedField(
                          eventQuery.data.translations,
                          'title',
                          uiLocale,
                          eventQuery.data.title,
                        )
                      : t('events.table.event'),
                  }}
                  zoneLabels={{
                    role: t('tables.role'),
                    eventName: t('events.table.event'),
                  }}
                />
              )}

              {positionsEditorTemplate && (
                <BadgeSecondaryTextControls
                  fields={positionsDraft}
                  onChange={setPositionsDraft}
                  defaults={{
                    role: badgeRolePdfLabel(positionsEditorTemplate),
                    event: eventQuery.data
                      ? resolveLocalizedField(
                          eventQuery.data.translations,
                          'title',
                          uiLocale,
                          eventQuery.data.title
                        )
                      : t('events.table.event'),
                  }}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPositionsDraft(BADGE_DEFAULT_FIELDS_STATE)}
                className="gap-1.5 text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('events.badges.positions.reset')}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPositionsEditorTemplateId(null)}
                  disabled={updateMutation.isPending}
                >
                  {t('events.badges.positions.cancel')}
                </Button>
                <Button
                  onClick={handleSavePositions}
                  disabled={updateMutation.isPending || !canTemplate}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending
                    ? t('events.badges.positions.saving')
                    : t('events.badges.positions.save')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <SelectedBadgesDialog
          eventId={eventId}
          open={selectDialogOpen}
          onOpenChange={setSelectDialogOpen}
          onConfirmRecipients={recipientIds => {
            setSelectDialogOpen(false)
            startBadgeAction({ kind: 'selected', recipientIds })
          }}
        />

        <BulkPreviewDialog
          eventId={eventId}
          open={previewOpen}
          onOpenChange={open => {
            setPreviewOpen(open)
            if (!open) setPendingAction(null)
          }}
          artifactType="BADGE"
          previewRequest={previewRequest}
          onConfirm={runBadgeAction}
          isActionPending={downloadMutation.isPending}
          actionDenied={!canExport}
          actionDeniedReason={exportDeniedReason}
          confirmLabel={t('events.badges.selectDialog.downloadZip')}
        />

        <RecipientsRolesSheet
          eventId={eventId}
          open={manageOpen}
          onOpenChange={setManageOpen}
          canManageRecipients={canManageRecipients}
          canManageRoles={canManageRoles}
        />

        <AlertDialog
          open={pendingDeleteTemplate !== null}
          onOpenChange={open => {
            if (!open) setPendingDeleteId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('events.badges.deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteTemplate
                  ? t('events.badges.deleteDialog.description', {
                      name: resolveLocalizedField(
                        pendingDeleteTemplate.translations,
                        'name',
                        uiLocale,
                        pendingDeleteTemplate.name,
                      ),
                    })
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('events.badges.deleteDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (pendingDeleteTemplate) deleteMutation.mutate(pendingDeleteTemplate.id)
                  setPendingDeleteId(null)
                }}
              >
                {t('events.badges.deleteDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
